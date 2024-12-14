import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Token } from '@solana/spl-token';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Batch create agents
router.post('/batch-create',
  [
    body('agents').isArray().notEmpty(),
    body('agents.*.name').isString().notEmpty(),
    body('agents.*.symbol').isString().notEmpty(),
    body('agents.*.description').optional().isString(),
    body('creator').isString().notEmpty(),
    body('paymentTx').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agents, creator, paymentTx } = req.body;

      // Verify payment first
      const paymentVerified = await verifyBatchPayment(paymentTx, agents.length);
      if (!paymentVerified) {
        return res.status(400).json({ error: 'Invalid payment for batch creation' });
      }

      // Create agents in parallel
      const createdAgents = await Promise.all(
        agents.map(async (agent: any) => {
          try {
            return await prisma.agentMetadata.create({
              data: {
                ...agent,
                creator,
                paymentTx: `${paymentTx}-${agent.symbol}`,
                createdAt: new Date(),
                verificationStatus: 'UNVERIFIED',
                analytics: {
                  create: {
                    totalInteractions: 0,
                    dailyStats: {},
                    weeklyStats: {},
                    monthlyStats: {},
                  },
                },
              },
            });
          } catch (error) {
            console.error(`Error creating agent ${agent.symbol}:`, error);
            return {
              error: true,
              symbol: agent.symbol,
              message: error instanceof Error ? error.message : 'Failed to create agent',
            };
          }
        })
      );

      res.json({
        success: createdAgents.filter(a => !a.error),
        failures: createdAgents.filter(a => a.error),
      });
    } catch (error) {
      console.error('Error in batch creation:', error);
      res.status(500).json({ error: 'Failed to process batch creation' });
    }
  }
);

// Batch transfer agents
router.post('/batch-transfer',
  [
    body('transfers').isArray().notEmpty(),
    body('transfers.*.agentAddress').isString().notEmpty(),
    body('transfers.*.fromAddress').isString().notEmpty(),
    body('transfers.*.toAddress').isString().notEmpty(),
    body('signature').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transfers, signature } = req.body;

      // Verify the batch transfer transaction
      const tx = await connection.getTransaction(signature);
      if (!tx) {
        return res.status(400).json({ error: 'Invalid transfer transaction' });
      }

      // Process transfers in parallel
      const results = await Promise.all(
        transfers.map(async (transfer: any) => {
          try {
            const agent = await prisma.agentMetadata.findUnique({
              where: { agentAddress: transfer.agentAddress },
            });

            if (!agent) {
              throw new Error('Agent not found');
            }

            if (agent.creator !== transfer.fromAddress) {
              throw new Error('Not authorized to transfer this agent');
            }

            return await prisma.agentMetadata.update({
              where: { agentAddress: transfer.agentAddress },
              data: {
                creator: transfer.toAddress,
                transferHistory: {
                  create: {
                    fromAddress: transfer.fromAddress,
                    toAddress: transfer.toAddress,
                    transactionHash: signature,
                    timestamp: new Date(),
                  },
                },
              },
            });
          } catch (error) {
            return {
              error: true,
              agentAddress: transfer.agentAddress,
              message: error instanceof Error ? error.message : 'Failed to transfer agent',
            };
          }
        })
      );

      res.json({
        success: results.filter(r => !r.error),
        failures: results.filter(r => r.error),
      });
    } catch (error) {
      console.error('Error in batch transfer:', error);
      res.status(500).json({ error: 'Failed to process batch transfer' });
    }
  }
);

// Batch update metadata
router.patch('/batch-update',
  [
    body('updates').isArray().notEmpty(),
    body('updates.*.agentAddress').isString().notEmpty(),
    body('updates.*.metadata').isObject().notEmpty(),
    body('updatedBy').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates, updatedBy } = req.body;

      // Process updates in parallel
      const results = await Promise.all(
        updates.map(async (update: any) => {
          try {
            const agent = await prisma.agentMetadata.findUnique({
              where: { agentAddress: update.agentAddress },
            });

            if (!agent) {
              throw new Error('Agent not found');
            }

            return await prisma.agentMetadata.update({
              where: { agentAddress: update.agentAddress },
              data: {
                ...update.metadata,
                metadataHistory: {
                  create: {
                    previousName: agent.name,
                    previousSymbol: agent.symbol,
                    previousDescription: agent.description,
                    previousImageUrl: agent.imageUrl,
                    previousExternalUrl: agent.externalUrl,
                    previousAttributes: agent.attributes,
                    updatedAt: new Date(),
                    updatedBy,
                  },
                },
              },
            });
          } catch (error) {
            return {
              error: true,
              agentAddress: update.agentAddress,
              message: error instanceof Error ? error.message : 'Failed to update agent',
            };
          }
        })
      );

      res.json({
        success: results.filter(r => !r.error),
        failures: results.filter(r => r.error),
      });
    } catch (error) {
      console.error('Error in batch update:', error);
      res.status(500).json({ error: 'Failed to process batch update' });
    }
  }
);

// Helper function to verify batch payment
async function verifyBatchPayment(txHash: string, count: number): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(txHash);
    if (!tx) return false;

    // TODO: Implement proper payment verification
    // 1. Verify the payment amount matches the batch size (count * 0.006 ETH)
    // 2. Verify the payment recipient is correct
    // 3. Verify the transaction is confirmed

    return true;
  } catch (error) {
    console.error('Error verifying batch payment:', error);
    return false;
  }
}

export default router;
