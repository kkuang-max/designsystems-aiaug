export const colorRoles = ["primary", "secondary", "background", "surface", "text", "muted"] as const;
export type ColorRole = typeof colorRoles[number];
export const displayFonts = ["Fraunces", "DM Sans", "Geist", "Georgia", "Geist Mono"] as const;
export const bodyFonts = ["DM Sans", "Geist", "Georgia", "Geist Mono"] as const;
export type Group = "color" | "typography" | "shape" | "motion";
export type Locks = Record<Group, boolean>;
export type Vibes = { warmth: number; density: number; contrast: number; playfulness: number; tactility: number };
export type DesignSystem = {
  name: string;
  description: string;
  colors: Record<ColorRole, string>;
  displayFont: string;
  bodyFont: string;
  typeScale: number;
  tracking: number;
  radius: number;
  border: number;
  spacing: number;
  depth: "flat" | "soft" | "offset" | "glass";
  duration: number;
  easing: "ease-out" | "spring" | "linear";
  hoverScale: number;
};
export type Snapshot = { id: string; name: string; system: DesignSystem; created: string };
export const initialVibes: Vibes = { warmth: 72, density: 30, contrast: 65, playfulness: 28, tactility: 55 };
export const initialSystem: DesignSystem = {
  name: "Quiet earth", description: "Warm, considered, and a little imperfect. A starting point for something uniquely yours.",
  colors: { primary: "#A4472F", secondary: "#D9C8B5", background: "#F5F0E8", surface: "#FFFCF7", text: "#302821", muted: "#75675D" },
  displayFont: "Fraunces", bodyFont: "DM Sans", typeScale: 1.25, tracking: -0.025,
  radius: 10, border: 1, spacing: 24, depth: "soft", duration: 240, easing: "ease-out", hoverScale: 1.02,
};
export function isDesignSystem(value: unknown): value is DesignSystem {
  if (!value || typeof value !== "object") return false;
  const d = value as DesignSystem;
  const range = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  return typeof d.name === "string" && d.name.length > 0 && d.name.length <= 80 && typeof d.description === "string" && d.description.length <= 600
    && !!d.colors && colorRoles.every(k => typeof d.colors[k] === "string" && /^#[\da-f]{6}$/i.test(d.colors[k]))
    && (displayFonts as readonly string[]).includes(d.displayFont) && (bodyFonts as readonly string[]).includes(d.bodyFont)
    && range(d.typeScale, 1.05, 1.6) && range(d.tracking, -0.08, 0.1) && range(d.radius, 0, 32)
    && range(d.border, 0, 4) && range(d.spacing, 12, 40) && ["flat", "soft", "offset", "glass"].includes(d.depth)
    && range(d.duration, 80, 800) && ["ease-out", "spring", "linear"].includes(d.easing) && range(d.hoverScale, 1, 1.08);
}
export function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function inkOn(background: string) { return contrast("#FFFFFF", background) >= contrast("#181818", background) ? "#FFFFFF" : "#181818"; }
export function fixContrast(foreground: string, background: string, target = 4.5) {
  if (contrast(foreground, background) >= target) return foreground;
  const endpoint = inkOn(background);
  for (let step = 1; step <= 100; step++) {
    const mixed = `#${[1, 3, 5].map(i => Math.round(parseInt(foreground.slice(i, i + 2), 16) * (1 - step / 100) + parseInt(endpoint.slice(i, i + 2), 16) * step / 100).toString(16).padStart(2, "0")).join("")}`;
    if (contrast(mixed, background) >= target) return mixed;
  }
  return endpoint;
}
export function paletteFor(v: Vibes, hue?: number): DesignSystem["colors"] {
  const h = hue ?? (v.warmth > 50 ? 12 + (v.warmth - 50) * 0.6 : 180 + (50 - v.warmth) * 1.5);
  const saturation = 25 + v.playfulness * 0.48;
  return {
    primary: hslToHex(h, saturation, 44 - v.contrast * 0.1),
    secondary: hslToHex((h + 28) % 360, 22 + v.playfulness * 0.2, 82),
    background: hslToHex(h, 20 + v.warmth * 0.15, 96),
    surface: hslToHex(h, 22, 99),
    text: hslToHex(h, 18, 26 - v.contrast * 0.13),
    muted: hslToHex(h, 10, 48 - v.contrast * 0.08),
  };
}
export function applyVibes(current: DesignSystem, v: Vibes, locks: Locks): DesignSystem {
  return {
    ...current,
    ...(!locks.color && { colors: paletteFor(v) }),
    ...(!locks.typography && { displayFont: v.playfulness > 70 ? "Geist Mono" : v.warmth > 55 ? "Fraunces" : "Geist", typeScale: +(1.12 + (100 - v.density) * 0.002).toFixed(2) }),
    ...(!locks.shape && { radius: Math.round(v.playfulness * 0.28), spacing: Math.round(40 - v.density * 0.28), depth: v.tactility > 75 ? "offset" : v.tactility > 25 ? "soft" : "flat" }),
    ...(!locks.motion && { duration: Math.round(120 + v.playfulness * 3), easing: v.playfulness > 60 ? "spring" : "ease-out" }),
  };
}
export function rollSystem(current: DesignSystem, v: Vibes, locks: Locks): DesignSystem {
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  return {
    ...current,
    ...(!locks.color && { colors: paletteFor({ ...v, playfulness: random(20, 90) }, random(0, 359)) }),
    ...(!locks.typography && { displayFont: displayFonts[random(0, displayFonts.length - 1)], bodyFont: bodyFonts[random(0, 1)], typeScale: random(115, 145) / 100, tracking: random(-4, 0) / 100 }),
    ...(!locks.shape && { radius: random(0, 28), border: random(0, 4) / 2, depth: (["flat", "soft", "offset", "glass"] as const)[random(0, 3)] }),
    ...(!locks.motion && { duration: random(120, 500), hoverScale: random(100, 106) / 100, easing: (["ease-out", "spring", "linear"] as const)[random(0, 2)] }),
  };
}
export function mergeUnlocked(current: DesignSystem, next: DesignSystem, locks: Locks): DesignSystem {
  return { ...next,
    ...(locks.color && { colors: current.colors }),
    ...(locks.typography && { displayFont: current.displayFont, bodyFont: current.bodyFont, typeScale: current.typeScale, tracking: current.tracking }),
    ...(locks.shape && { radius: current.radius, border: current.border, spacing: current.spacing, depth: current.depth }),
    ...(locks.motion && { duration: current.duration, easing: current.easing, hoverScale: current.hoverScale }),
  };
}
export function exportSystem(d: DesignSystem, format: "css" | "json") {
  if (format === "json") return JSON.stringify({
    $description: d.description,
    color: Object.fromEntries(colorRoles.map(role => [role, { $type: "color", $value: { colorSpace: "srgb", components: [1, 3, 5].map(i => parseInt(d.colors[role].slice(i, i + 2), 16) / 255), alpha: 1, hex: d.colors[role] } }])),
    font: { display: { $type: "fontFamily", $value: d.displayFont }, body: { $type: "fontFamily", $value: d.bodyFont } },
    radius: { $type: "dimension", $value: { value: d.radius, unit: "px" } },
    border: { $type: "dimension", $value: { value: d.border, unit: "px" } },
    spacing: { $type: "dimension", $value: { value: d.spacing, unit: "px" } },
    duration: { $type: "duration", $value: { value: d.duration, unit: "ms" } },
    typeScale: { $type: "number", $value: d.typeScale }, tracking: { $type: "number", $value: d.tracking },
    hoverScale: { $type: "number", $value: d.hoverScale }, depth: { $type: "string", $value: d.depth },
    easing: { $type: "cubicBezier", $value: d.easing === "spring" ? [0.34, 1.56, 0.64, 1] : d.easing === "linear" ? [0, 0, 1, 1] : [0, 0, 0.58, 1] },
  }, null, 2);
  return `/* ${d.name.replaceAll("*/", "")} · VibeCraft */\n:root {\n${colorRoles.map(k => `  --color-${k}: ${d.colors[k]};`).join("\n")}\n  --color-on-primary: ${inkOn(d.colors.primary)};\n  --font-display: "${d.displayFont}", ${d.displayFont === "Fraunces" || d.displayFont === "Georgia" ? "serif" : "sans-serif"};\n  --font-body: "${d.bodyFont}", sans-serif;\n  --type-scale: ${d.typeScale};\n  --heading-tracking: ${d.tracking}em;\n  --radius: ${d.radius}px;\n  --border-width: ${d.border}px;\n  --spacing: ${d.spacing}px;\n  --shadow: ${shadowFor(d)};\n  --motion-duration: ${d.duration}ms;\n  --motion-easing: ${easingFor(d)};\n  --hover-scale: ${d.hoverScale};\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root { --motion-duration: 0ms; --hover-scale: 1; }\n}\n\n/* Load the selected font families separately. */`;
}
export function shadowFor(d: DesignSystem) {
  return d.depth === "flat" ? "none" : d.depth === "offset" ? `4px 4px 0 ${d.colors.text}30` : d.depth === "glass" ? "0 8px 32px #00000008" : "0 6px 18px #3028210b";
}
export function easingFor(d: DesignSystem) { return d.easing === "spring" ? "cubic-bezier(.34,1.56,.64,1)" : d.easing; }
export function darkSystem(d: DesignSystem): DesignSystem {
  return { ...d, colors: { ...d.colors, primary: fixContrast(d.colors.primary, "#201E1C", 4.5), background: "#201E1C", surface: "#2C2926", text: "#F5F0E8", muted: "#BBB1A6", secondary: "#4C433B" } };
}

export function explorePrompt(current: DesignSystem, prompt: string, v: Vibes, locks: Locks): { system: DesignSystem; vibes: Vibes } {
  const text = prompt.toLowerCase();
  const nextVibes = { ...v };
  const poles: [keyof Vibes, RegExp, RegExp][] = [
    ["warmth", /warm|earth|ceramic|organic|sun|clay/, /cool|icy|tech|digital|ocean/],
    ["density", /dense|compact|data|dashboard|utilitarian/, /airy|spacious|editorial|calm|quiet/],
    ["contrast", /bold|punchy|contrast|brutal|vivid/, /soft|pastel|gentle|muted/],
    ["playfulness", /playful|fun|expressive|quirky|energetic/, /minimal|precise|quiet|restrained|swiss/],
    ["tactility", /tactile|layered|ceramic|depth|physical/, /flat|crisp|clean|minimal/],
  ];
  for (const [key, high, low] of poles) { if (high.test(text)) nextVibes[key] = 80; if (low.test(text)) nextVibes[key] = 20; }
  let hash = 0;
  for (const char of text) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const warm = /warm|earth|clay|ceramic|sun/.test(text), cool = /cool|ocean|tech|icy/.test(text);
  const hue = /green|forest|moss/.test(text) ? 125 : /purple|lavender/.test(text) ? 275 : /pink|rose/.test(text) ? 338 : /blue|ocean/.test(text) ? 215 : warm ? 16 + Math.abs(hash % 20) : cool ? 195 + Math.abs(hash % 50) : Math.abs(hash % 360);
  const system = applyVibes(current, nextVibes, locks);
  if (!locks.color) system.colors = paletteFor(nextVibes, hue);
  system.name = prompt.trim().replace(/\s+/g, " ").slice(0, 48);
  system.description = "A local exploration of your words. Fine-tune the tokens below to make it your own.";
  return { system, vibes: nextVibes };
}
