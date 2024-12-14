import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Token } from '@solana/spl-token';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Transfer agent ownership
router.post('/transfer/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    body('currentOwner').isString().notEmpty(),
    body('newOwner').isString().notEmpty(),
    body('signature').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const { currentOwner, newOwner, signature } = req.body;

      // Verify the agent exists and is owned by the current owner
      const agent = await prisma.agentMetadata.findUnique({
        where: { agentAddress },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (agent.creator !== currentOwner) {
        return res.status(403).json({ error: 'Not authorized to transfer this agent' });
      }

      // Verify the transfer transaction signature
      const tx = await connection.getTransaction(signature);
      if (!tx) {
        return res.status(400).json({ error: 'Invalid transfer transaction' });
      }

      // Update the agent metadata with the new owner
      const updatedAgent = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          creator: newOwner,
          transferHistory: {
            create: {
              fromAddress: currentOwner,
              toAddress: newOwner,
              transactionHash: signature,
              timestamp: new Date(),
            },
          },
        },
        include: {
          transferHistory: true,
        },
      });

      res.json(updatedAgent);
    } catch (error) {
      console.error('Error transferring agent:', error);
      res.status(500).json({ error: 'Failed to transfer agent' });
    }
  }
);

// Get transfer history for an agent
router.get('/transfer-history/:agentAddress',
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

      const history = await prisma.transferHistory.findMany({
        where: { agentAddress },
        orderBy: { timestamp: 'desc' },
      });

      res.json(history);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      res.status(500).json({ error: 'Failed to fetch transfer history' });
    }
  }
);

// Verify transfer eligibility
router.get('/transfer-eligibility/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    body('currentOwner').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const { currentOwner } = req.body;

      // Check if the agent exists and is owned by the current owner
      const agent = await prisma.agentMetadata.findUnique({
        where: { agentAddress },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Check if there are any pending transfers
      const pendingTransfer = await prisma.transferRequest.findFirst({
        where: {
          agentAddress,
          status: 'PENDING',
        },
      });

      const isEligible = agent.creator === currentOwner && !pendingTransfer;

      res.json({
        isEligible,
        reason: !isEligible
          ? agent.creator !== currentOwner
            ? 'Not the current owner'
            : 'Pending transfer exists'
          : null,
      });
    } catch (error) {
      console.error('Error checking transfer eligibility:', error);
      res.status(500).json({ error: 'Failed to check transfer eligibility' });
    }
  }
);

export default router;
