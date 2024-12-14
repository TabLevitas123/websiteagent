import { test, expect } from '@playwright/test';
import { SQLInjectionPayloads, XSSPayloads, scanVulnerabilities } from '../utils/securityUtils';
import { generateFuzzedInputs } from '../utils/fuzzingUtils';

test.describe('Security Penetration Tests', () => {
  test.describe('Authentication Attacks', () => {
    test('should prevent brute force attacks', async ({ request }) => {
      const attempts = 100;
      const responses = [];

      // Attempt rapid login requests
      for (let i = 0; i < attempts; i++) {
        const response = await request.post('/api/auth/login', {
          data: {
            username: `test${i}`,
            password: 'password123',
          },
        });
        responses.push(response);

        if (response.status === 429) break;
      }

      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBeTruthy();

      // Verify account lockout
      const lastResponse = await request.post('/api/auth/login', {
        data: {
          username: 'test1',
          password: 'correctpassword',
        },
      });
      expect(lastResponse.status).toBe(423); // Locked
    });

    test('should prevent session hijacking', async ({ page }) => {
      await page.goto('/login');

      // Login and get session
      await page.fill('[data-testid=username]', 'test');
      await page.fill('[data-testid=password]', 'test');
      await page.click('[data-testid=login-button]');

      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');

      // Verify session security attributes
      expect(sessionCookie?.secure).toBeTruthy();
      expect(sessionCookie?.httpOnly).toBeTruthy();
      expect(sessionCookie?.sameSite).toBe('Strict');

      // Attempt session replay
      const replayResponse = await page.request.get('/api/user', {
        headers: {
          'Cookie': `session=${sessionCookie?.value}`,
        },
      });
      expect(replayResponse.status()).toBe(401);
    });
  });

  test.describe('Injection Attacks', () => {
    test('should prevent SQL injection', async ({ request }) => {
      for (const payload of SQLInjectionPayloads) {
        const response = await request.get('/api/agents', {
          params: {
            search: payload,
          },
        });

        expect(response.status()).not.toBe(500);
        const body = await response.json();
        expect(body).not.toContain('sql');
        expect(body).not.toContain('postgres');
      }
    });

    test('should prevent XSS attacks', async ({ page }) => {
      for (const payload of XSSPayloads) {
        await page.goto('/marketplace');

        // Attempt XSS in search
        await page.fill('[data-testid=search-input]', payload);
        await page.click('[data-testid=search-button]');

        // Check if script executed
        const scriptExecuted = await page.evaluate(() => {
          return window.hasOwnProperty('xssTest');
        });

        expect(scriptExecuted).toBeFalsy();

        // Verify content encoding
        const content = await page.content();
        expect(content).toContain('&lt;script&gt;');
      }
    });

    test('should prevent command injection', async ({ request }) => {
      const payloads = [
        '| cat /etc/passwd',
        '; rm -rf /',
        '` touch evil.sh `',
      ];

      for (const payload of payloads) {
        const response = await request.post('/api/agents', {
          data: {
            name: payload,
            command: payload,
          },
        });

        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('File Upload Vulnerabilities', () => {
    test('should prevent malicious file uploads', async ({ page }) => {
      await page.goto('/profile');

      const maliciousFiles = [
        { name: 'evil.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'exploit.js', content: 'process.exit(1);' },
        { name: 'shell.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
      ];

      for (const file of maliciousFiles) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          page.click('[data-testid=upload-input]'),
        ]);

        await fileChooser.setFiles({
          name: file.name,
          mimeType: 'text/plain',
          buffer: Buffer.from(file.content),
        });

        const error = await page.textContent('[data-testid=upload-error]');
        expect(error).toContain('file type not allowed');
      }
    });

    test('should prevent zip bombs', async ({ page }) => {
      await page.goto('/profile');

      // Create compressed file with high ratio
      const zipBomb = await createZipBomb(1024 * 1024); // 1MB compressed, expands to 1GB

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('[data-testid=upload-input]'),
      ]);

      await fileChooser.setFiles({
        name: 'large.zip',
        mimeType: 'application/zip',
        buffer: zipBomb,
      });

      const error = await page.textContent('[data-testid=upload-error]');
      expect(error).toContain('suspicious file detected');
    });
  });

  test.describe('API Security', () => {
    test('should prevent CSRF attacks', async ({ page, request }) => {
      await page.goto('/login');

      // Login
      await page.fill('[data-testid=username]', 'test');
      await page.fill('[data-testid=password]', 'test');
      await page.click('[data-testid=login-button]');

      // Attempt CSRF
      const response = await request.post('/api/agents', {
        data: { name: 'evil-agent' },
        headers: {
          'Cookie': await page.context().cookies().then(cookies => 
            cookies.map(c => `${c.name}=${c.value}`).join('; ')
          ),
        },
      });

      expect(response.status()).toBe(403);
    });

    test('should prevent parameter pollution', async ({ request }) => {
      const response = await request.get('/api/agents', {
        params: {
          sort: ['asc', 'desc'],
          filter: ['active', 'inactive'],
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should validate API schemas', async ({ request }) => {
      const invalidPayloads = generateFuzzedInputs({
        name: 'string',
        price: 'number',
        category: 'string',
      });

      for (const payload of invalidPayloads) {
        const response = await request.post('/api/agents', {
          data: payload,
        });

        expect(response.status()).toBe(400);
        const error = await response.json();
        expect(error.message).toContain('validation');
      }
    });
  });

  test.describe('Information Disclosure', () => {
    test('should prevent path traversal', async ({ request }) => {
      const paths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const path of paths) {
        const response = await request.get(`/api/files/${path}`);
        expect(response.status()).toBe(400);
      }
    });

    test('should prevent sensitive data exposure', async ({ request }) => {
      const endpoints = [
        '/api/health',
        '/api/metrics',
        '/api/config',
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);
        const body = await response.json();

        expect(body).not.toContain('password');
        expect(body).not.toContain('secret');
        expect(body).not.toContain('key');
      }
    });
  });

  test.describe('Infrastructure Security', () => {
    test('should prevent version disclosure', async ({ request }) => {
      const response = await request.get('/');
      const headers = response.headers();

      expect(headers['server']).toBeUndefined();
      expect(headers['x-powered-by']).toBeUndefined();
    });

    test('should enforce security headers', async ({ request }) => {
      const response = await request.get('/');
      const headers = response.headers();

      expect(headers['strict-transport-security']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['content-security-policy']).toBeDefined();
    });
  });

  test.describe('Business Logic Vulnerabilities', () => {
    test('should prevent price manipulation', async ({ page }) => {
      await page.goto('/marketplace');

      // Attempt to modify price in frontend
      await page.evaluate(() => {
        const priceElement = document.querySelector('[data-testid=agent-price]');
        if (priceElement) priceElement.textContent = '0.01';
      });

      await page.click('[data-testid=buy-button]');

      // Verify server-side validation
      const error = await page.textContent('[data-testid=error-message]');
      expect(error).toContain('invalid price');
    });

    test('should prevent race conditions', async ({ request }) => {
      // Create limited stock item
      const createResponse = await request.post('/api/agents', {
        data: {
          name: 'Limited Agent',
          stock: 1,
        },
      });
      const agentId = (await createResponse.json()).id;

      // Attempt concurrent purchases
      const purchases = await Promise.all(
        Array(5).fill(null).map(() =>
          request.post(`/api/agents/${agentId}/purchase`)
        )
      );

      const successfulPurchases = purchases.filter(r => r.status() === 200);
      expect(successfulPurchases).toHaveLength(1);
    });
  });
});
