import express from 'express';
import { param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Record an interaction
router.post('/interaction/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    query('type').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const { type } = req.query;
      const timestamp = new Date();

      // Get or create analytics record
      let analytics = await prisma.agentAnalytics.findUnique({
        where: { agentAddress },
      });

      if (!analytics) {
        analytics = await prisma.agentAnalytics.create({
          data: {
            agentAddress,
            totalInteractions: 0,
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {},
          },
        });
      }

      // Update statistics
      const dateKey = timestamp.toISOString().split('T')[0];
      const weekKey = getWeekKey(timestamp);
      const monthKey = getMonthKey(timestamp);

      const dailyStats = analytics.dailyStats as Record<string, number> || {};
      const weeklyStats = analytics.weeklyStats as Record<string, number> || {};
      const monthlyStats = analytics.monthlyStats as Record<string, number> || {};

      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
      weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;

      // Clean up old stats
      cleanupStats(dailyStats, 30); // Keep last 30 days
      cleanupStats(weeklyStats, 52); // Keep last 52 weeks
      cleanupStats(monthlyStats, 12); // Keep last 12 months

      const updatedAnalytics = await prisma.agentAnalytics.update({
        where: { agentAddress },
        data: {
          totalInteractions: {
            increment: 1,
          },
          lastInteraction: timestamp,
          dailyStats,
          weeklyStats,
          monthlyStats,
        },
      });

      res.json(updatedAnalytics);
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  }
);

// Get agent analytics
router.get('/analytics/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    query('period').optional().isIn(['day', 'week', 'month', 'all']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const period = req.query.period || 'all';

      const analytics = await prisma.agentAnalytics.findUnique({
        where: { agentAddress },
      });

      if (!analytics) {
        return res.status(404).json({ error: 'Analytics not found' });
      }

      let stats;
      switch (period) {
        case 'day':
          stats = analytics.dailyStats;
          break;
        case 'week':
          stats = analytics.weeklyStats;
          break;
        case 'month':
          stats = analytics.monthlyStats;
          break;
        default:
          stats = {
            total: analytics.totalInteractions,
            lastInteraction: analytics.lastInteraction,
            daily: analytics.dailyStats,
            weekly: analytics.weeklyStats,
            monthly: analytics.monthlyStats,
          };
      }

      res.json(stats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

// Get trending agents
router.get('/trending',
  [
    query('period').optional().isIn(['day', 'week', 'month']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const period = req.query.period || 'day';
      const limit = parseInt(req.query.limit as string) || 10;

      const analytics = await prisma.agentAnalytics.findMany({
        where: {
          lastInteraction: {
            gte: getPeriodStart(period),
          },
        },
        orderBy: {
          totalInteractions: 'desc',
        },
        take: limit,
        include: {
          agent: {
            select: {
              name: true,
              symbol: true,
              verificationStatus: true,
            },
          },
        },
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching trending agents:', error);
      res.status(500).json({ error: 'Failed to fetch trending agents' });
    }
  }
);

// Helper functions
function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().split('T')[0];
}

function getMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function cleanupStats(stats: Record<string, number>, keepCount: number) {
  const keys = Object.keys(stats).sort();
  if (keys.length > keepCount) {
    keys.slice(0, keys.length - keepCount).forEach(key => {
      delete stats[key];
    });
  }
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'day':
      now.setDate(now.getDate() - 1);
      break;
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
  }
  return now;
}

export default router;
