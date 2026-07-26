import nodemailer from "nodemailer";

const recipient = "shutteringandscaffolding@gmail.com";
const maxBodyBytes = 50_000;

function cleanText(value, maxLength) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validate(input) {
  const enquiry = {
    name: cleanText(input.name, 100),
    phone: cleanText(input.phone, 30),
    email: cleanText(input.email, 150),
    requirement: cleanText(input.requirement, 100),
    details: cleanText(input.details, 2000),
  };
  const errors = {};
  if (enquiry.name.length < 2) errors.name = "Please enter your full name.";
  if (!/^[+()\-\s0-9]{7,30}$/.test(enquiry.phone)) errors.phone = "Please enter a valid phone number.";
  if (enquiry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) errors.email = "Please enter a valid email address.";
  if (!enquiry.requirement) errors.requirement = "Please select what you need.";
  return { enquiry, errors };
}

export default async (request) => {
  if (request.method !== "POST") {
    return json(405, { ok: false, message: "Method not allowed." });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBodyBytes) {
    return json(413, { ok: false, message: "Request too large." });
  }

  try {
    const input = await request.json();
    if (cleanText(input.companyWebsite, 200)) {
      return json(201, { ok: true, message: "Thank you. Your enquiry has been received." });
    }
    const { enquiry, errors } = validate(input);
    if (Object.keys(errors).length) {
      return json(422, { ok: false, message: "Please check the highlighted fields.", errors });
    }

    const gmailUser = cleanText(Netlify.env.get("GMAIL_USER") || recipient, 150);
    const gmailAppPassword = String(Netlify.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");
    if (!gmailAppPassword) {
      return json(503, {
        ok: false,
        message: "Email delivery is not configured. Please call +91 92663 56001.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });
    const safe = Object.fromEntries(
      Object.entries(enquiry).map(([key, value]) => [key, escapeHtml(value || "Not provided")]),
    );

    await transporter.sendMail({
      from: `"Shuttering and Scaffolding Website" <${gmailUser}>`,
      to: recipient,
      replyTo: enquiry.email || undefined,
      subject: `New website enquiry — ${enquiry.requirement}`,
      text: [
        `Name: ${enquiry.name}`,
        `Phone: ${enquiry.phone}`,
        `Email: ${enquiry.email || "Not provided"}`,
        `Requirement: ${enquiry.requirement}`,
        `Project details: ${enquiry.details || "Not provided"}`,
      ].join("\n"),
      html: `
        <h2>New website enquiry</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">
          <tr><th align="left">Name</th><td>${safe.name}</td></tr>
          <tr><th align="left">Phone</th><td>${safe.phone}</td></tr>
          <tr><th align="left">Email</th><td>${safe.email}</td></tr>
          <tr><th align="left">Requirement</th><td>${safe.requirement}</td></tr>
          <tr><th align="left">Project details</th><td>${safe.details}</td></tr>
        </table>
      `,
    });

    return json(201, { ok: true, message: "Thank you. Your enquiry has been emailed successfully." });
  } catch (error) {
    console.error("Enquiry delivery failed:", error.message);
    return json(502, {
      ok: false,
      message: "The email could not be delivered. Please call +91 92663 56001.",
    });
  }
};

export const config = {
  path: "/api/enquiries",
};
