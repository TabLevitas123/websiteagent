import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Update agent metadata
router.patch('/metadata/:agentAddress',
  [
    param('agentAddress').isString().notEmpty(),
    body('name').optional().isString(),
    body('symbol').optional().isString(),
    body('description').optional().isString(),
    body('imageUrl').optional().isURL(),
    body('externalUrl').optional().isURL(),
    body('attributes').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress } = req.params;
      const updateData = req.body;

      // Verify the agent exists
      const agent = await prisma.agentMetadata.findUnique({
        where: { agentAddress },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Update the metadata
      const updatedAgent = await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          ...updateData,
          metadataHistory: {
            create: {
              previousName: agent.name,
              previousSymbol: agent.symbol,
              previousDescription: agent.description,
              previousImageUrl: agent.imageUrl,
              previousExternalUrl: agent.externalUrl,
              updatedAt: new Date(),
              updatedBy: req.body.updatedBy,
            },
          },
        },
        include: {
          metadataHistory: {
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
          },
        },
      });

      res.json(updatedAgent);
    } catch (error) {
      console.error('Error updating agent metadata:', error);
      res.status(500).json({ error: 'Failed to update agent metadata' });
    }
  }
);

// Get metadata history for an agent
router.get('/metadata-history/:agentAddress',
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

      const history = await prisma.metadataHistory.findMany({
        where: { agentAddress },
        orderBy: { updatedAt: 'desc' },
      });

      res.json(history);
    } catch (error) {
      console.error('Error fetching metadata history:', error);
      res.status(500).json({ error: 'Failed to fetch metadata history' });
    }
  }
);

// Validate metadata update request
router.post('/metadata-validation',
  [
    body('name').optional().isString().isLength({ min: 1, max: 32 }),
    body('symbol').optional().isString().isLength({ min: 1, max: 10 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('imageUrl').optional().isURL(),
    body('externalUrl').optional().isURL(),
    body('attributes').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Additional custom validations
      const { name, symbol, attributes } = req.body;

      const validations = {
        name: name ? /^[a-zA-Z0-9\s-]+$/.test(name) : true,
        symbol: symbol ? /^[A-Z0-9]+$/.test(symbol) : true,
        attributes: attributes ? attributes.every((attr: any) => 
          attr.trait_type && 
          typeof attr.value !== 'undefined' &&
          attr.trait_type.length <= 32 &&
          String(attr.value).length <= 32
        ) : true,
      };

      const isValid = Object.values(validations).every(v => v);

      res.json({
        isValid,
        validations,
        errors: !isValid ? {
          name: !validations.name ? 'Invalid name format' : null,
          symbol: !validations.symbol ? 'Invalid symbol format' : null,
          attributes: !validations.attributes ? 'Invalid attributes format' : null,
        } : null,
      });
    } catch (error) {
      console.error('Error validating metadata:', error);
      res.status(500).json({ error: 'Failed to validate metadata' });
    }
  }
);

export default router;
