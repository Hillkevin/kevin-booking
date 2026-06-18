async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const body = await req.json();
  const { action, date, start, end, title, location, description, attendeeEmail, addMeet } = body;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return new Response(JSON.stringify({
      error: "not_configured",
      authUrl: "/api/auth/login"
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const accessToken = await getAccessToken();

    if (action === "check_availability") {
      const dayStart = `${date}T00:00:00Z`;
      const dayEnd = `${date}T23:59:59Z`;

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${dayStart}&timeMax=${dayEnd}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const busy = (data.items || []).map(ev => ({
        start: ev.start?.dateTime || ev.start?.date,
        end: ev.end?.dateTime || ev.end?.date,
      })).filter(b => b.start && b.end);

      return new Response(JSON.stringify({ busy }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (action === "book") {
      const event = {
        summary: title,
        location,
        description,
        start: { dateTime: start, timeZone: "America/Chicago" },
        end: { dateTime: end, timeZone: "America/Chicago" },
        attendees: [{ email: attendeeEmail }],
        sendUpdates: "all",
      };

      if (addMeet) {
        event.conferenceData = {
          createRequest: { requestId: Math.random().toString(36).substring(7) }
        };
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      const data = await res.json();

      if (data.id) {
        const meetLink = data.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri || "";
        return new Response(JSON.stringify({ success: true, meetLink }), {
          status: 200,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: data.error?.message || "Booking failed" }), {
          status: 200,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/calendar" };
