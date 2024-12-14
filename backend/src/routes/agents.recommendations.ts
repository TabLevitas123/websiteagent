import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get personalized recommendations
router.get('/:userAddress/recommendations', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { limit = 10 } = req.query;

    // Get user's interaction history
    const userHistory = await prisma.agentInteraction.findMany({
      where: { userAddress },
      include: {
        agent: {
          include: {
            functions: true,
            tags: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Extract user preferences
    const preferences = analyzeUserPreferences(userHistory);

    // Get recommendations based on preferences
    const recommendations = await getRecommendations(userAddress, preferences, parseInt(limit as string));

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get similar agents
router.get('/:agentAddress/similar', async (req, res) => {
  try {
    const { agentAddress } = req.params;
    const { limit = 10 } = req.query;

    // Get agent details
    const agent = await prisma.agentMetadata.findUnique({
      where: { agentAddress },
      include: {
        functions: true,
        tags: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Find similar agents
    const similarAgents = await findSimilarAgents(agent, parseInt(limit as string));

    res.json(similarAgents);
  } catch (error) {
    console.error('Error finding similar agents:', error);
    res.status(500).json({ error: 'Failed to find similar agents' });
  }
});

// Get trending agents
router.get('/trending', async (req, res) => {
  try {
    const { timeframe = '24h', limit = 10 } = req.query;

    const startTime = getStartTime(timeframe as string);

    // Get trending agents based on recent interactions
    const trending = await prisma.agentMetadata.findMany({
      where: {
        interactions: {
          some: {
            timestamp: {
              gte: startTime,
            },
          },
        },
      },
      include: {
        analytics: true,
        _count: {
          select: {
            interactions: {
              where: {
                timestamp: {
                  gte: startTime,
                },
              },
            },
          },
        },
      },
      orderBy: {
        interactions: {
          _count: 'desc',
        },
      },
      take: parseInt(limit as string),
    });

    res.json(trending);
  } catch (error) {
    console.error('Error getting trending agents:', error);
    res.status(500).json({ error: 'Failed to get trending agents' });
  }
});

// Record agent interaction for better recommendations
router.post('/interaction',
  [
    body('userAddress').isString().notEmpty(),
    body('agentAddress').isString().notEmpty(),
    body('interactionType').isString().notEmpty(),
    body('metadata').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userAddress, agentAddress, interactionType, metadata } = req.body;

      const interaction = await prisma.agentInteraction.create({
        data: {
          userAddress,
          agentAddress,
          interactionType,
          metadata,
          timestamp: new Date(),
        },
      });

      res.json(interaction);
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  }
);

// Helper function to analyze user preferences
function analyzeUserPreferences(history: any[]) {
  const preferences = {
    categories: new Map<string, number>(),
    functionTypes: new Map<string, number>(),
    tags: new Map<string, number>(),
    priceRange: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
    },
  };

  let totalPrice = 0;
  let priceCount = 0;

  history.forEach(interaction => {
    const agent = interaction.agent;

    // Analyze categories
    if (agent.category) {
      preferences.categories.set(
        agent.category,
        (preferences.categories.get(agent.category) || 0) + 1
      );
    }

    // Analyze function types
    agent.functions.forEach((func: any) => {
      preferences.functionTypes.set(
        func.category,
        (preferences.functionTypes.get(func.category) || 0) + 1
      );
    });

    // Analyze tags
    agent.tags.forEach((tag: string) => {
      preferences.tags.set(
        tag,
        (preferences.tags.get(tag) || 0) + 1
      );
    });

    // Analyze price range
    if (agent.listingPrice) {
      preferences.priceRange.min = Math.min(preferences.priceRange.min, agent.listingPrice);
      preferences.priceRange.max = Math.max(preferences.priceRange.max, agent.listingPrice);
      totalPrice += agent.listingPrice;
      priceCount++;
    }
  });

  preferences.priceRange.avg = priceCount > 0 ? totalPrice / priceCount : 0;

  return preferences;
}

// Helper function to get recommendations
async function getRecommendations(userAddress: string, preferences: any, limit: number) {
  // Get top categories and tags
  const topCategories = Array.from(preferences.categories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const topTags = Array.from(preferences.tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Find agents matching user preferences
  const recommendations = await prisma.agentMetadata.findMany({
    where: {
      OR: [
        { category: { in: topCategories } },
        { tags: { hasSome: topTags } },
        {
          AND: [
            { listingPrice: { gte: preferences.priceRange.min * 0.8 } },
            { listingPrice: { lte: preferences.priceRange.max * 1.2 } },
          ],
        },
      ],
      NOT: {
        interactions: {
          some: {
            userAddress,
          },
        },
      },
    },
    include: {
      analytics: true,
      functions: true,
      _count: {
        select: {
          followers: true,
          interactions: true,
        },
      },
    },
    orderBy: [
      { verificationStatus: 'desc' },
      { followerCount: 'desc' },
    ],
    take: limit,
  });

  return recommendations;
}

// Helper function to find similar agents
async function findSimilarAgents(agent: any, limit: number) {
  return prisma.agentMetadata.findMany({
    where: {
      OR: [
        { category: agent.category },
        { tags: { hasSome: agent.tags } },
        {
          functions: {
            some: {
              category: {
                in: agent.functions.map((f: any) => f.category),
              },
            },
          },
        },
      ],
      NOT: {
        agentAddress: agent.agentAddress,
      },
    },
    include: {
      analytics: true,
      functions: true,
      _count: {
        select: {
          followers: true,
          interactions: true,
        },
      },
    },
    orderBy: [
      { verificationStatus: 'desc' },
      { followerCount: 'desc' },
    ],
    take: limit,
  });
}

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
