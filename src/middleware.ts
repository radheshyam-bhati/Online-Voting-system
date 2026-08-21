import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.isAdmin ?? false;
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isOnElections = req.nextUrl.pathname.startsWith("/elections");
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (isLoginPage) {
    if (isLoggedIn) {
      const redirectTo = isAdmin ? "/admin" : "/";
      return Response.redirect(new URL(redirectTo, req.nextUrl));
    }
    return;
  }

  if (isOnAdmin) {
    if (!isLoggedIn || !isAdmin) {
      return Response.redirect(new URL("/403", req.nextUrl));
    }
  }

  if (isOnElections) {
    if (!isLoggedIn) {
      return Response.redirect(new URL(`/login?redirect=${req.nextUrl.pathname}`, req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*", "/elections/:path*", "/login"],
};