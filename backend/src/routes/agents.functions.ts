import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Register agent function
router.post('/register-function',
  [
    body('agentAddress').isString().notEmpty(),
    body('functionName').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('inputSchema').isObject(),
    body('outputSchema').isObject(),
    body('category').isString().notEmpty(),
    body('version').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        agentAddress,
        functionName,
        description,
        inputSchema,
        outputSchema,
        category,
        version,
      } = req.body;

      const agentFunction = await prisma.agentFunction.create({
        data: {
          agentAddress,
          functionName,
          description,
          inputSchema,
          outputSchema,
          category,
          version,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create activity for new function
      await prisma.agentActivity.create({
        data: {
          agentAddress,
          activityType: 'FUNCTION_ADDED',
          metadata: {
            functionName,
            category,
            version,
          },
          timestamp: new Date(),
        },
      });

      res.json(agentFunction);
    } catch (error) {
      console.error('Error registering function:', error);
      res.status(500).json({ error: 'Failed to register function' });
    }
  }
);

// Update agent function
router.patch('/update-function/:functionId',
  [
    body('description').optional().isString(),
    body('inputSchema').optional().isObject(),
    body('outputSchema').optional().isObject(),
    body('category').optional().isString(),
    body('version').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { functionId } = req.params;
      const updateData = {
        ...req.body,
        updatedAt: new Date(),
      };

      const updatedFunction = await prisma.agentFunction.update({
        where: { id: functionId },
        data: updateData,
      });

      res.json(updatedFunction);
    } catch (error) {
      console.error('Error updating function:', error);
      res.status(500).json({ error: 'Failed to update function' });
    }
  }
);

// List agent functions
router.get('/:agentAddress/functions', async (req, res) => {
  try {
    const { agentAddress } = req.params;
    const { category } = req.query;

    const functions = await prisma.agentFunction.findMany({
      where: {
        agentAddress,
        ...(category && { category: category as string }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(functions);
  } catch (error) {
    console.error('Error fetching functions:', error);
    res.status(500).json({ error: 'Failed to fetch functions' });
  }
});

// Execute agent function
router.post('/execute-function/:functionId',
  [
    body('inputs').isObject(),
    body('callerAddress').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { functionId } = req.params;
      const { inputs, callerAddress } = req.body;

      // Get function details
      const agentFunction = await prisma.agentFunction.findUnique({
        where: { id: functionId },
        include: {
          agent: true,
        },
      });

      if (!agentFunction) {
        return res.status(404).json({ error: 'Function not found' });
      }

      // Validate inputs against schema
      // TODO: Implement input validation using the function's inputSchema

      // Execute function
      // TODO: Implement actual function execution logic
      const result = {
        status: 'success',
        output: {
          message: 'Function executed successfully',
          // Add actual output here
        },
      };

      // Record execution
      await prisma.functionExecution.create({
        data: {
          functionId,
          callerAddress,
          inputs,
          outputs: result.output,
          status: result.status,
          executedAt: new Date(),
        },
      });

      // Update agent analytics
      await prisma.agentAnalytics.update({
        where: { agentAddress: agentFunction.agentAddress },
        data: {
          totalInteractions: {
            increment: 1,
          },
        },
      });

      res.json(result);
    } catch (error) {
      console.error('Error executing function:', error);
      res.status(500).json({ error: 'Failed to execute function' });
    }
  }
);

// Get function execution history
router.get('/execution-history/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    const executions = await prisma.functionExecution.findMany({
      where: { functionId },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { executedAt: 'desc' },
      include: {
        caller: {
          select: {
            name: true,
            imageUrl: true,
            verificationStatus: true,
          },
        },
      },
    });

    res.json(executions);
  } catch (error) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

// Get function analytics
router.get('/analytics/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const { timeframe = '24h' } = req.query;

    const startTime = getStartTime(timeframe as string);

    const analytics = await prisma.functionExecution.groupBy({
      by: ['status'],
      where: {
        functionId,
        executedAt: {
          gte: startTime,
        },
      },
      _count: true,
      _avg: {
        executionTime: true,
      },
    });

    res.json({
      timeframe,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching function analytics:', error);
    res.status(500).json({ error: 'Failed to fetch function analytics' });
  }
});

// Helper function to get start time based on timeframe
function getStartTime(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export default router;
