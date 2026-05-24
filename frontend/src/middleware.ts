import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        // Protect all platform routes
        if (path.startsWith("/dashboard") || path.startsWith("/incidents") || path.startsWith("/postmortems") || path.startsWith("/health") || path.startsWith("/settings")) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/login",
    }
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/incidents/:path*",
    "/postmortems/:path*",
    "/health/:path*",
    "/settings/:path*"
  ],
};
