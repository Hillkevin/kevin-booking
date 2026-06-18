export default async (req, context) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();
    const { action, date, start, end, title, location, description, attendeeEmail, addMeet } = body;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let prompt = "";

    if (action === "check_availability") {
      prompt = `List all events on my Google Calendar (calendar ID: ${GOOGLE_CALENDAR_ID}) between ${date}T00:00:00 and ${date}T23:59:59. Return ONLY a JSON array of busy periods like: [{"start":"ISO datetime","end":"ISO datetime"}]. No other text.`;
    } else if (action === "book") {
      prompt = `Create a Google Calendar event on calendar ${GOOGLE_CALENDAR_ID} with these details:
Title: "${title}"
Start: ${start}
End: ${end}
Location: ${location}
Description: ${description}
Attendees: ${attendeeEmail}
${addMeet ? "Add a Google Meet video conference link." : ""}
Return ONLY JSON: {"success": true, "meetLink": "..."} or {"success": false, "error": "..."}. No other text.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        mcp_servers: [
          {
            type: "url",
            url: "https://calendarmcp.googleapis.com/mcp/v1",
            name: "google-calendar",
          },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    // Extract results
    const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const toolResults = (data.content || []).filter(b => b.type === "mcp_tool_result");
    const hadToolUse = (data.content || []).some(b => b.type === "mcp_tool_use");

    if (action === "check_availability") {
      let busy = [];

      for (const block of toolResults) {
        const text = block?.content?.[0]?.text || "";
        try {
          const parsed = JSON.parse(text);
          const items = parsed.items || parsed.events || parsed || [];
          if (Array.isArray(items)) {
            items.forEach(ev => {
              const s = ev.start?.dateTime || ev.start?.date;
              const e = ev.end?.dateTime || ev.end?.date;
              if (s && e) busy.push({ start: s, end: e });
            });
          }
        } catch {}
      }

      if (busy.length === 0 && textBlocks) {
        try {
          const clean = textBlocks.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.events || []);
          items.forEach(ev => {
            const s = ev.start?.dateTime || ev.start?.date || ev.start;
            const e = ev.end?.dateTime || ev.end?.date || ev.end;
            if (s && e) busy.push({ start: s, end: e });
          });
        } catch {}
      }

      return new Response(JSON.stringify({ busy }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (action === "book") {
      let meetLink = "";

      if (toolResults.length > 0) {
        const resultText = toolResults.map(r => r.content?.[0]?.text || "").join("");
        const m = resultText.match(/https:\/\/meet\.google\.com\/[a-z\-]+/);
        if (m) meetLink = m[0];
        return new Response(JSON.stringify({ success: true, meetLink }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      if (hadToolUse) {
        return new Response(JSON.stringify({ success: true, meetLink }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      try {
        const clean = textBlocks.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Could not confirm booking" }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = {
  path: "/api/calendar",
};
