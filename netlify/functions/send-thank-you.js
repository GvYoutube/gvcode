const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function response(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": origin || "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
      "Vary": "Origin",
    },
    body: body ? JSON.stringify(body) : "",
  };
}

exports.handler = async (event) => {
  let allowedOrigin;
  try {
    allowedOrigin = new URL(process.env.ALLOWED_ORIGIN).origin;
  } catch {
    console.error("ALLOWED_ORIGIN is missing or invalid.");
    return response(500, { error: "Email service is not configured." });
  }

  const requestOrigin = event.headers?.origin;
  if (requestOrigin !== allowedOrigin) {
    return response(403, { error: "Origin is not allowed." }, allowedOrigin);
  }

  if (event.httpMethod === "OPTIONS") {
    return response(204, null, allowedOrigin);
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed." }, allowedOrigin);
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_TEMPLATE_ID) {
    console.error("RESEND_API_KEY or RESEND_TEMPLATE_ID is not configured.");
    return response(500, { error: "Email service is not configured." }, allowedOrigin);
  }

  let email;
  try {
    email = JSON.parse(event.body || "").email?.trim();
  } catch {
    return response(400, { error: "A valid email address is required." }, allowedOrigin);
  }

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return response(400, { error: "A valid email address is required." }, allowedOrigin);
  }

  let resendResponse;
  try {
    resendResponse = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "gvcode@gvyoutube.net",
        to: [email],
        template: { id: process.env.RESEND_TEMPLATE_ID },
      }),
    });
  } catch (error) {
    console.error("Resend request failed:", error);
    return response(502, { error: "The thank-you email could not be sent." }, allowedOrigin);
  }

  if (!resendResponse.ok) {
    console.error(`Resend returned HTTP ${resendResponse.status}.`);
    return response(502, { error: "The thank-you email could not be sent." }, allowedOrigin);
  }

  return response(200, { sent: true }, allowedOrigin);
};
