import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = join(projectRoot, "public");
const contentDirectory = join(projectRoot, "content", "blog");
const templatePath = join(projectRoot, "templates", "blog-post.html");
const outputDirectory = join(projectRoot, "dist");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date).toUpperCase();
}

function imagePathForIndex(pathname) {
  const clean = String(pathname || "/images/hero-construction.jpg").replace(/^\/+/, "");
  return clean;
}

function imagePathForArticle(pathname) {
  return `../${imagePathForIndex(pathname)}`;
}

function fillTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

async function loadPosts() {
  const files = (await readdir(contentDirectory))
    .filter((file) => extname(file).toLowerCase() === ".md")
    .sort();
  const posts = [];

  for (const file of files) {
    const source = await readFile(join(contentDirectory, file), "utf8");
    const { data, content } = matter(source);
    if (data.published === false) continue;

    const title = String(data.title || "").trim();
    const slug = slugify(data.slug || file.replace(/\.md$/i, ""));
    const date = new Date(data.date);
    if (!title || !slug || Number.isNaN(date.getTime())) {
      throw new Error(`Blog post ${file} requires a valid title, slug and date.`);
    }

    posts.push({
      title,
      slug,
      date,
      dateIso: date.toISOString(),
      dateDisplay: formatDate(date),
      author: String(data.author || "Shuttering and Scaffolding Team"),
      category: String(data.category || "Construction"),
      summary: String(data.summary || ""),
      seoTitle: String(data.seoTitle || title),
      seoDescription: String(data.seoDescription || data.summary || ""),
      featuredImage: String(data.featuredImage || "/images/hero-construction.jpg"),
      html: marked.parse(content, { gfm: true }),
    });
  }

  return posts.sort((a, b) => b.date - a.date);
}

function renderCard(post, index) {
  const featuredClass = index === 0 ? " blog-featured" : "";
  const image = escapeHtml(imagePathForIndex(post.featuredImage));
  const title = escapeHtml(post.title);
  return `
      <article class="blog-card${featuredClass}">
        <a class="blog-art" href="blog/${post.slug}.html" aria-label="Read ${title}"><img src="${image}" alt="${title}" loading="${index === 0 ? "eager" : "lazy"}"></a>
        <div class="blog-copy">
          <div class="blog-meta"><span>${escapeHtml(post.category).toUpperCase()}</span><time datetime="${post.dateIso}">${post.dateDisplay}</time></div>
          <h2>${title}</h2>
          <p>${escapeHtml(post.summary)}</p>
          <a class="arrow-link" href="blog/${post.slug}.html">Read article <span>↗</span></a>
        </div>
      </article>`;
}

async function build() {
  await rm(outputDirectory, { recursive: true, force: true });
  await cp(publicDirectory, outputDirectory, { recursive: true });
  await mkdir(join(outputDirectory, "blog"), { recursive: true });

  const posts = await loadPosts();
  const blogIndexPath = join(outputDirectory, "blogs.html");
  const blogIndex = await readFile(blogIndexPath, "utf8");
  const cards = posts.length
    ? posts.map(renderCard).join("\n")
    : '<p class="blog-empty">No published blog articles yet.</p>';
  const builtIndex = blogIndex.replace(
    /<!-- BLOG_LIST_START -->[\s\S]*?<!-- BLOG_LIST_END -->/,
    `<!-- BLOG_LIST_START -->\n${cards}\n      <!-- BLOG_LIST_END -->`,
  );
  await writeFile(blogIndexPath, builtIndex, "utf8");

  const articleTemplate = await readFile(templatePath, "utf8");
  for (const post of posts) {
    const page = fillTemplate(articleTemplate, {
      SEO_TITLE: escapeHtml(post.seoTitle),
      SEO_DESCRIPTION: escapeHtml(post.seoDescription),
      OG_IMAGE: escapeHtml(imagePathForArticle(post.featuredImage)),
      CATEGORY: escapeHtml(post.category),
      TITLE: escapeHtml(post.title),
      DATE_ISO: post.dateIso,
      DATE_DISPLAY: post.dateDisplay,
      AUTHOR: escapeHtml(post.author),
      FEATURED_IMAGE: escapeHtml(imagePathForArticle(post.featuredImage)),
      IMAGE_ALT: escapeHtml(post.title),
      SUMMARY: escapeHtml(post.summary),
      CONTENT: post.html,
    });
    await writeFile(join(outputDirectory, "blog", `${post.slug}.html`), page, "utf8");
  }

  const manifest = posts.map(({ html, date, ...post }) => post);
  await writeFile(join(outputDirectory, "blog-posts.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Built ${posts.length} blog posts into ${outputDirectory}`);
}

await build();
