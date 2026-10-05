import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    if (process.env.NODE_ENV !== 'production' && typeof require !== 'undefined' && require.cache) {
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('@prisma/client') || key.includes('.prisma/client')) {
          delete require.cache[key];
        }
      });
    }
  } catch {}

  let ClientClass = PrismaClient;
  try {
    if (typeof require !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@prisma/client');
      if (fresh.PrismaClient) {
        ClientClass = fresh.PrismaClient;
      }
    }
  } catch {}

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return new ClientClass({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  return new ClientClass();
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma && 'apiKey' in globalForPrisma.prisma && 'apiRequestLog' in globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient() as any;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
