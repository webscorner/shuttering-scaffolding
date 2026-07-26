# Shuttering and Scaffolding — Full-Stack Website

This is a complete website that runs locally in VS Code and deploys to Netlify.
It includes a Decap CMS blog dashboard and direct Gmail delivery for enquiries.

## What is included

- Home, About Us, Products, Blogs and Contact pages
- Original hero and component photography included locally in `public/images/`
- Professional black, construction-orange and light-grey design across every page
- Matching two-level header and detailed footer on Home, About, Products, Blogs and Contact
- Compact product catalogue cards with detailed usage descriptions
- Featured-work image slider, testimonial slider, animated counters and homepage gallery
- Expanded About page with company overview, Our Mission and Our Vision
- Responsive desktop and mobile design
- Decap CMS dashboard at `/admin`
- Markdown blog posts with automatically generated article pages
- Draft, review and publish workflow through GitHub
- Netlify build and serverless enquiry function
- Node.js backend
- Quote-request API with validation and basic rate limiting
- Enquiry email delivery to `shutteringandscaffolding@gmail.com`
- Enquiries saved in `data/enquiries.json` when running locally
- Health-check endpoint at `/api/health`

## Run in VS Code

1. Install Node.js 20.6 or newer from https://nodejs.org
2. Extract this project ZIP.
3. Open the extracted folder in VS Code.
4. Open **Terminal → New Terminal**.
5. Install the project:

   ```bash
   npm install
   ```

6. Configure Gmail using the steps below.
7. Run:

   ```bash
   npm start
   ```

8. Open http://localhost:3000 in your browser.

You can also open **Run and Debug** in VS Code, select
**Run Shuttering and Scaffolding**, and press the green play button.

For automatic server restarts while editing:

```bash
npm run dev
```

### If Terminal shows `EPERM: process.cwd failed`

That message means the Terminal is still pointing to a folder that macOS has
moved, deleted or blocked. Close that Terminal, open the extracted project
folder again with **File → Open Folder** in VS Code, then choose
**Terminal → New Terminal** and run `npm start`.

## Build the website

```bash
npm run build
```

The finished Netlify-ready website is generated in `dist/`.

## Add and publish blog posts

The project includes three starter articles in `content/blog/`. On the live
website, open `/admin` to create articles, upload featured images, save drafts
and publish.

Before `/admin` can log in, create a GitHub repository and complete the steps in
`NETLIFY_SETUP.md`. The line that will later need your repository name is:

```yaml
repo: REPLACE_WITH_GITHUB_USERNAME/REPLACE_WITH_REPOSITORY_NAME
```

## Where enquiries are saved locally

Every successful contact-form submission is stored in:

```text
data/enquiries.json
```

Open that file in VS Code to view the enquiries.

## Connect enquiry emails to Gmail

The form now sends email directly through
`shutteringandscaffolding@gmail.com`; it no longer depends on the previous
form-relay activation.

1. Turn on 2-Step Verification for the Gmail account.
2. Open Google Account → Security → App passwords.
3. Create an App Password for the website.
4. Duplicate `.env.example`, rename the copy to `.env`, and replace
   `paste_your_16_character_app_password_here` with the generated App Password.
5. Keep `.env` private. Do not upload it or share the App Password.
6. Restart the website with `npm start`.

The regular Gmail password will not work here. Once configured, each successful
local submission is emailed to the Gmail inbox and saved in
`data/enquiries.json`. On Netlify, enquiries are emailed through the serverless
function; Netlify does not write them to the local JSON file.

The website contact number is `+91 92663 56001`.

## Project structure

```text
shuttering-scaffolding-fullstack/
├── data/
│   └── enquiries.json
├── content/
│   └── blog/
├── netlify/
│   └── functions/
├── scripts/
│   └── build.js
├── templates/
│   └── blog-post.html
├── public/
│   ├── index.html
│   ├── about.html
│   ├── products.html
│   ├── blogs.html
│   ├── contact.html
│   ├── contact.js
│   ├── home.css
│   ├── home.js
│   ├── images/
│   ├── admin/
│   ├── styles.css
│   └── og.png
├── netlify.toml
├── NETLIFY_SETUP.md
├── package.json
├── package-lock.json
├── .env.example
├── server.js
└── README.md
```
