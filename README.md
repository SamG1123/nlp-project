# MeetBrief

A React app that uses OpenAI to turn meeting transcripts into a summary, decisions, and action items with owners and deadlines.

## Setup

1. Install Node.js 20 or newer.
2. Install dependencies and create your local environment file:

   ```sh
   npm install
   Copy-Item .env.example .env
   ```

3. Add your OpenAI API key to `.env`:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   PORT=3001
   ```

4. Start the API and React development server:

   ```sh
   npm run dev
   ```

Open the Vite URL shown in the terminal. The server keeps the API key out of the browser. Never commit `.env` or expose the key in frontend code.

## How it works

- The server splits long transcripts into chunks of about 1,300 words, summarizes each chunk with OpenAI, then reduces those summaries into a final summary.
- A separate, schema-constrained OpenAI pass extracts decisions and action items from each chunk. Outputs use JSON Schema and are merged across chunks.
- Owners and deadlines are only included when supported by the transcript. Unstated information is returned as `null`; speaker labels improve owner attribution.
- The final minutes can be copied or downloaded as JSON.

## Notes

Transcripts are sent to OpenAI for processing. Review OpenAI's current data-use terms before using sensitive meeting content. The server accepts transcripts up to 100,000 words; each request may produce multiple model calls, so API usage and cost increase with transcript length. Generated minutes can miss context and should be reviewed before sharing.

For production, deploy the Express server behind HTTPS and add the authentication, rate limiting, and operational monitoring appropriate for your users.
