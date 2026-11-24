const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FUN_FACTS = [
  "Octopuses have three hearts.",
  "A day on Venus is longer than its year.",
  "Bananas are berries, but strawberries are not.",
  "Wombats produce cube-shaped droppings.",
  "Butterflies taste with their feet.",
  "Hummingbirds can fly backward.",
  "A bolt of lightning can be hotter than the Sun's surface.",
  "Sharks existed before trees.",
  "Saturn is less dense than water.",
  "The Eiffel Tower can grow taller in warm weather.",
  "Sea otters sometimes hold paws while they sleep.",
  "Flamingos get their pink color from pigments in their food.",
  "The Moon moves away from Earth by about 3.8 centimeters each year.",
  "Dolphins sleep with one half of their brain at a time.",
  "Greenland sharks can live for centuries.",
  "Koala fingerprints can look remarkably like human fingerprints.",
  "Axolotls can regenerate lost limbs.",
  "Peanuts are legumes, not true nuts.",
  "An adult cat has 32 muscles in each ear.",
  "Some sea stars can regrow lost arms.",
  "The Earth's atmosphere makes the sky look blue.",
];

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
    const funFact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    resendResponse = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "gvcode@gvyoutube.net",
        to: [email],
        template: {
          id: process.env.RESEND_TEMPLATE_ID,
          variables: { FUN_FACT: `<em>${funFact}</em>` },
        },
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
