import { generateMinutes } from "./minutes.js";

export async function handleMinutesRequest(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Use POST to generate meeting minutes." });
    return;
  }

  try {
    const minutes = await generateMinutes(request.body?.transcript);
    response.status(200).json(minutes);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    if (status >= 500) {
      console.error("Meeting-minutes generation failed.", error);
    }
    response.status(status).json({
      error: status >= 500 && status !== 503
        ? "OpenAI could not process this transcript. Check the server logs and try again."
        : error.message,
    });
  }
}
