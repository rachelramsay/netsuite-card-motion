# NetSuite card grid — motion

The "When to move" card grid from Figma (`PDIwDi42eHKRFIH8tWHD7C`, node `1:5`), animated with plain CSS and a small script. No build step.

`options.html` is a picker for nine hover effects (lift, spotlight, border glow, trace, accent bar, icon accent, sheen and tilt), layered on the same cards. They live in `effects.css` and `effects.js`.

## Share with a password

The site uses a Cloudflare Worker to protect the options page and its assets with a shared password. Do not deploy this as a plain GitHub Pages site: static hosting does not run the Worker and cannot enforce the login gate.

1. Install Node.js and Wrangler, then authenticate with Cloudflare:

	```sh
	npx wrangler login
	```

2. From this repository, set the two secrets. Choose the shared password privately, and generate a separate signing secret:

	```sh
	npx wrangler secret put ACCESS_PASSWORD
	openssl rand -base64 32
	npx wrangler secret put SESSION_SECRET
	```

	Enter the generated value when Wrangler prompts for `SESSION_SECRET`. Never add either value to the repository.

3. Deploy and share the `*.workers.dev` URL Wrangler prints:

	```sh
	npx wrangler deploy
	```

Successful sign-in creates an HTTP-only, secure session cookie that expires after eight hours. `/logout` clears the session. If either secret is missing, the Worker fails closed rather than serving the page.

## Local preview

For an ungated local preview, serve the files over HTTP:

```sh
python3 -m http.server 8140
```

Then open `http://localhost:8140`. The icons are CSS masks, and Chrome blocks masks over `file://`.

The page must be served over http. The icons are CSS masks, and Chrome blocks masks over `file://`.

## Interaction

One card is active at a time (card 1 by default, as in the design). The active card moves with a mouse hover (after an 80ms intent delay), keyboard focus or a tap. An active card lifts to the hover surface and `shadow/md`, shrinks its icon from 44px to 32px, and reveals the body text and link.

## Motion (dial: Polish)

| Animation | Duration | Easing | Why |
| --- | --- | --- | --- |
| Details open (`grid-template-rows` 0fr → 1fr), icon 44 → 32 | 300ms in / 200ms out | standard | Movement inside the card. The exit is about 2/3 of the entrance. |
| Surface colour, md shadow (opacity of a pseudo-element) | 300ms / 200ms | decelerate in | The card answers the pointer. `box-shadow` itself is never animated. |
| Body + link fade, rising 4px | 225ms after a 75ms delay; 120ms out | decelerate | Follows the layout so the hierarchy reads; it leaves first. |
| Link arrow nudge, 3px | 150ms | decelerate | Hover/focus feedback on the link, gated to fine pointers. |

All of these are CSS transitions, so a reversal mid-animation reverses from wherever the card currently is. The values are starting points, so tune them by eye in `:root`.

**Reduced motion:** height and icon-size changes snap into place. The surface, shadow and body still crossfade, so the state change stays visible. JS drives no motion.

**A11y:** each title is a `button[aria-expanded]` whose hit area stretches across the card. Collapsed details are `inert`, and that flag lifts the moment a card activates, so the link can be used during the reveal. Hovering never collapses a card that holds keyboard focus.

## Open items

- Oracle Sans isn't bundled, so the page falls back to system-ui until the font files are added.
- The exported SVGs carry the components' default paint, so they're used unedited as masks filled with the token colour.
