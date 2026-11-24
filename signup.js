const form = document.getElementById("signup-form");
const submitButton = document.getElementById("submit-button");
const status = document.getElementById("status");
const emailFunctionUrl = "https://gvcode.netlify.app/.netlify/functions/send-thank-you";

let signupSubmitted = false;
let submittedEmail = "";

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function submitToFormspree() {
  const response = await fetch(form.action, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const details = Array.isArray(result?.errors)
      ? result.errors.map((item) => item.message).filter(Boolean).join(" ")
      : result?.error;
    throw new Error(`HTTP ${response.status}${details ? `: ${details}` : ""}`);
  }
}

async function sendThankYouEmail(email) {
  const response = await fetch(emailFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || `HTTP ${response.status}`);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  submitButton.disabled = true;
  status.innerHTML = '<span class="spinner" aria-hidden="true"></span>Submitting your signup...';
  status.classList.remove("error");

  try {
    if (!signupSubmitted) {
      submittedEmail = new FormData(form).get("email").trim();
      await submitToFormspree();
      signupSubmitted = true;
    }

    await sendThankYouEmail(submittedEmail);
    window.location.href = `emailVerify.html?email=${encodeURIComponent(submittedEmail)}`;
  } catch (error) {
    console.error("Signup submission failed:", error);
    if (signupSubmitted) {
      setStatus(
        `Your signup was received, but we couldn't send the thank-you email. ${error instanceof Error ? error.message : "Please try again."}`,
        true,
      );
      submitButton.textContent = "Retry thank-you email";
    } else {
      setStatus(
        `We couldn't submit your signup. ${error instanceof Error ? error.message : "Please check your connection and try again."}`,
        true,
      );
    }
  } finally {
    submitButton.disabled = false;
  }
});
