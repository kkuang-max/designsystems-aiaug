# VibeCraft Studio

A local design system workbench implementing **F · Hybrid**: the studio shell, guided vibe search, and lockable token cards.

```sh
npm install
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` and `npm start`.

## Explore a direction

1. Describe a feeling, or select a starter vibe. Search uses a local keyword engine; it does not call a model or require an API key.
2. Open the vibe continuum to adjust warmth, density, contrast, playfulness, and tactility.
3. Edit color, typography, shape, depth, and motion. Lock categories you want to keep, then roll the remaining categories.
4. Try marketing, dashboard, and checkout previews, including mobile and dark mode. Browse interactive component specimens.
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

The existing Claude API integration has been removed. This project has no model provider dependency.
