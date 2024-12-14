import { AgentService } from '../../services/agent';
import { PrismaClient } from '@prisma/client';
import { mockAgentData, mockError } from '../utils/testUtils';

// Mock PrismaClient
jest.mock('@prisma/client');

describe('Agent Service', () => {
  let agentService: AgentService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      agent: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    agentService = new AgentService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should create an agent successfully', async () => {
      mockPrisma.agent.create.mockResolvedValue(mockAgentData);

      const result = await agentService.createAgent({
        name: 'Test Agent',
        description: 'Test Description',
        price: 1.0,
        category: 'TEST'
      });

      expect(result).toEqual(mockAgentData);
      expect(mockPrisma.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Agent',
          description: 'Test Description',
          price: 1.0,
          category: 'TEST'
        })
      });
    });

    it('should handle creation errors', async () => {
      mockPrisma.agent.create.mockRejectedValue(mockError);

      await expect(agentService.createAgent({
        name: 'Test Agent',
        description: 'Test Description',
        price: 1.0,
        category: 'TEST'
      })).rejects.toThrow('Test error');
    });
  });

  describe('getAgent', () => {
    it('should get an agent by id', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(mockAgentData);

      const result = await agentService.getAgent('1');

      expect(result).toEqual(mockAgentData);
      expect(mockPrisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should return null for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const result = await agentService.getAgent('unknown');

      expect(result).toBeNull();
    });
  });

  describe('updateAgent', () => {
    it('should update an agent successfully', async () => {
      mockPrisma.agent.update.mockResolvedValue({
        ...mockAgentData,
        name: 'Updated Agent'
      });

      const result = await agentService.updateAgent('1', {
        name: 'Updated Agent'
      });

      expect(result.name).toBe('Updated Agent');
      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Agent' }
      });
    });

    it('should handle update errors', async () => {
      mockPrisma.agent.update.mockRejectedValue(mockError);

      await expect(agentService.updateAgent('1', {
        name: 'Updated Agent'
      })).rejects.toThrow('Test error');
    });
  });

  describe('deleteAgent', () => {
    it('should delete an agent successfully', async () => {
      mockPrisma.agent.delete.mockResolvedValue(mockAgentData);

      const result = await agentService.deleteAgent('1');

      expect(result).toBeTruthy();
      expect(mockPrisma.agent.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should handle deletion errors', async () => {
      mockPrisma.agent.delete.mockRejectedValue(mockError);

      await expect(agentService.deleteAgent('1')).rejects.toThrow('Test error');
    });
  });

  describe('searchAgents', () => {
    it('should search agents with filters', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([mockAgentData]);

      const result = await agentService.searchAgents({
        query: 'test',
        category: 'TEST',
        minPrice: '0',
        maxPrice: '10'
      });

      expect(result).toEqual([mockAgentData]);
      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
          category: 'TEST',
          price: {
            gte: 0,
            lte: 10
          }
        })
      });
    });

    it('should handle empty search results', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([]);

      const result = await agentService.searchAgents({
        query: 'nonexistent'
      });

      expect(result).toEqual([]);
    });
  });

  describe('validateAgent', () => {
    it('should validate valid agent data', async () => {
      const result = await agentService.validateAgent({
        name: 'Test Agent',
        description: 'Test Description',
        price: 1.0,
        category: 'TEST'
      });

      expect(result.valid).toBeTruthy();
    });

    it('should invalidate agent with missing required fields', async () => {
      const result = await agentService.validateAgent({
        name: 'Test Agent'
      } as any);

      expect(result.valid).toBeFalsy();
      expect(result.errors).toContain('Description is required');
    });

    it('should invalidate agent with invalid price', async () => {
      const result = await agentService.validateAgent({
        ...mockAgentData,
        price: -1
      });

      expect(result.valid).toBeFalsy();
      expect(result.errors).toContain('Price must be greater than 0');
    });
  });

  describe('executeAgent', () => {
    it('should execute agent successfully', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        output: 'Test output'
      });
      mockPrisma.agent.findUnique.mockResolvedValue({
        ...mockAgentData,
        execute: mockExecute
      });

      const result = await agentService.executeAgent('1', 'Test input');

      expect(result.success).toBeTruthy();
      expect(result.output).toBe('Test output');
      expect(mockExecute).toHaveBeenCalledWith('Test input');
    });

    it('should handle execution errors', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('Execution failed'));
      mockPrisma.agent.findUnique.mockResolvedValue({
        ...mockAgentData,
        execute: mockExecute
      });

      await expect(agentService.executeAgent('1', 'Test input'))
        .rejects.toThrow('Execution failed');
    });

    it('should handle agent not found', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      await expect(agentService.executeAgent('unknown', 'Test input'))
        .rejects.toThrow('Agent not found');
    });
  });
});
