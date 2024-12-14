export const mockAgentData = {
  id: '1',
  name: 'Test Agent',
  description: 'A test agent for unit testing',
  owner: '0x123456789abcdef',
  price: 100,
  category: 'TEST',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: {
    version: '1.0.0',
    capabilities: ['test', 'demo'],
    requirements: {
      cpu: '1',
      memory: '512Mi',
    },
  },
  stats: {
    executions: 100,
    successRate: 0.95,
    averageResponseTime: 200,
    totalRevenue: 1000,
  },
  ratings: {
    average: 4.5,
    count: 50,
    distribution: {
      '1': 1,
      '2': 2,
      '3': 5,
      '4': 15,
      '5': 27,
    },
  },
};

export const mockAgentList = Array(10).fill(null).map((_, index) => ({
  ...mockAgentData,
  id: `${index + 1}`,
  name: `Test Agent ${index + 1}`,
  price: 100 + index * 10,
}));

export const mockAgentSearchResults = {
  agents: mockAgentList,
  total: 100,
  page: 1,
  pageSize: 10,
  hasMore: true,
};

export const mockAgentCategories = [
  'AI',
  'Data Processing',
  'Automation',
  'Analytics',
  'Communication',
  'TEST',
];

export const mockAgentValidationError = {
  valid: false,
  errors: [
    'Name is required',
    'Price must be greater than 0',
    'Category must be one of the supported categories',
  ],
};

export const mockAgentExecutionResult = {
  success: true,
  output: 'Test execution result',
  executionTime: 150,
  resourceUsage: {
    cpu: '0.1',
    memory: '256Mi',
  },
};

export const mockAgentBatchUploadResult = {
  success: true,
  created: 5,
  failed: 0,
  agents: mockAgentList.slice(0, 5),
};

export const mockAgentError = {
  error: 'Operation failed',
  message: 'Failed to perform the requested operation',
  code: 'AGENT_ERROR',
};
