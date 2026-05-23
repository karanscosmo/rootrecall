import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("rr_session");
  
  if (!session || !session.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const user = JSON.parse(session.value);
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
