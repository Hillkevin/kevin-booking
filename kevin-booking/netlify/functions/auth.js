export default async (req, context) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.URL + "/api/auth/callback";
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const config = { path: "/api/auth/login" };