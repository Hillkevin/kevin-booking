# Kevin's Booking Page

A personal meeting scheduler that connects to Google Calendar to show real availability.

## Features
- 4 meeting types: Quick Chat (15m), 30-min Meeting, Deep Dive (60m), Custom
- Live calendar conflict detection — busy slots are automatically grayed out
- Available hours: 8 AM – 4 PM, weekdays only
- Location options: Google Meet, Phone, or In Person
- Automatically creates calendar invites and sends guest confirmation

## Deploy to Netlify in 3 steps

### 1. Push to GitHub
Create a new repo on github.com, then run:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/kevin-booking.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and select `kevin-booking`
4. Build settings will auto-detect — just click **Deploy site**

### 3. Share your link
Netlify gives you a URL like `https://kevin-booking.netlify.app`.
- Set a custom domain in Netlify → Site settings → Domain management
- Add the link to your email signature, LinkedIn, or wherever you want

## Local development
```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Notes
- The Google Calendar integration uses your connected Claude account — it reads and writes to your primary calendar
- The Anthropic API key is handled automatically via the Claude artifact infrastructure
- If you want to self-host with your own API key, add `VITE_ANTHROPIC_API_KEY` to your Netlify environment variables and update the fetch calls in `src/App.jsx`
