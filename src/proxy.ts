import { NextResponse, type NextRequest } from "next/server";
import { canAccess, HOME } from "@/lib/constants";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (!session) return pathname === "/login" ? NextResponse.next() : go("/login");
  if (pathname === "/" || pathname === "/login" || !canAccess(pathname, session.role)) return go(HOME[session.role]);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
