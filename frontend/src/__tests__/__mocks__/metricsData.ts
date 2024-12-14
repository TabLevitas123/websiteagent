export const mockMetricsData = {
  platform: {
    totalAgents: 100,
    totalUsers: 500,
    totalTransactions: 1000,
    totalRevenue: 5000,
    activeAgents: 80,
    activeUsers: 300,
  },
  agent: {
    topPerformers: [
      {
        id: '1',
        name: 'Agent 1',
        executions: 100,
        revenue: 1000,
      },
      {
        id: '2',
        name: 'Agent 2',
        executions: 90,
        revenue: 900,
      },
    ],
    categoryDistribution: {
      'AI': 30,
      'Data': 25,
      'Automation': 20,
      'Other': 25,
    },
    executionSuccess: 0.95,
  },
  marketplace: {
    tradingVolume: 10000,
    averagePrice: 50,
    topSellers: [
      {
        id: '1',
        name: 'Seller 1',
        sales: 100,
        revenue: 5000,
      },
      {
        id: '2',
        name: 'Seller 2',
        sales: 80,
        revenue: 4000,
      },
    ],
    popularCategories: [
      { name: 'AI', count: 300 },
      { name: 'Data', count: 250 },
    ],
  },
  timeSeries: {
    transactions: [
      { timestamp: '2024-01-01', value: 100 },
      { timestamp: '2024-01-02', value: 120 },
    ],
    revenue: [
      { timestamp: '2024-01-01', value: 5000 },
      { timestamp: '2024-01-02', value: 6000 },
    ],
    users: [
      { timestamp: '2024-01-01', value: 400 },
      { timestamp: '2024-01-02', value: 450 },
    ],
    agents: [
      { timestamp: '2024-01-01', value: 80 },
      { timestamp: '2024-01-02', value: 90 },
    ],
  },
  trends: {
    userGrowth: 0.15,
    agentGrowth: 0.25,
    revenueGrowth: 0.20,
    transactionGrowth: 0.18,
  },
};
