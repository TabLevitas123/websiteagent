import express from 'express';
import { query } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get overall platform metrics
router.get('/platform', async (req, res) => {
  try {
    const [
      totalAgents,
      totalUsers,
      totalTransactions,
      totalVolume,
      activeAgents,
      totalFunctions,
      totalExecutions,
    ] = await Promise.all([
      prisma.agentMetadata.count(),
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.agentMetadata.count({
        where: {
          interactions: {
            some: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),
      prisma.agentFunction.count(),
      prisma.functionExecution.count(),
    ]);

    res.json({
      totalAgents,
      totalUsers,
      totalTransactions,
      totalVolume: totalVolume._sum.amount || 0,
      activeAgents,
      totalFunctions,
      totalExecutions,
    });
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

// Get agent performance metrics
router.get('/agent/:agentAddress', async (req, res) => {
  try {
    const { agentAddress } = req.params;
    const { timeframe = '24h' } = req.query;

    const startTime = getStartTime(timeframe as string);

    const [
      interactions,
      executions,
      revenue,
      followers,
      comments,
    ] = await Promise.all([
      prisma.agentInteraction.count({
        where: {
          agentAddress,
          timestamp: { gte: startTime },
        },
      }),
      prisma.functionExecution.count({
        where: {
          agentAddress,
          timestamp: { gte: startTime },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          agentAddress,
          timestamp: { gte: startTime },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.agentFollow.count({
        where: {
          agentAddress,
          timestamp: { gte: startTime },
        },
      }),
      prisma.agentComment.count({
        where: {
          agentAddress,
          timestamp: { gte: startTime },
        },
      }),
    ]);

    // Get interaction trends
    const interactionTrends = await prisma.agentInteraction.groupBy({
      by: ['timestamp'],
      where: {
        agentAddress,
        timestamp: { gte: startTime },
      },
      _count: true,
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Get popular functions
    const popularFunctions = await prisma.functionExecution.groupBy({
      by: ['functionId'],
      where: {
        agentAddress,
        timestamp: { gte: startTime },
      },
      _count: true,
      orderBy: {
        _count: {
          functionId: 'desc',
        },
      },
      take: 5,
    });

    res.json({
      metrics: {
        interactions,
        executions,
        revenue: revenue._sum.amount || 0,
        followers,
        comments,
      },
      trends: {
        interactions: interactionTrends,
      },
      functions: popularFunctions,
    });
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

// Get marketplace analytics
router.get('/marketplace', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    const startTime = getStartTime(timeframe as string);

    const [
      volumeMetrics,
      categoryMetrics,
      priceMetrics,
      topSellers,
    ] = await Promise.all([
      // Trading volume over time
      prisma.transaction.groupBy({
        by: ['timestamp'],
        where: {
          timestamp: { gte: startTime },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      }),

      // Category popularity
      prisma.agentMetadata.groupBy({
        by: ['category'],
        _count: true,
        orderBy: {
          _count: {
            _all: 'desc',
          },
        },
      }),

      // Price distribution
      prisma.agentMetadata.aggregate({
        _avg: {
          listingPrice: true,
        },
        _min: {
          listingPrice: true,
        },
        _max: {
          listingPrice: true,
        },
      }),

      // Top selling agents
      prisma.transaction.groupBy({
        by: ['agentAddress'],
        where: {
          timestamp: { gte: startTime },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    res.json({
      volume: {
        trends: volumeMetrics,
      },
      categories: categoryMetrics,
      prices: priceMetrics,
      topSellers,
    });
  } catch (error) {
    console.error('Error fetching marketplace analytics:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace analytics' });
  }
});

// Get user analytics
router.get('/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { timeframe = '24h' } = req.query;

    const startTime = getStartTime(timeframe as string);

    const [
      createdAgents,
      purchases,
      totalSpent,
      interactions,
      favoriteCategories,
    ] = await Promise.all([
      // Agents created
      prisma.agentMetadata.count({
        where: {
          creatorAddress: userAddress,
          timestamp: { gte: startTime },
        },
      }),

      // Purchases made
      prisma.transaction.count({
        where: {
          buyerAddress: userAddress,
          timestamp: { gte: startTime },
        },
      }),

      // Total amount spent
      prisma.transaction.aggregate({
        where: {
          buyerAddress: userAddress,
          timestamp: { gte: startTime },
        },
        _sum: {
          amount: true,
        },
      }),

      // Total interactions
      prisma.agentInteraction.count({
        where: {
          userAddress,
          timestamp: { gte: startTime },
        },
      }),

      // Favorite categories
      prisma.agentInteraction.groupBy({
        by: ['agentAddress'],
        where: {
          userAddress,
          timestamp: { gte: startTime },
        },
        _count: true,
        orderBy: {
          _count: {
            _all: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    res.json({
      createdAgents,
      purchases,
      totalSpent: totalSpent._sum.amount || 0,
      interactions,
      favoriteCategories,
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
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
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export default router;
