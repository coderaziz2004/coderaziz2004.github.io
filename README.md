# Degla — Website

The Degla marketing site: a single-page, fully static website (hand-written
HTML, CSS and vanilla JavaScript — no build step, no framework, no dependencies
to install). It runs anywhere that can serve static files.

---

## Quick start (view it locally)

The site must be served over HTTP (opening `index.html` directly with `file://`
will not work, because it loads the map/orb as iframes). Any static server works:

```bash
# Python 3 (built into macOS / most Linux)
python3 -m http.server 8000

# …or Node
npx serve .
```

Then open <http://localhost:8000>.

> Note: Python's dev server doesn't stream video Range requests, so the hero
> video may not play under `python3 -m http.server`. It plays fine on any real
> host (Vercel, Netlify, nginx, Apache, S3/CloudFront…). Use `npx serve` if you
> want the video to play locally.

## Deploy

It's static, so deployment is "upload the folder":

- **Vercel / Netlify / Cloudflare Pages** — drag-and-drop this folder, or point
  the project at it. No build command, no output directory; it's already built.
- **Any web host / S3 / nginx / Apache** — copy the contents of this folder to
  your web root. `index.html` is the entry point.

---

## Before you go live — one find-and-replace

Social-share previews (Facebook, LinkedIn, X, iMessage…) need your real domain.
In **`index.html`**, replace the placeholder `YOUR-DOMAIN.com` with your domain
(3 occurrences: `og:url`, `og:image`, `twitter:image`).

## Contact form

The "Request early access" form has **no backend** — on submit it opens the
visitor's email client with a pre-filled message to **`ceo@deglai.ai`**. To
change the recipient, search-and-replace `ceo@deglai.ai` across `index.html`
and `js/main.js`.

If you'd rather collect submissions silently (no mail-client pop-up), point the
form at a form service (Formspree, Basin) or a serverless function — the submit
handler lives in `js/main.js` (search for `contactForm`).

---

## Project structure

```
index.html            The page — all content and copy live here
robots.txt            Crawler rules (allows search engines; blocks AI scrapers)
favicon.ico/.svg, apple-touch-icon.png

css/styles.css        All styles (CSS custom properties at the top = the design tokens)
js/main.js            All interactions (hero video, the mission IDE, live fleet feed,
                      typewriter, contact form)

fonts/                Geist + Geist Mono (self-hosted .woff2)
video/hero.mp4        Hero background video
img/                  Logo + social-share (OG) image

vendor/               three.js + OrbitControls (power the 3-D map & orb)
map/                  The live mission map (WebGL) — loaded in an iframe
orb/                  The voice orb (WebGL) — loaded in an iframe
```

## Editing content

- **Text & copy:** `index.html`.
- **Colors, spacing, fonts:** the `:root { --… }` custom properties at the top of
  `css/styles.css` drive the whole design.
- **Animations & behavior:** `js/main.js` (each feature is a clearly-commented
  block).

## Licenses / credits

- **Geist & Geist Mono** — SIL Open Font License 1.1 (free to use & embed).
- **three.js** — MIT License.
- Site code & design: delivered to the buyer with this handoff.

## Browser support

Current Chrome, Safari, Firefox and Edge (desktop + mobile). The 3-D map and orb
require WebGL, which all of the above support; if WebGL is unavailable the rest
of the page still works.
