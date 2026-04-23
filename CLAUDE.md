# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudflareSub is a Cloudflare Worker that serves as a lightweight subscription manager for proxy nodes (vmess, vless, trojan). It takes node links and preferred IP endpoints, then generates subscription outputs in multiple formats (Raw/Base64, Clash YAML, Surge, Shadowrocket) via fixed subscription URLs.

## Development Commands

```bash
# Start local dev server (wrangler dev)
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Run smoke tests (Node.js, no Wrangler needed)
npm run check
```

There is no build step, bundler, or TypeScript. The Worker runs `src/worker.js` directly and serves static assets from `public/` via the Workers Assets binding.

## Architecture

### Request Routing (`src/worker.js`)

The Worker handles all requests in a single `fetch` handler with manual path-based routing:

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/login` | Auth | Validates `AUTHOR_NAME` + `ADMIN_PASSWORD`, returns `SUB_ACCESS_TOKEN` |
| `GET /api/subscription` | Read | Returns current config, counts, preview, and fixed ID |
| `POST /api/update-subscription` | Write | Parses nodes + endpoints, renders outputs, saves to KV |
| `POST /api/update-url` | Write | Rotates the fixed subscription ID (invalidates old URL) |
| `GET /sub/:id` | Read | Serves rendered subscription by target format (`raw`/`clash`/`surge`) |
| `/*` | Any | Falls through to static assets (`public/index.html`, etc.) |

### KV Storage Schema

The `SUB_STORE` KV namespace stores three keys:

- `sub:data` — Raw user config (`nodeLinks`, `preferredIps`, `namePrefix`, `keepOriginalHost`)
- `sub:fixed-id` — The current short ID for the subscription URL
- `sub:${id}` — The pre-rendered payload (`{ version, updatedAt, options, nodes }`) for a given ID

### Code Split: Worker vs. Core

**`src/worker.js`** contains inline, self-contained parse/render/encode functions. This is the actual production runtime.

**`src/core.js`** exports a parallel set of parsing/rendering utilities with a more elaborate API (e.g., `parseNodeLinks`, `expandNodes`, `renderClashSubscription`, AES-GCM encryption helpers). It is **only consumed by `tests/smoke.mjs`** and is not imported by the Worker. The two files have overlapping but divergent logic. If you modify parsing or rendering behavior, you may need to update both files, or consolidate them.

### Environment Variables

Required secrets/variables in the Cloudflare Worker environment:

- `AUTHOR_NAME` — Admin login username
- `ADMIN_PASSWORD` — Admin login password (Secret)
- `SUB_ACCESS_TOKEN` — Token protecting subscription links (Secret). If unset, subscription links are unprotected.

### Frontend

The admin UI is vanilla JS/CSS in `public/` (`index.html`, `styles.css`, `app.js`). It communicates with the API routes above. The UI includes login, config form, subscription link tabs (Auto/V2rayN/Clash/Shadowrocket/Surge), node preview table, stats panel, and toast notifications.

## Testing

The only test file is `tests/smoke.mjs`. It imports from `src/core.js` and exercises node parsing, endpoint parsing, node expansion, rendering for all formats, and AES-GCM payload encryption/decryption. Run it with `npm run check`.
