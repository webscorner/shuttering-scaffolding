import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const builtDirectory = join(projectRoot, "dist");
const publicDirectory = existsSync(builtDirectory) ? builtDirectory : join(projectRoot, "public");
const dataDirectory = join(projectRoot, "data");
const enquiriesFile = process.env.ENQUIRIES_FILE
  ? resolve(projectRoot, process.env.ENQUIRIES_FILE)
  : join(dataDirectory, "enquiries.json");
const enquiryRecipient = "shutteringandscaffolding@gmail.com";
const emailDeliveryEnabled = process.env.EMAIL_DELIVERY_ENABLED !== "false";
const gmailUser = String(process.env.GMAIL_USER || enquiryRecipient).trim();
const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 50_000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

let writeQueue = Promise.resolve();
const recentRequests = new Map();

async function ensureStorage() {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(enquiriesFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeFile(enquiriesFile, "[]\n", "utf8");
  }
}

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' https://unpkg.com; connect-src 'self' https://api.netlify.com https://api.github.com; form-action 'self'; base-uri 'self'; frame-ancestors 'self'",
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(payload));
}

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

function validateEnquiry(input) {
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

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(Object.assign(new Error("Request too large"), { status: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function isRateLimited(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const address = String(forwarded || request.socket.remoteAddress || "local").split(",")[0].trim();
  const now = Date.now();
  const previous = (recentRequests.get(address) || []).filter((time) => now - time < 60_000);
  previous.push(now);
  recentRequests.set(address, previous);
  return previous.length > 8;
}

async function saveEnquiry(enquiry) {
  const record = {
    id: randomUUID(),
    ...enquiry,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  writeQueue = writeQueue.then(async () => {
    const current = JSON.parse(await readFile(enquiriesFile, "utf8"));
    current.push(record);
    const temporaryFile = `${enquiriesFile}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(current, null, 2)}\n`, "utf8");
    await rename(temporaryFile, enquiriesFile);
  });
  await writeQueue;
  return record;
}

async function deliverEnquiryByEmail(enquiry) {
  if (!emailDeliveryEnabled) return "disabled";
  if (!gmailAppPassword) return "not_configured";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
  const safe = Object.fromEntries(
    Object.entries(enquiry).map(([key, value]) => [key, escapeHtml(value || "Not provided")]),
  );

  await transporter.sendMail({
    from: `"Shuttering and Scaffolding Website" <${gmailUser}>`,
    to: enquiryRecipient,
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
  return "sent";
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, { ok: true, service: "Shuttering and Scaffolding API" });
  }

  if (pathname === "/api/enquiries" && request.method === "POST") {
    if (isRateLimited(request)) {
      return sendJson(response, 429, { ok: false, message: "Too many requests. Please try again in a minute." });
    }
    if (!String(request.headers["content-type"] || "").includes("application/json")) {
      return sendJson(response, 415, { ok: false, message: "Please send JSON data." });
    }
    try {
      const input = await readJsonBody(request);
      if (cleanText(input.companyWebsite, 200)) {
        return sendJson(response, 201, { ok: true, message: "Thank you. Your enquiry has been received." });
      }
      const { enquiry, errors } = validateEnquiry(input);
      if (Object.keys(errors).length) {
        return sendJson(response, 422, { ok: false, message: "Please check the highlighted fields.", errors });
      }
      const saved = await saveEnquiry(enquiry);
      let emailDelivery = "failed";
      try {
        emailDelivery = await deliverEnquiryByEmail(enquiry);
      } catch (error) {
        console.error("Enquiry email delivery failed:", error.message);
      }
      const delivered = emailDelivery === "sent" || emailDelivery === "disabled";
      const status = delivered ? 201 : emailDelivery === "not_configured" ? 503 : 502;
      return sendJson(response, status, {
        ok: delivered,
        saved: true,
        id: saved.id,
        emailDelivery,
        message: emailDelivery === "sent"
          ? "Thank you. Your enquiry has been emailed successfully."
          : emailDelivery === "not_configured"
            ? "Your enquiry was saved, but Gmail delivery is not configured yet. Please call +91 92663 56001."
            : emailDelivery === "failed"
              ? "Your enquiry was saved, but the email could not be delivered. Please call +91 92663 56001."
              : "Thank you. Your enquiry has been saved.",
      });
    } catch (error) {
      return sendJson(response, error.status || 500, {
        ok: false,
        message: error.status ? error.message : "Could not save your enquiry. Please try again.",
      });
    }
  }

  return sendJson(response, 404, { ok: false, message: "API endpoint not found." });
}

function resolvePublicFile(pathname) {
  const routes = {
    "/": "index.html",
    "/about": "about.html",
    "/products": "products.html",
    "/blogs": "blogs.html",
    "/contact": "contact.html",
    "/admin": "admin/index.html",
  };
  const requested = routes[pathname] || pathname.replace(/^\/+/, "");
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(publicDirectory, safePath);
  return filePath.startsWith(publicDirectory) ? filePath : null;
}

async function serveStatic(response, pathname) {
  const filePath = resolvePublicFile(pathname);
  if (!filePath) return false;
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) return false;
    const extension = extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const headers = securityHeaders(contentType);
    headers["Cache-Control"] = [".html", ".css", ".js"].includes(extension)
      ? "no-cache"
      : "public, max-age=86400";
    response.writeHead(200, headers);
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

await ensureStorage();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    if (pathname.startsWith("/api/")) {
      await handleApi(request, response, pathname);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendJson(response, 405, { ok: false, message: "Method not allowed." });
    }
    if (await serveStatic(response, pathname)) return;
    response.writeHead(404, securityHeaders("text/html; charset=utf-8"));
    response.end("<!doctype html><title>Page not found</title><h1>404 — Page not found</h1><p><a href='/'>Return home</a></p>");
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { ok: false, message: "Internal server error." });
  }
});

server.listen(port, () => {
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;
  console.log(`Shuttering and Scaffolding is running at http://localhost:${activePort}`);
});

export { server };
