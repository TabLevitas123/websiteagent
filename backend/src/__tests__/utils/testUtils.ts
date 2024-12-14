import { Request, Response } from 'express';
import { User } from '../../models/user';

export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  ip: '127.0.0.1',
  user: undefined,
  socket: {
    remoteAddress: '127.0.0.1'
  },
  ...overrides
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    on: jest.fn(),
  };
  return res;
};

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  address: '0x123',
  nonce: '123456',
  isPremium: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const mockPrismaResponse = {
  success: true,
  data: null,
  error: null
};

export const mockWeb3Response = {
  success: true,
  data: {
    address: '0x123',
    signature: '0xabc',
    message: 'Test message'
  },
  error: null
};

export const mockAuthToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const mockAgentData = {
  id: '1',
  name: 'Test Agent',
  description: 'Test Description',
  owner: '0x123',
  price: 1.0,
  category: 'TEST',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockMetricsData = {
  id: '1',
  agentId: '1',
  type: 'EXECUTION',
  value: 1,
  timestamp: new Date()
};

export const mockTransactionData = {
  id: '1',
  buyerId: '1',
  sellerId: '2',
  agentId: '1',
  amount: 1.0,
  status: 'COMPLETED',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockError = new Error('Test error');

export const mockNext = jest.fn();
