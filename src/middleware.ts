import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function middleware(request: Request) {
  const response = NextResponse.next();
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionToken = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("next-auth.session-token="))
    ?.split("=")[1];

  if (!sessionToken) {
    return handleRedirect(request, response);
  }

  try {
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    const isAdmin = payload.isAdmin as boolean | undefined ?? false;
    const isOnAdmin = request.url.includes("/admin/");
    const isOnElections = request.url.includes("/elections/");
    const isLoginPage = request.url.endsWith("/login");

    if (isLoginPage) {
      const redirectTo = isAdmin ? "/admin" : "/";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (isOnAdmin) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/403", request.url));
      }
    }

    if (isOnElections) {
      // Allow access - further checks in page components
    }

    // Add user info to headers for downstream use
    response.headers.set("x-user-id", payload.sub as string);
    response.headers.set("x-user-admin", String(isAdmin));
    response.headers.set("x-user-enrollment", payload.enrollmentNo as string || "");

    return response;
  } catch {
    return handleRedirect(request, response);
  }
}

function handleRedirect(request: Request, response: NextResponse) {
  const url = new URL(request.url);
  const isOnAdmin = url.pathname.startsWith("/admin");
  const isOnElections = url.pathname.startsWith("/elections");

  if (isOnAdmin || isOnElections) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${url.pathname}`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/elections/:path*", "/login"],
};