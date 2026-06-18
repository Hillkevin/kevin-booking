export default async (req, context) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing auth code", { status: 400 });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = "https://hillkevin-booking.netlify.app/api/auth/callback";

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    return new Response(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto">
        <h2>⚠️ No refresh token received</h2>
        <p>Please go back and try again. Make sure you clicked "Allow" on the Google consent screen.</p>
        <p>Error: ${JSON.stringify(tokens)}</p>
        <a href="/api/auth/login">Try again</a>
      </body></html>
    `, { status: 400, headers: { "Content-Type": "text/html" } });
  }

  return new Response(`
    <html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;background:#f9fafb">
      <div style="background:white;padding:32px;border-radius:16px;border:1px solid #e5e7eb">
        <h2 style="color:#10B981;margin-top:0">✅ Google Calendar Connected!</h2>
        <p>Copy this refresh token and add it to your Netlify environment variables as <strong>GOOGLE_REFRESH_TOKEN</strong>:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:13px;margin:16px 0">
          ${tokens.refresh_token}
        </div>
        <p style="color:#6b7280;font-size:14px">Once added, your booking page will be fully connected to your Google Calendar.</p>
        <ol style="color:#374151;font-size:14px">
          <li>Copy the token above</li>
          <li>Go to Netlify → hillkevin-booking → Project configuration → Environment variables</li>
          <li>Add new variable: Key = <strong>GOOGLE_REFRESH_TOKEN</strong>, Value = the token</li>
          <li>Save and you're done!</li>
        </ol>
      </div>
    </body></html>
  `, { status: 200, headers: { "Content-Type": "text/html" } });
};

export const config = { path: "/api/auth/callback" };
