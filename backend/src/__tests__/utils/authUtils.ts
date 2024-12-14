import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createMockUser } from './testUtils';

const prisma = new PrismaClient();

export const createTestToken = async () => {
  // Create a test user
  const mockUser = createMockUser();
  const user = await prisma.user.create({
    data: {
      address: mockUser.address,
      nonce: mockUser.nonce,
      isPremium: mockUser.isPremium,
    },
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, address: user.address },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return token;
};

export const verifyTestToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
};

export const createTestAdmin = async () => {
  const mockAdmin = createMockUser({ isPremium: true });
  const admin = await prisma.user.create({
    data: {
      address: mockAdmin.address,
      nonce: mockAdmin.nonce,
      isPremium: true,
    },
  });

  const token = jwt.sign(
    { userId: admin.id, address: admin.address, isAdmin: true },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { admin, token };
};
