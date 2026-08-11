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
      if (!user.id) return;

      // Record the joining credit as a ledger entry. The balance itself comes
      // from the schema default, which means without this the wallet starts at
      // a non-zero value that no CreditTransaction accounts for — the ledger
      // and the balance would not reconcile.
      const signupGrant = Number(process.env.SIGNUP_CREDIT_GRANT ?? 20);
      if (signupGrant > 0) {
        try {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { credits: signupGrant },
            }),
            prisma.creditTransaction.create({
              data: {
                userId: user.id,
                amount: signupGrant,
                type: 'signup_bonus',
                description: 'Welcome credit on account creation',
              },
            }),
          ]);
        } catch (e) {
          console.error('[auth] Failed to record signup credit grant:', e);
        }
      }

      // Every account starts with its own copy of the shipped pipeline library,
      // which is what the dashboard's Quick Access section surfaces.
      try {
        const { seedLibrary } = await import('@/lib/seedLibrary');
        await seedLibrary(user.id);
      } catch (e) {
        // A seeding failure must not block sign-up; the library can be repaired
        // later by re-running seedLibrary, which only adds what is missing.
        console.error('[auth] Failed to seed pipeline library:', e);
      }
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
