describe('Website Agent E2E', () => {
  beforeEach(() => {
    // Reset database state
    cy.task('db:reset');
    
    // Visit the app
    cy.visit('/');
    
    // Mock web3 provider
    cy.window().then((win) => {
      win.ethereum = {
        request: () => Promise.resolve('0x123'),
        on: () => {},
        removeListener: () => {},
      };
    });
  });

  describe('Authentication', () => {
    it('should connect wallet and authenticate user', () => {
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=user-address]').should('contain', '0x123');
      cy.get('[data-testid=auth-status]').should('contain', 'Connected');
    });

    it('should handle wallet connection rejection', () => {
      cy.window().then((win) => {
        win.ethereum.request = () => Promise.reject(new Error('User rejected'));
      });

      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=error-message]').should('contain', 'Failed to connect wallet');
    });
  });

  describe('Navigation', () => {
    it('should navigate through main sections', () => {
      // Connect wallet first
      cy.get('[data-testid=connect-wallet-btn]').click();

      // Check marketplace
      cy.get('[data-testid=nav-marketplace]').click();
      cy.url().should('include', '/marketplace');
      cy.get('[data-testid=marketplace-page]').should('be.visible');

      // Check analytics
      cy.get('[data-testid=nav-analytics]').click();
      cy.url().should('include', '/analytics');
      cy.get('[data-testid=analytics-page]').should('be.visible');

      // Check profile
      cy.get('[data-testid=nav-profile]').click();
      cy.url().should('include', '/profile');
      cy.get('[data-testid=profile-page]').should('be.visible');
    });

    it('should handle protected routes', () => {
      cy.visit('/profile');
      cy.get('[data-testid=auth-required]').should('be.visible');
      cy.url().should('include', '/login');
    });
  });

  describe('Marketplace', () => {
    beforeEach(() => {
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=nav-marketplace]').click();
    });

    it('should display and filter agents', () => {
      // Check initial load
      cy.get('[data-testid=agent-card]').should('have.length.at.least', 1);

      // Test search
      cy.get('[data-testid=search-input]').type('test');
      cy.get('[data-testid=agent-card]').should('have.length', 1);

      // Test category filter
      cy.get('[data-testid=category-filter]').select('AI');
      cy.get('[data-testid=agent-card]').each(($card) => {
        cy.wrap($card).should('contain', 'AI');
      });

      // Test price filter
      cy.get('[data-testid=min-price]').type('10');
      cy.get('[data-testid=max-price]').type('100');
      cy.get('[data-testid=apply-filters]').click();
      cy.get('[data-testid=agent-price]').each(($price) => {
        const price = parseFloat($price.text().replace('$', ''));
        expect(price).to.be.within(10, 100);
      });
    });

    it('should complete purchase flow', () => {
      cy.get('[data-testid=buy-now-btn]').first().click();
      cy.get('[data-testid=purchase-modal]').should('be.visible');
      
      // Confirm purchase
      cy.get('[data-testid=confirm-purchase]').click();
      cy.get('[data-testid=success-message]').should('be.visible');
      
      // Check profile for purchased agent
      cy.get('[data-testid=nav-profile]').click();
      cy.get('[data-testid=owned-agents]').should('contain', 'Test Agent');
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=nav-analytics]').click();
    });

    it('should display platform metrics', () => {
      cy.get('[data-testid=total-agents]').should('be.visible');
      cy.get('[data-testid=total-users]').should('be.visible');
      cy.get('[data-testid=total-revenue]').should('be.visible');
    });

    it('should update metrics with time frame changes', () => {
      cy.get('[data-testid=timeframe-selector]').select('7d');
      cy.get('[data-testid=loading-spinner]').should('be.visible');
      cy.get('[data-testid=loading-spinner]').should('not.exist');
      
      // Verify charts update
      cy.get('[data-testid=revenue-chart]').should('be.visible');
      cy.get('[data-testid=users-chart]').should('be.visible');
    });

    it('should export analytics data', () => {
      cy.get('[data-testid=export-btn]').click();
      cy.get('[data-testid=export-modal]').should('be.visible');
      
      // Select export options
      cy.get('[data-testid=export-format]').select('CSV');
      cy.get('[data-testid=confirm-export]').click();
      
      // Verify download
      cy.readFile('cypress/downloads/analytics.csv').should('exist');
    });
  });

  describe('Profile Management', () => {
    beforeEach(() => {
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=nav-profile]').click();
    });

    it('should display and edit profile', () => {
      // Edit profile
      cy.get('[data-testid=edit-profile-btn]').click();
      cy.get('[data-testid=username-input]').clear().type('New Username');
      cy.get('[data-testid=save-profile]').click();
      
      // Verify changes
      cy.get('[data-testid=profile-username]').should('contain', 'New Username');
    });

    it('should manage owned agents', () => {
      // List agents
      cy.get('[data-testid=owned-agents]').should('be.visible');
      
      // Edit agent
      cy.get('[data-testid=edit-agent-btn]').first().click();
      cy.get('[data-testid=agent-name-input]').clear().type('Updated Agent');
      cy.get('[data-testid=save-agent]').click();
      
      // Verify changes
      cy.get('[data-testid=agent-name]').first().should('contain', 'Updated Agent');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      // Simulate offline
      cy.intercept('GET', '/api/**', { forceNetworkError: true });
      
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=nav-marketplace]').click();
      
      cy.get('[data-testid=error-message]').should('be.visible');
      cy.get('[data-testid=retry-btn]').should('be.visible');
    });

    it('should handle API errors', () => {
      cy.intercept('GET', '/api/agents', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      });
      
      cy.get('[data-testid=connect-wallet-btn]').click();
      cy.get('[data-testid=nav-marketplace]').click();
      
      cy.get('[data-testid=error-message]').should('contain', 'Internal Server Error');
    });
  });

  describe('Performance', () => {
    it('should load pages within performance budget', () => {
      // Home page
      cy.visit('/', {
        onBeforeLoad: (win) => {
          win.performance.mark('start');
        },
      });

      cy.window().then((win) => {
        win.performance.mark('end');
        const measure = win.performance.measure('pageLoad', 'start', 'end');
        expect(measure.duration).to.be.lessThan(3000);
      });

      // Marketplace page
      cy.get('[data-testid=nav-marketplace]').click();
      cy.window().then((win) => {
        win.performance.mark('marketplaceStart');
      });

      cy.get('[data-testid=marketplace-page]').should('be.visible').then(() => {
        cy.window().then((win) => {
          win.performance.mark('marketplaceEnd');
          const measure = win.performance.measure('marketplaceLoad', 'marketplaceStart', 'marketplaceEnd');
          expect(measure.duration).to.be.lessThan(2000);
        });
      });
    });

    it('should maintain responsive performance', () => {
      // Test different viewport sizes
      const viewports = ['iphone-6', 'ipad-2', [1920, 1080]];
      
      viewports.forEach((viewport) => {
        cy.viewport(viewport as any);
        cy.visit('/');
        cy.get('[data-testid=nav-marketplace]').click();
        
        // Check time to interactive
        cy.get('[data-testid=agent-card]').first().should('be.visible');
        cy.get('[data-testid=buy-now-btn]').first().should('be.visible');
      });
    });
  });
});
