import express from 'express';
import { query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Advanced search endpoint
router.get('/search',
  [
    query('q').optional().isString(),
    query('category').optional().isString(),
    query('verificationStatus').optional().isString(),
    query('minPrice').optional().isFloat(),
    query('maxPrice').optional().isFloat(),
    query('minInteractions').optional().isInt(),
    query('functionCategory').optional().isString(),
    query('tags').optional().isArray(),
    query('sortBy').optional().isString(),
    query('order').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        q,
        category,
        verificationStatus,
        minPrice,
        maxPrice,
        minInteractions,
        functionCategory,
        tags,
        sortBy = 'relevance',
        order = 'desc',
        page = 1,
        limit = 20,
      } = req.query;

      const skip = (page - 1) * limit;

      // Build the where clause
      const where: any = {};

      // Full-text search
      if (q) {
        where.OR = [
          { name: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
          { symbol: { contains: q as string, mode: 'insensitive' } },
        ];
      }

      // Filters
      if (category) {
        where.category = category;
      }
      if (verificationStatus) {
        where.verificationStatus = verificationStatus;
      }
      if (minPrice || maxPrice) {
        where.listingPrice = {};
        if (minPrice) where.listingPrice.gte = parseFloat(minPrice as string);
        if (maxPrice) where.listingPrice.lte = parseFloat(maxPrice as string);
      }
      if (minInteractions) {
        where.analytics = {
          totalInteractions: {
            gte: parseInt(minInteractions as string),
          },
        };
      }
      if (functionCategory) {
        where.functions = {
          some: {
            category: functionCategory,
          },
        };
      }
      if (tags) {
        where.tags = {
          hasEvery: Array.isArray(tags) ? tags : [tags],
        };
      }

      // Build the orderBy clause
      let orderBy: any = {};
      switch (sortBy) {
        case 'price':
          orderBy.listingPrice = order;
          break;
        case 'interactions':
          orderBy.analytics = { totalInteractions: order };
          break;
        case 'followers':
          orderBy.followerCount = order;
          break;
        case 'created':
          orderBy.createdAt = order;
          break;
        case 'relevance':
        default:
          // For relevance sorting, we'll use a combination of factors
          orderBy = [
            { verificationStatus: 'desc' },
            { followerCount: 'desc' },
            { analytics: { totalInteractions: 'desc' } },
          ];
      }

      // Execute search query
      const [results, total] = await Promise.all([
        prisma.agentMetadata.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            analytics: true,
            functions: {
              select: {
                category: true,
              },
            },
            _count: {
              select: {
                followers: true,
                comments: true,
              },
            },
          },
        }),
        prisma.agentMetadata.count({ where }),
      ]);

      // Get related tags for search refinement
      const relatedTags = await prisma.agentMetadata.findMany({
        where,
        select: {
          tags: true,
        },
        take: 20,
      });

      const uniqueTags = Array.from(
        new Set(relatedTags.flatMap(agent => agent.tags))
      ).slice(0, 10);

      res.json({
        results,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        refinements: {
          tags: uniqueTags,
        },
      });
    } catch (error) {
      console.error('Error executing search:', error);
      res.status(500).json({ error: 'Failed to execute search' });
    }
  }
);

// Get popular search suggestions
router.get('/search/suggestions',
  [
    query('q').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 10 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { q, limit = 5 } = req.query;

      const suggestions = await prisma.agentMetadata.findMany({
        where: {
          OR: [
            { name: { contains: q as string, mode: 'insensitive' } },
            { symbol: { contains: q as string, mode: 'insensitive' } },
          ],
        },
        select: {
          name: true,
          symbol: true,
          verificationStatus: true,
        },
        take: limit,
      });

      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch search suggestions' });
    }
  }
);

// Get trending searches
router.get('/search/trending', async (req, res) => {
  try {
    const trending = await prisma.searchHistory.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 10,
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    res.json(trending);
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    res.status(500).json({ error: 'Failed to fetch trending searches' });
  }
});

// Record search query
router.post('/search/record',
  [
    query('q').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const { q } = req.query;

      await prisma.searchHistory.create({
        data: {
          query: q as string,
          timestamp: new Date(),
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error recording search:', error);
      res.status(500).json({ error: 'Failed to record search' });
    }
  }
);

export default router;
