import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
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
      signIn: "/auth/login",
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
