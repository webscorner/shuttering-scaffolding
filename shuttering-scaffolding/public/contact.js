const form = document.querySelector("#quote-form");
const statusBox = document.querySelector("#form-status");

function showStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `form-status ${type}`;
  statusBox.hidden = false;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  button.disabled = true;
  button.textContent = "Sending…";
  showStatus("Sending your enquiry…", "loading");

  try {
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not send your enquiry.");
    form.reset();
    showStatus(result.message, "success");
  } catch (error) {
    showStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = "Send enquiry <span>↗</span>";
  }
});
