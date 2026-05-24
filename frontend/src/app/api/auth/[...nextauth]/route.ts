import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing-google-client-secret",
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
          const loginUrl = apiBase.endsWith('/api/v1') ? `${apiBase}/auth/login` : `${apiBase}/api/v1/auth/login`;
          const res = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });
          if (res.ok) {
            const data = await res.json();
            return {
              id: data.user.email,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              accessToken: data.access_token
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        // If it's a google login, sync it with FastAPI
        if (account.provider === 'google') {
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
            const googleUrl = apiBase.endsWith('/api/v1') ? `${apiBase}/auth/google` : `${apiBase}/api/v1/auth/google`;
            const res = await fetch(googleUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                secret: process.env.INTERNAL_AUTH_SECRET || "supersecret-default"
              })
            });
            if (res.ok) {
              const data = await res.json();
              token.accessToken = data.access_token;
              token.role = data.user.role;
            }
          } catch (e) {
            console.error("Failed to sync auth with backend", e);
          }
        } else if (account.provider === 'credentials') {
          // It's from CredentialsProvider, accessToken and role are already in user object
          token.accessToken = (user as any).accessToken;
          token.role = (user as any).role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        role: token.role as string,
        accessToken: token.accessToken as string
      } as any;
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
