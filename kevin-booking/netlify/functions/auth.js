export default async (req, context) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://hillkevin-booking.netlify.app/api/auth/callback";
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const config = { path: "/api/auth/login" };
