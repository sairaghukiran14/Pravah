import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || 'mock_id',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || 'mock_secret',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        // @ts-expect-error - Adding custom field
        session.user.onboardingCompleted = token.onboardingCompleted;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // @ts-expect-error - Adding custom field
        token.onboardingCompleted = user.onboardingCompleted;
      } else if (token.sub) {
        // Fetch from DB if user object is not present on subsequent calls
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { onboardingCompleted: true }
        });
        if (dbUser) {
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        const { seedSampleProject } = await import('@/lib/seedSampleProject');
        await seedSampleProject(user.id);
      }
    }
  },
  pages: {
    signIn: '/login',
  },
});
