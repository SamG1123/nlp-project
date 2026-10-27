import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { generateMinutes } from "./minutes.js";

const originalEnvironment = {
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: process.env.GROQ_BASE_URL,
};
const requests = [];
const mockGroq = createServer(async (request, response) => {
  const bodyChunks = [];
  for await (const chunk of request) bodyChunks.push(chunk);
  const body = JSON.parse(Buffer.concat(bodyChunks).toString());
  requests.push(body);

  const schemaName = body.response_format.json_schema.name;
  const content =
    schemaName === "meeting_chunk_summary"
      ? { keyPoints: ["The team reviewed project progress."] }
      : {
          decisions: ["The team agreed to publish the update."],
          actionItems: [{ task: "Send the project update.", owner: null, deadline: null }],
        };

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    id: "mock-completion",
    object: "chat.completion",
    created: 0,
    model: "mock-model",
    choices: [{
      index: 0,
      message: { role: "assistant", content: JSON.stringify(content), refusal: null },
      finish_reason: "stop",
    }],
  }));
});

before(async () => {
  await new Promise((resolve) => mockGroq.listen(0, "127.0.0.1", resolve));
  process.env.GROQ_API_KEY = "test-api-key";
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${mockGroq.address().port}/v1`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    mockGroq.close((error) => (error ? reject(error) : resolve()));
  });
  if (originalEnvironment.apiKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalEnvironment.apiKey;
  if (originalEnvironment.baseUrl === undefined) delete process.env.GROQ_BASE_URL;
  else process.env.GROQ_BASE_URL = originalEnvironment.baseUrl;
});

test("chunks long transcripts and merges Groq schema-constrained output", async () => {
  requests.length = 0;
  const transcript = Array(1301).fill("discussion").join(" ");
  const minutes = await generateMinutes(transcript);

  assert.equal(minutes.chunkCount, 2);
  assert.equal(minutes.wordCount, 1301);
  assert.deepEqual(minutes.summary, ["The team reviewed project progress."]);
  assert.deepEqual(minutes.decisions, ["The team agreed to publish the update."]);
  assert.deepEqual(minutes.actionItems, [{
    id: 1,
    task: "Send the project update.",
    owner: null,
    deadline: null,
  }]);
  assert.equal(minutes.speakerLabelsFound, false);
  assert.equal(requests.length, 5);
  assert.ok(requests.every((request) => request.response_format.json_schema.strict));
  assert.ok(requests.some((request) => request.response_format.json_schema.name === "meeting_decisions_and_actions"));
});

test("rejects empty transcripts without calling Groq", async () => {
  await assert.rejects(() => generateMinutes("  "), {
    message: "Add a meeting transcript before generating minutes.",
    status: 400,
  });
});
