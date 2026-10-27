import { jsonSchema } from "ai";
import { bodyFonts, colorRoles, displayFonts, isDesignSystem, type DesignSystem, type Locks, type Vibes } from "./design-system";

export type GeneratedDirection = { system: DesignSystem; vibes: Vibes };
export function isVibes(value: unknown): value is Vibes {
  if (!value || typeof value !== "object") return false;
  return ["warmth", "density", "contrast", "playfulness", "tactility"].every(key => {
    const n = (value as Record<string, unknown>)[key];
    return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
  });
}
export function isLocks(value: unknown): value is Locks {
  return !!value && typeof value === "object" && ["color", "typography", "shape", "motion"].every(key => typeof (value as Record<string, unknown>)[key] === "boolean");
}
export function isGeneratedDirection(value: unknown): value is GeneratedDirection {
  if (!value || typeof value !== "object") return false;
  const d = value as GeneratedDirection;
  return isDesignSystem(d.system) && isVibes(d.vibes);
}
const numeric = (minimum: number, maximum: number) => ({ type: "number" as const, minimum, maximum });
const properties = {
  name: { type: "string" as const, minLength: 1, maxLength: 80 },
  description: { type: "string" as const, maxLength: 600 },
  colors: { type: "object" as const, properties: Object.fromEntries(colorRoles.map(role => [role, { type: "string" as const, pattern: "^#[0-9a-fA-F]{6}$" }])), required: [...colorRoles], additionalProperties: false },
  displayFont: { type: "string" as const, enum: [...displayFonts] },
  bodyFont: { type: "string" as const, enum: [...bodyFonts] },
  typeScale: numeric(1.05, 1.6), tracking: numeric(-0.08, 0.1), radius: numeric(0, 32), border: numeric(0, 4), spacing: numeric(12, 40),
  depth: { type: "string" as const, enum: ["flat", "soft", "offset", "glass"] },
  duration: numeric(80, 800), hoverScale: numeric(1, 1.08),
  easing: { type: "string" as const, enum: ["ease-out", "spring", "linear"] },
};
export const directionSchema = jsonSchema<GeneratedDirection>({
  type: "object", additionalProperties: false, required: ["system", "vibes"],
  properties: {
    system: { type: "object", additionalProperties: false, required: Object.keys(properties), properties },
    vibes: { type: "object", additionalProperties: false, required: ["warmth", "density", "contrast", "playfulness", "tactility"], properties: { warmth: numeric(0, 100), density: numeric(0, 100), contrast: numeric(0, 100), playfulness: numeric(0, 100), tactility: numeric(0, 100) } },
  },
}, { validate: value => isGeneratedDirection(value) ? { success: true, value } : { success: false, error: new Error("Unsupported design tokens") } });
