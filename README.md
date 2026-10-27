# VibeCraft Studio

A local design system workbench implementing **F · Hybrid**: the studio shell, guided vibe search, and lockable token cards.

```sh
npm install
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` and `npm start`.

## Explore a direction

1. Describe a feeling, or select a starter vibe. Choose AI to generate a direction from your brief using the configured server key, or Local for a keyword-based direction with no API credits. Only clicking Generate with AI sends a model request.
2. Open the vibe continuum to adjust warmth, density, contrast, playfulness, and tactility.
3. Edit color, typography, shape, depth, and motion. Lock categories you want to keep, then roll the remaining categories.
4. Try marketing, dashboard, and checkout previews, including mobile and dark mode. Browse the scrollable interactive component specimens. Open Microinteractions for a dedicated motion workspace with shared duration, easing, and hover-scale tokens; Quiet, Expressive, and Direct presets; slower playback; and reduced-motion preview. Six local demos cover hover/press, travel, disclosure, loading/success, toggles, and entrances.
5. Review calculated color contrast, adjust failing colors, and preview color vision simulations or reduced motion.
6. Save snapshots, compare them with your current direction, or export CSS variables and Design Tokens JSON.
7. Open Moodboard to collect images, source links, and notes. Filter or search references, edit them, and use their written notes to explore a direction. Images serve as visual references; the local engine does not analyze image content.

Moodboards save separately in browser storage, with up to 30 references and a total serialized size of 2.5 MB. Uploaded PNG, JPEG, WebP, and GIF files can be up to 600 KB each. Save board downloads a JSON copy including uploaded images; remote image links require network access to display.

The current direction, locks, vibe settings, and up to 20 snapshots are saved in browser storage. Export a copy for use elsewhere. Fonts are served locally; load the selected font families in the destination project when using exported tokens.

Contrast checks cover selected text/background combinations. Color vision simulations are approximate. Preview dark mode derives a palette from the light tokens; export currently exports the light system.

## Product questions to explore next

- **Audience and context:** Who uses the product, what are they trying to do, and how should they feel afterward?
- **Personality:** Should a brand feel established or experimental, expressive or restrained, familiar or distinctive?
- **Controlled variation:** Would comparing three directions with one fixed attribute make choosing easier?
- **References:** Would a personal moodboard help connect abstract words with visual examples?
- **Handoff:** Should a saved direction include a short explanation of why the choices fit the brief?

## AI setup and verification

The server reads `ANTHROPIC_API_KEY` from `.env.local`. The key is never sent to the browser. `ANTHROPIC_MODEL` optionally overrides the default `claude-haiku-5-5` model. Restart the dev server after changing environment variables. AI generation uses structured output restricted to the fonts, token ranges, and styles supported by the studio; locked categories are preserved. Automatic retries are disabled.

Opening the studio only checks whether a key is configured; it does not validate the key with the provider or generate anything. Presets, sliders, rolls, moodboard exploration, and layout changes run locally. Clicking Generate with AI uses API credits. Cancelling a request that has already been sent may still use credits.

Submit the vibe field with Enter (Shift + Enter adds a line). In AI mode, this calls Claude with your brief, current tokens, vibe sliders, and category locks. The returned tokens update the existing preview components; this search styles the supported components rather than generating arbitrary application code.

Run `node --test tests/design-generation.test.mjs` for mocked API tests that never contact a model. Build with `npm run build -- --webpack` if the environment blocks Turbopack’s local worker ports.

The header and tools occupy a fixed viewport shell; the main canvas scrolls. Token editors and vibe sliders open in dialogs so expanded controls do not push the menu down. On small screens, the Tools button opens the menu over the canvas.
