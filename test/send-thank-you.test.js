const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/send-thank-you");

const originalEnv = {
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_TEMPLATE_ID: process.env.RESEND_TEMPLATE_ID,
};
const originalFetch = global.fetch;
const originalRandom = Math.random;

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  global.fetch = originalFetch;
  Math.random = originalRandom;
});

function configure() {
  process.env.ALLOWED_ORIGIN = "https://example.github.io";
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.RESEND_TEMPLATE_ID = "test-template-id";
}

function event({ method = "POST", origin = "https://example.github.io", body } = {}) {
  return {
    httpMethod: method,
    headers: { origin },
    body: body === undefined ? JSON.stringify({ email: "person@example.com" }) : body,
  };
}

test("sends the configured template to the submitted email", async () => {
  configure();
  Math.random = () => 0.999999;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  const result = await handler(event());

  assert.equal(result.statusCode, 200);
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers.Authorization, "Bearer test-api-key");
  assert.deepEqual(JSON.parse(request.options.body), {
    from: "gvcode@gvyoutube.net",
    to: ["person@example.com"],
    template: {
      id: "test-template-id",
      variables: { FUN_FACT: "<em>The Earth's atmosphere makes the sky look blue.</em>" },
    },
  });
});

test("rejects a request from an unconfigured origin", async () => {
  configure();
  const result = await handler(event({ origin: "https://attacker.example" }));

  assert.equal(result.statusCode, 403);
});

test("rejects malformed email input without calling Resend", async () => {
  configure();
  global.fetch = async () => {
    assert.fail("Resend should not be called for invalid input");
  };

  const result = await handler(event({ body: JSON.stringify({ email: "not-an-email" }) }));

  assert.equal(result.statusCode, 400);
});

test("reports missing Resend configuration", async () => {
  process.env.ALLOWED_ORIGIN = "https://example.github.io";
  delete process.env.RESEND_API_KEY;
  process.env.RESEND_TEMPLATE_ID = "test-template-id";

  const result = await handler(event());

  assert.equal(result.statusCode, 500);
});
