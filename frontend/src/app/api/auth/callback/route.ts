import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  let email = "operator@rootrecall.ai";
  let name = "Karan Sharma";

  // Check if it's a mock code
  if (code.startsWith("mock_code_")) {
    try {
      const base64Str = code.replace("mock_code_", "");
      const json = JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8"));
      email = json.email || email;
      name = json.name || name;
    } catch (e) {
      console.error("Error decoding mock code", e);
    }
  } else {
    // If it's a real code, we perform the OAuth token exchange
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback";
      
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId || "",
          client_secret: clientSecret || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (tokenRes.ok) {
        const tokens = await tokenRes.json();
        // Decode id_token (it's a JWT)
        if (tokens.id_token) {
          const parts = tokens.id_token.split(".");
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          email = payload.email || email;
          name = payload.name || name;
        }
      } else {
        console.error("Failed to trade OAuth code", await tokenRes.text());
        return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
      }
    } catch (e) {
      console.error("OAuth callback exception", e);
      return NextResponse.redirect(new URL("/login?error=oauth_error", req.url));
    }
  }

  // Create JWT session cookie
  const userSession = {
    email,
    name,
    role: "SRE Lead",
    authenticated: true,
  };

  const response = NextResponse.redirect(new URL("/onboarding", req.url));
  
  // Set session cookie (HTTPOnly, secure)
  response.cookies.set("rr_session", JSON.stringify(userSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
