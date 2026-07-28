import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname.startsWith("/checkin") && role !== "ADMIN" && role !== "VOLUNTEER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname.startsWith("/driver/route") && role !== "DRIVER") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/checkin/:path*", "/driver/route/:path*"],
};
