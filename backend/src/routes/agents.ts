import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create agent metadata
router.post('/metadata',
  [
    body('agentAddress').isString().notEmpty(),
    body('name').isString().notEmpty(),
    body('symbol').isString().notEmpty(),
    body('paymentTx').isString().notEmpty(),
    body('creator').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, name, symbol, paymentTx, creator } = req.body;

      const metadata = await prisma.agentMetadata.create({
        data: {
          agentAddress,
          name,
          symbol,
          paymentTx,
          creator,
          createdAt: new Date(),
        },
      });

      res.status(201).json(metadata);
    } catch (error) {
      console.error('Error creating agent metadata:', error);
      res.status(500).json({ error: 'Failed to create agent metadata' });
    }
  }
);

// Get agent metadata
router.get('/metadata/:agentAddress',
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

      const metadata = await prisma.agentMetadata.findUnique({
        where: {
          agentAddress,
        },
      });

      if (!metadata) {
        return res.status(404).json({ error: 'Agent metadata not found' });
      }

      res.json(metadata);
    } catch (error) {
      console.error('Error fetching agent metadata:', error);
      res.status(500).json({ error: 'Failed to fetch agent metadata' });
    }
  }
);

// List all agents for a creator
router.get('/creator/:creatorAddress',
  [
    param('creatorAddress').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { creatorAddress } = req.params;

      const agents = await prisma.agentMetadata.findMany({
        where: {
          creator: creatorAddress,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(agents);
    } catch (error) {
      console.error('Error fetching creator agents:', error);
      res.status(500).json({ error: 'Failed to fetch creator agents' });
    }
  }
);

// Verify payment transaction
router.get('/verify-payment/:txHash',
  [
    param('txHash').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { txHash } = req.params;

      // Check if payment has already been used
      const existingAgent = await prisma.agentMetadata.findFirst({
        where: {
          paymentTx: txHash,
        },
      });

      if (existingAgent) {
        return res.status(400).json({ error: 'Payment transaction already used' });
      }

      // TODO: Implement actual blockchain verification of the transaction
      // This should verify:
      // 1. Transaction exists and is confirmed
      // 2. Amount is correct (0.006 ETH)
      // 3. Recipient address is correct

      res.json({ verified: true });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  }
);

export default router;
