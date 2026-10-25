# Deployment

Repo Thumb is a static site. It needs no server runtime, database, OAuth app, secrets, or API key. GitHub metadata is requested from the visitor's browser, subject to GitHub's unauthenticated request limit.

## Build and verify

```sh
bun install --frozen-lockfile
bunx playwright install chromium --only-shell
bun run release:check
```

Deploy the contents of `dist/`. The build includes a portable `repo-thumb-source.zip` download.

`bun run preview` checks the production output locally; it is not a production server.

## Static hosts

The maintained deployment is an assets-only Cloudflare Worker at `repothumb.coolstuff.work`. The project pins the `cf` CLI and its Vite adapter. The Cloudflare build is separate from the portable static build; local editing stays on Vite.

```sh
bun run cf auth login
bun run deploy:check
bun run deploy
```

`deploy:check` builds and validates without uploading. `deploy` builds the site and source archive, prepares Cloudflare Build Output, and deploys that exact output through `cf deploy --prebuilt`. The custom domain is declared in `cloudflare.config.ts`; Cloudflare manages its DNS and TLS. For your own deployment, change the Worker name and domain in that file and update the public metadata in `index.html`.

If your login can access multiple accounts, set `CLOUDFLARE_ACCOUNT_ID` for the account owning the domain. CI or other unattended deployments can use `CLOUDFLARE_API_TOKEN`; keep it in the host's secret store. No credentials or account IDs are committed.

The CLI and adapter are pinned beta releases. See Cloudflare's [project workflow](https://developers.cloudflare.com/cf/projects/) and [configuration reference](https://developers.cloudflare.com/cf/projects/cloudflare-config/) when upgrading them.

HTML uses `Cache-Control: no-transform` to prevent edge-injected scripts, including an account's automatic analytics beacon. This keeps the self-only script policy intact without changing settings for other sites in the zone. See Cloudflare's [Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/#my-website-is-proxied-through-cloudflare-but-web-analytics-automatic-setup-is-not-working).

### Other static hosts

On Cloudflare Pages, use `bun run build` as the build command and `dist` as the output directory. On Netlify, the included `netlify.toml` provides the same settings. Use Bun 1.4.4.

Other static hosts can serve the same output. Apply equivalent security and cache headers from `public/_headers` if the host does not recognize that file. Hashed assets can be cached for a year; HTML should revalidate. Font files have a shorter cache lifetime because their filenames are stable.

For a GitHub Pages project, build with its repository prefix:

```sh
BASE_PATH=/repo-thumb/ bun run build
```

The UI, fonts, favicon, and source download honor that prefix. Use `/` for a domain-root deployment. The included CI validates the application; it does not automatically publish it or grant write permissions.

## Browser support

The editor targets modern browsers with Canvas 2D, FontFace, and canvas letter spacing. The automated UI suite runs Chromium at desktop and mobile sizes. These are browser viewport checks, not tests on physical phones. Artwork font rendering may differ between browser engines and operating systems.
