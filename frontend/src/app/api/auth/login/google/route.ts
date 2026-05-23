import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback";
  
  if (clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID") {
    // Real Google OAuth redirect URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=security_state_string`;
    return NextResponse.redirect(googleAuthUrl);
  } else {
    // Redirect to sandbox mockup Google account chooser
    const mockAuthUrl = `http://localhost:3000/auth/mock-google?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(mockAuthUrl);
  }
}
