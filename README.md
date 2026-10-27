# MeetBrief

A React app that uses Groq to turn meeting transcripts into a summary, decisions, and action items with owners and deadlines.

## Setup

1. Install Node.js 20 or newer.
2. Install dependencies and create your local environment file:

   ```sh
   npm install
   Copy-Item .env.example .env
   ```

3. Add your Groq API key to `.env`:

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-20b
   PORT=3001
   ```

4. Start the API and React development server:

   ```sh
   npm run dev
   ```

Open the Vite URL shown in the terminal. Paste a transcript or upload a UTF-8 `.txt` file (up to 3 MB). The server sends requests to `https://api.groq.com/openai/v1` and keeps the API key out of the browser. Never commit `.env` or expose the key in frontend code.

## Deploy to Vercel

Import the repository into Vercel. The included `vercel.json` builds the Vite frontend from `dist`, and `api/minutes.js` exposes the minutes endpoint as a serverless function. In the Vercel project settings, add `GROQ_API_KEY` (and optionally `GROQ_MODEL`) under **Settings → Environment Variables**, then redeploy. Do not rely on the local Express server for the deployed API.

## How it works

- The server splits long transcripts into chunks of about 1,300 words, summarizes each chunk with Groq, then reduces those summaries into a final summary.
- A separate, schema-constrained Groq pass extracts decisions and action items from each chunk. Outputs use JSON Schema and are merged across chunks.
- Owners and deadlines are only included when supported by the transcript. Unstated information is returned as `null`; speaker labels improve owner attribution.
- The final minutes can be copied or downloaded as JSON.

## Notes

Transcripts are sent to Groq for processing. Review Groq's current data-use terms before using sensitive meeting content. The server accepts transcripts up to 100,000 words; each request may produce multiple model calls, so API usage and cost increase with transcript length. Generated minutes can miss context and should be reviewed before sharing.

For production, deploy the Express server behind HTTPS and add the authentication, rate limiting, and operational monitoring appropriate for your users.
