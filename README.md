# HeyAspen Booking Widget

Drop-in reservation widget for restaurant websites. One `<script>` tag. Zero per-cover fees.

## Usage

```html
<script
  src="https://widget.heyaspen.ai/book.js"
  data-restaurant-id="YOUR_RESTAURANT_ID"
  data-restaurant-name="Your Restaurant Name"
  data-color="#6c63ff"
  data-label="Reserve a table"
></script>
```

The widget auto-injects a "Reserve a table" button wherever the script tag is placed.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-restaurant-id` | ✅ | MoveMatrix place ID |
| `data-restaurant-name` | ✅ | Displayed in the booking modal |
| `data-color` | — | Accent color (default: `#6c63ff`) |
| `data-label` | — | Button label (default: `Reserve a table`) |

## Features

- **Shadow DOM** — zero style conflicts with the host page
- **Fully responsive** — works on desktop, tablet, mobile
- **Multi-step flow** — date/party → time slots → contact → confirm
- **Live availability** — slots load in real-time from the portal API
- **SMS confirmation** — backend fires a Twilio text on booking
- **18KB minified** — no React, no dependencies

## Development

```bash
npm install
npm run build       # outputs dist/book.js
npm run typecheck   # TypeScript check
```

Open `demo.html` in a browser to preview (needs a local API or real restaurant ID).

## Deploy

Upload `dist/book.js` to a CDN (Cloudflare R2, S3, etc.) and update the `src` URL.
Recommended: `https://widget.heyaspen.ai/book.js`
