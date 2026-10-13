import { NextResponse, type NextRequest } from "next/server";

// UX-only redirects based on cookie presence; the API is the real auth boundary.
const SESSION_COOKIE = "ajaia_session";
const PUBLIC_PATHS = new Set(["/welcome", "/terms", "/privacy", "/login", "/register"]);
const AUTH_PAGES = new Set(["/login", "/register"]);

function redirect(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (AUTH_PAGES.has(pathname) && hasSession) return redirect(request, "/");
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (!hasSession) {
    if (pathname === "/") return redirect(request, "/welcome");
    return redirect(request, "/login", `${pathname}${search}`);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API proxy, Next internals and any file with an extension (static assets).
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
