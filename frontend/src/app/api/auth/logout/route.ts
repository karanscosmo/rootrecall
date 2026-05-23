import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  // Clear cookie
  response.cookies.set("rr_session", "", { path: "/", maxAge: 0 });
  return response;
}
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("rr_session", "", { path: "/", maxAge: 0 });
  return response;
}
