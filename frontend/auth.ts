import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {}, password: {}, name: {}, mode: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const endpoint = credentials.mode === "signup" ? "/auth/signup" : "/auth/login";
        const body: Record<string, string> = { email: credentials.email, password: credentials.password };
        if (credentials.mode === "signup" && credentials.name) body.name = credentials.name;
        const res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Auth failed"); }
        const { user } = await res.json();
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) token.userId = user.id; return token; },
    async session({ session, token }) { session.user.id = token.userId as string; return session; },
  },
};

export default NextAuth(authOptions);
