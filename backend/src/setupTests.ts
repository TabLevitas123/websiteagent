// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment the following lines to disable specific console methods during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: 'test',
};

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
