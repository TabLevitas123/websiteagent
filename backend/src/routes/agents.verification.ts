import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient, VerificationStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Request verification for an agent
router.post('/verify-request/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    body('requestedBy').isString().notEmpty(),
    body('details').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const { requestedBy, details } = req.body;

      // Check if agent exists
      const agent = await prisma.agentMetadata.findUnique({
        where: { agentAddress },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Check if agent is already verified or has a pending request
      if (agent.verificationStatus !== 'UNVERIFIED') {
        return res.status(400).json({
          error: `Agent already ${agent.verificationStatus.toLowerCase()}`
        });
      }

      // Update agent status to pending
      const updatedAgent = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          verificationStatus: 'PENDING',
          verificationHistory: {
            create: {
              status: 'PENDING',
              verifiedBy: requestedBy,
              reason: 'Verification requested',
            },
          },
        },
        include: {
          verificationHistory: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
        },
      });

      res.json(updatedAgent);
    } catch (error) {
      console.error('Error requesting verification:', error);
      res.status(500).json({ error: 'Failed to request verification' });
    }
  }
);

// Update verification status (admin only)
router.patch('/verify-status/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    body('status').isIn(['VERIFIED', 'REJECTED']),
    body('verifiedBy').isString().notEmpty(),
    body('reason').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const { status, verifiedBy, reason } = req.body;

      // TODO: Add admin authorization check here

      const updatedAgent = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          verificationStatus: status as VerificationStatus,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
          verifiedBy: status === 'VERIFIED' ? verifiedBy : null,
          verificationHistory: {
            create: {
              status: status as VerificationStatus,
              verifiedBy,
              reason,
            },
          },
        },
        include: {
          verificationHistory: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
        },
      });

      res.json(updatedAgent);
    } catch (error) {
      console.error('Error updating verification status:', error);
      res.status(500).json({ error: 'Failed to update verification status' });
    }
  }
);

// Get verification history
router.get('/verify-history/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;

      const history = await prisma.verificationHistory.findMany({
        where: { agentAddress },
        orderBy: {
          timestamp: 'desc',
        },
      });

      res.json(history);
    } catch (error) {
      console.error('Error fetching verification history:', error);
      res.status(500).json({ error: 'Failed to fetch verification history' });
    }
  }
);

// Get verification statistics
router.get('/verify-stats',
  async (req, res) => {
    try {
      const stats = await prisma.agentMetadata.groupBy({
        by: ['verificationStatus'],
        _count: {
          agentAddress: true,
        },
      });

      const formattedStats = stats.reduce((acc, stat) => ({
        ...acc,
        [stat.verificationStatus.toLowerCase()]: stat._count.agentAddress,
      }), {
        unverified: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
      });

      res.json(formattedStats);
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      res.status(500).json({ error: 'Failed to fetch verification stats' });
    }
  }
);

export default router;
