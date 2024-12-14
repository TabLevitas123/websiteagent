import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Follow an agent
router.post('/follow',
  [
    body('agentAddress').isString().notEmpty(),
    body('followerAddress').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, followerAddress } = req.body;

      const follow = await prisma.agentFollow.create({
        data: {
          agentAddress,
          followerAddress,
          followedAt: new Date(),
        },
      });

      // Update follower count
      await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          followerCount: {
            increment: 1,
          },
        },
      });

      res.json(follow);
    } catch (error) {
      console.error('Error following agent:', error);
      res.status(500).json({ error: 'Failed to follow agent' });
    }
  }
);

// Unfollow an agent
router.delete('/follow',
  [
    body('agentAddress').isString().notEmpty(),
    body('followerAddress').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, followerAddress } = req.body;

      await prisma.agentFollow.delete({
        where: {
          agentAddress_followerAddress: {
            agentAddress,
            followerAddress,
          },
        },
      });

      // Update follower count
      await prisma.agentMetadata.update({
        where: { agentAddress },
        data: {
          followerCount: {
            decrement: 1,
          },
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing agent:', error);
      res.status(500).json({ error: 'Failed to unfollow agent' });
    }
  }
);

// Get agent followers
router.get('/:agentAddress/followers',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { agentAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [followers, total] = await Promise.all([
        prisma.agentFollow.findMany({
          where: { agentAddress },
          skip,
          take: limit,
          include: {
            follower: {
              select: {
                name: true,
                imageUrl: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { followedAt: 'desc' },
        }),
        prisma.agentFollow.count({
          where: { agentAddress },
        }),
      ]);

      res.json({
        followers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching followers:', error);
      res.status(500).json({ error: 'Failed to fetch followers' });
    }
  }
);

// Get agent feed
router.get('/:agentAddress/feed',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { agentAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        prisma.agentActivity.findMany({
          where: { agentAddress },
          skip,
          take: limit,
          include: {
            agent: {
              select: {
                name: true,
                imageUrl: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        }),
        prisma.agentActivity.count({
          where: { agentAddress },
        }),
      ]);

      res.json({
        activities,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  }
);

// Add comment to agent
router.post('/comment',
  [
    body('agentAddress').isString().notEmpty(),
    body('commenterAddress').isString().notEmpty(),
    body('content').isString().notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { agentAddress, commenterAddress, content } = req.body;

      const comment = await prisma.agentComment.create({
        data: {
          agentAddress,
          commenterAddress,
          content,
          timestamp: new Date(),
        },
        include: {
          commenter: {
            select: {
              name: true,
              imageUrl: true,
              verificationStatus: true,
            },
          },
        },
      });

      // Create activity for the comment
      await prisma.agentActivity.create({
        data: {
          agentAddress,
          activityType: 'COMMENT',
          actorAddress: commenterAddress,
          metadata: {
            commentId: comment.id,
            content: content.substring(0, 100), // Store preview
          },
          timestamp: new Date(),
        },
      });

      res.json(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

// Get agent comments
router.get('/:agentAddress/comments',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { agentAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        prisma.agentComment.findMany({
          where: { agentAddress },
          skip,
          take: limit,
          include: {
            commenter: {
              select: {
                name: true,
                imageUrl: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        }),
        prisma.agentComment.count({
          where: { agentAddress },
        }),
      ]);

      res.json({
        comments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }
);

export default router;
