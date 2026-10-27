import assert from "node:assert/strict";
import { test } from "node:test";
import vercelMinutesHandler from "../api/minutes.js";

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("minutes handler returns JSON 405 for unsupported methods", async () => {
  const response = createResponse();
  await vercelMinutesHandler({ method: "GET" }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
  assert.deepEqual(response.body, { error: "Use POST to generate meeting minutes." });
});

test("minutes handler returns JSON setup error when OpenAI key is absent", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const response = createResponse();

  try {
    await vercelMinutesHandler({ method: "POST", body: { transcript: "Alex: We approved the launch." } }, response);
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, {
      error: "OpenAI is not configured. Add OPENAI_API_KEY to your .env file and restart the app.",
    });
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
