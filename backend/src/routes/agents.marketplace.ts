import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey } from '@solana/web3.js';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// List agents in marketplace
router.get('/listings',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['price', 'created', 'popularity']),
    query('order').optional().isIn(['asc', 'desc']),
    query('filter').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = req.query.sortBy as string || 'created';
      const order = req.query.order as 'asc' | 'desc' || 'desc';
      const filter = req.query.filter || {};

      const skip = (page - 1) * limit;

      // Build the query
      const where = {
        isListed: true,
        ...buildFilterQuery(filter),
      };

      // Get total count for pagination
      const total = await prisma.agentMetadata.count({ where });

      // Get listings with sorting and pagination
      const listings = await prisma.agentMetadata.findMany({
        where,
        skip,
        take: limit,
        orderBy: buildSortQuery(sortBy, order),
        include: {
          analytics: true,
          verificationHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      res.json({
        listings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      res.status(500).json({ error: 'Failed to fetch marketplace listings' });
    }
  }
);

// Create marketplace listing
router.post('/listings',
  [
    body('agentAddress').isString().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('duration').isInt({ min: 1 }),
    body('seller').isString().notEmpty(),
    body('signature').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, price, duration, seller, signature } = req.body;

      // Verify ownership and signature
      const isVerified = await verifyOwnership(agentAddress, seller, signature);
      if (!isVerified) {
        return res.status(403).json({ error: 'Not authorized to list this agent' });
      }

      // Create listing
      const listing = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          isListed: true,
          listingPrice: price,
          listingExpiry: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
          listingSignature: signature,
        },
      });

      res.json(listing);
    } catch (error) {
      console.error('Error creating marketplace listing:', error);
      res.status(500).json({ error: 'Failed to create marketplace listing' });
    }
  }
);

// Purchase agent from marketplace
router.post('/purchase',
  [
    body('agentAddress').isString().notEmpty(),
    body('buyer').isString().notEmpty(),
    body('paymentTx').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, buyer, paymentTx } = req.body;

      // Get the listing
      const agent = await prisma.agentMetadata.findUnique({
        where: { agentAddress },
      });

      if (!agent || !agent.isListed) {
        return res.status(404).json({ error: 'Agent not listed in marketplace' });
      }

      if (agent.listingExpiry && agent.listingExpiry < new Date()) {
        return res.status(400).json({ error: 'Listing has expired' });
      }

      // Verify payment
      const paymentVerified = await verifyPayment(paymentTx, agent.listingPrice || 0);
      if (!paymentVerified) {
        return res.status(400).json({ error: 'Invalid payment' });
      }

      // Process purchase
      const purchase = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          isListed: false,
          listingPrice: null,
          listingExpiry: null,
          listingSignature: null,
          creator: buyer,
          transferHistory: {
            create: {
              fromAddress: agent.creator,
              toAddress: buyer,
              transactionHash: paymentTx,
              timestamp: new Date(),
              price: agent.listingPrice,
            },
          },
        },
      });

      res.json(purchase);
    } catch (error) {
      console.error('Error processing marketplace purchase:', error);
      res.status(500).json({ error: 'Failed to process purchase' });
    }
  }
);

// Helper function to build filter query
function buildFilterQuery(filter: any) {
  const query: any = {};

  if (filter.minPrice) {
    query.listingPrice = { gte: parseFloat(filter.minPrice) };
  }
  if (filter.maxPrice) {
    query.listingPrice = { ...query.listingPrice, lte: parseFloat(filter.maxPrice) };
  }
  if (filter.verificationStatus) {
    query.verificationStatus = filter.verificationStatus;
  }
  if (filter.creator) {
    query.creator = filter.creator;
  }
  if (filter.search) {
    query.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { description: { contains: filter.search, mode: 'insensitive' } },
      { symbol: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  return query;
}

// Helper function to build sort query
function buildSortQuery(sortBy: string, order: 'asc' | 'desc') {
  switch (sortBy) {
    case 'price':
      return { listingPrice: order };
    case 'popularity':
      return { analytics: { totalInteractions: order } };
    case 'created':
    default:
      return { createdAt: order };
  }
}

// Helper function to verify ownership
async function verifyOwnership(agentAddress: string, seller: string, signature: string): Promise<boolean> {
  try {
    const agent = await prisma.agentMetadata.findUnique({
      where: { agentAddress },
    });

    if (!agent || agent.creator !== seller) {
      return false;
    }

    // TODO: Implement proper signature verification
    // 1. Verify the signature is valid for the agent address
    // 2. Verify the signer is the current owner

    return true;
  } catch (error) {
    console.error('Error verifying ownership:', error);
    return false;
  }
}

// Helper function to verify payment
async function verifyPayment(txHash: string, price: number): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(txHash);
    if (!tx) return false;

    // TODO: Implement proper payment verification
    // 1. Verify the payment amount matches the listing price
    // 2. Verify the payment recipient is correct
    // 3. Verify the transaction is confirmed

    return true;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
}

export default router;
