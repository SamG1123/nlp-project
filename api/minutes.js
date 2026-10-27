import { handleMinutesRequest } from "../server/minutesHandler.js";

export default async function handler(request, response) {
  await handleMinutesRequest(request, response);
}
