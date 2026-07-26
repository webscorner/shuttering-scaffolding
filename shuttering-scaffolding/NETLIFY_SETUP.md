# Netlify and Decap CMS Setup

The project is ready for a GitHub repository. You do not need to change the
website code, but the following account settings must be completed once.

## 1. Create the GitHub repository

1. Sign in to GitHub and create a new repository.
2. A suitable repository name is `shuttering-scaffolding`.
3. Upload this complete project to the repository.
4. Open `public/admin/config.yml`.
5. Replace:

   ```yaml
   repo: REPLACE_WITH_GITHUB_USERNAME/REPLACE_WITH_REPOSITORY_NAME
   ```

   Example:

   ```yaml
   repo: amitpannu/shuttering-scaffolding
   ```

6. Commit and push the change to the `main` branch.

## 2. Deploy from GitHub to Netlify

1. Sign in to Netlify.
2. Choose **Add new project → Import an existing project**.
3. Select GitHub and choose the new repository.
4. Netlify reads `netlify.toml` automatically. Confirm:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Deploy the project.

## 3. Add Gmail environment variables

In Netlify, open **Project configuration → Environment variables** and add:

```text
GMAIL_USER = shutteringandscaffolding@gmail.com
GMAIL_APP_PASSWORD = your 16-character Google App Password
```

Never commit the App Password to GitHub and never upload the local `.env` file.
Trigger a new Netlify deploy after saving the variables.

## 4. Update the live site address

After Netlify gives the project a live address, open
`public/admin/config.yml` and replace both placeholder addresses:

```yaml
site_url: https://REPLACE_WITH_YOUR_NETLIFY_SITE.netlify.app
display_url: https://REPLACE_WITH_YOUR_NETLIFY_SITE.netlify.app
```

Commit and push the update.

## 5. Enable GitHub login for Decap CMS

1. In GitHub, open **Settings → Developer settings → OAuth Apps**.
2. Register a new OAuth application.
3. Use your Netlify site address as the homepage URL.
4. Use this exact authorization callback URL:

   ```text
   https://api.netlify.com/auth/done
   ```

5. Copy the GitHub Client ID and generate a Client Secret.
6. In Netlify, open **Project configuration → Access & security → OAuth**.
7. Choose **Install provider → GitHub**.
8. Enter the Client ID and Client Secret and save.

Keep the Client Secret private.

## 6. Publish the first article

1. Open `https://YOUR-SITE.netlify.app/admin`.
2. Choose **Login with GitHub**.
3. Open **Blog Posts**.
4. Create a post or edit one of the three starter posts.
5. Save a draft, review it, then publish it.

Publishing updates the GitHub repository. Netlify automatically rebuilds the
site, generates the article page, and adds the article to the Blogs page.
