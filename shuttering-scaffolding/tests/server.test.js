import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import test, { after } from "node:test";

process.env.PORT = "0";
process.env.ENQUIRIES_FILE = "data/enquiries.test.json";
process.env.EMAIL_DELIVERY_ENABLED = "false";
const { server } = await import("../server.js");
await new Promise((resolve) => server.listening ? resolve() : server.once("listening", resolve));
after(async () => {
  server.close();
  await unlink(new URL("../data/enquiries.test.json", import.meta.url)).catch(() => {});
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

test("serves every frontend page", async () => {
  for (const pathname of ["/", "/about", "/products", "/blogs", "/contact"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    const page = await response.text();
    assert.match(page, /class="site-header"/);
    assert.match(page, /class="site-footer"/);
    assert.match(page, /SHUTTERING/);
    assert.match(page, /92663 56001/);
    assert.match(page, /shutteringandscaffolding@gmail\.com/);
    assert.match(page, /projects across Gurgaon, Delhi NCR and nearby areas\./);
    const header = page.match(/<header class="site-header"[\s\S]*?<\/header>/);
    assert.ok(header);
    assert.doesNotMatch(header[0], /Our Gallery|#gallery/);
    assert.match(header[0], /class="query-now" href="(?:contact\.html)?#quote-form"/);
    assert.match(page, /✔ Our Gallery/);
  }
  const homepage = await (await fetch(`${baseUrl}/`)).text();
  assert.match(homepage, /class="hero"/);
  for (const expected of [
    /about-section/,
    /data-slider="featured"/,
    /Our Products/,
    /HAPPY CUSTOMERS/,
    /strength-section/,
    /testimonial-card/,
    /gallery-section/,
    /Contact Information/,
  ]) {
    assert.match(homepage, expected);
  }
  assert.match(homepage, /id="gallery"/);
  const homepageStyles = await fetch(`${baseUrl}/home.css`);
  assert.equal(homepageStyles.status, 200);
  assert.match(homepageStyles.headers.get("content-type") || "", /text\/css/);
});

test("uses the orange palette and compact detailed product cards", async () => {
  const homeStyles = await (await fetch(`${baseUrl}/home.css`)).text();
  const sharedStyles = await (await fetch(`${baseUrl}/styles.css`)).text();
  const products = await (await fetch(`${baseUrl}/products`)).text();
  assert.match(homeStyles, /--gold: #f05a24/);
  assert.match(sharedStyles, /--orange: #f05a24/);
  assert.match(sharedStyles, /\.catalog-page \.product-art/);
  assert.match(products, /body class="inner-page catalog-page"/);
  assert.match(products, /A precision joining component/);
  assert.equal((products.match(/class="product-card"/g) || []).length, 11);
  for (const productName of [
    "Shuttering Plates",
    "Clamp",
    "Adjustable Telescopic Props",
    "Cuplock System",
    "MS Channel",
  ]) {
    assert.match(products, new RegExp(productName));
  }
  const about = await (await fetch(`${baseUrl}/about`)).text();
  assert.match(about, /class="mission-vision"/);
  assert.match(about, /Our Mission/);
  assert.match(about, /Our Vision/);
  assert.match(about, /reduced material wastage/);
});

test("serves generated blog posts and the Decap CMS dashboard", async () => {
  const blogs = await (await fetch(`${baseUrl}/blogs`)).text();
  assert.equal((blogs.match(/class="blog-card/g) || []).length, 3);
  assert.match(blogs, /blog\/scaffold-safety-checklist\.html/);

  const article = await fetch(`${baseUrl}/blog/scaffold-safety-checklist.html`);
  assert.equal(article.status, 200);
  const articlePage = await article.text();
  assert.match(articlePage, /class="article-content"/);
  assert.match(articlePage, /Check the ground and base/);
  assert.match(articlePage, /class="site-footer"/);

  const admin = await fetch(`${baseUrl}/admin`);
  assert.equal(admin.status, 200);
  assert.match(await admin.text(), /decap-cms@3\.15\.1/);
  const config = await fetch(`${baseUrl}/admin/config.yml`);
  assert.equal(config.status, 200);
  assert.match(config.headers.get("content-type") || "", /text\/yaml/);
  assert.match(await config.text(), /REPLACE_WITH_GITHUB_USERNAME/);
});

test("reports backend health", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("Netlify enquiry function validates input and reports missing Gmail setup", async () => {
  const { default: netlifyEnquiries } = await import("../netlify/functions/enquiries.mjs");
  globalThis.Netlify = { env: { get: () => "" } };

  const invalid = await netlifyEnquiries(new Request("https://example.netlify.app/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A" }),
  }));
  assert.equal(invalid.status, 422);

  const missingSetup = await netlifyEnquiries(new Request("https://example.netlify.app/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      phone: "+91 92663 56001",
      email: "test@example.com",
      requirement: "Cuplock scaffolding",
      details: "Function test",
    }),
  }));
  assert.equal(missingSetup.status, 503);
  assert.equal((await missingSetup.json()).ok, false);
  delete globalThis.Netlify;
});

test("serves the hero and product images", async () => {
  const imagePaths = [
    "/images/hero-construction.jpg",
    "/images/vertical-standard-v2.jpg",
    "/images/horizontal-ledger-v2.jpg",
    "/images/u-head-jack-v2.jpg",
    "/images/base-jack-v2.jpg",
    "/images/spigot-pin-v2.jpg",
    "/images/steel-challi-v2.jpg",
    "/images/featured-scaffold-team.jpg",
    "/images/featured-slab-support.jpg",
    "/images/featured-facade-scaffold.jpg",
    "/images/featured-equipment-yard.jpg",
    "/images/featured-concrete-pour.jpg",
    "/images/shuttering-plates.jpg",
    "/images/clamp.jpg",
    "/images/adjustable-telescopic-props.jpg",
    "/images/cuplock-system.jpg",
    "/images/ms-channel.jpg",
  ];
  for (const pathname of imagePaths) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /image\/jpeg/);
    assert.ok(Number(response.headers.get("content-length") || 0) > 0 || (await response.arrayBuffer()).byteLength > 0);
  }
});

test("validates and accepts an enquiry", async () => {
  const invalid = await fetch(`${baseUrl}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A" }),
  });
  assert.equal(invalid.status, 422);

  const valid = await fetch(`${baseUrl}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      phone: "+91 92663 56001",
      email: "test@example.com",
      requirement: "Cuplock scaffolding",
      details: "Test enquiry",
    }),
  });
  assert.equal(valid.status, 201);
  const result = await valid.json();
  assert.equal(result.ok, true);
  assert.equal(result.emailDelivery, "disabled");
});
