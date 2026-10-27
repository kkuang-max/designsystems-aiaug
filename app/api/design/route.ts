import { anthropic } from "@ai-sdk/anthropic";
import { APICallError, generateText, Output } from "ai";
import { directionSchema, isGeneratedDirection, isLocks, isVibes } from "@/lib/design-generation";
import { isDesignSystem, mergeUnlocked } from "@/lib/design-system";

export const runtime = "nodejs";
export const maxDuration = 60;

// Configuration check only; opening the studio never invokes the model.
export async function GET() {
  return Response.json({ configured: !!process.env.ANTHROPIC_API_KEY?.trim() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return Response.json({ error: "The design brief is too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "Send a valid JSON design brief." }, { status: 400 }); }
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 4000 || !isDesignSystem(body.system) || !isVibes(body.vibes) || !isLocks(body.locks)) {
    return Response.json({ error: "Enter a vibe of up to 4,000 characters and valid studio options." }, { status: 400 });
  }
  if (!Object.values(body.locks).some(locked => !locked)) return Response.json({ error: "Unlock at least one token category before generating." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return Response.json({ error: "AI isn’t configured. Add ANTHROPIC_API_KEY to .env.local and restart the server, or use Local mode." }, { status: 503 });
  try {
    const { output } = await generateText({
      model: anthropic(process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"),
      output: Output.object({ schema: directionSchema }),
      instructions: "You are a UX/UI design-system art director. Translate the user's specific vibe into one coherent, distinctive design direction using ONLY the fonts, colors, numeric ranges, depth and easing options in the schema. Supply a short name and a concise description explaining the visible choices. Use the current system and vibe sliders as context; the brief takes priority for unlocked categories. Preserve locked categories. All colors must be six-digit hex codes. Favor readable text and useful contrast, but do not claim accessibility compliance; the studio calculates contrast. Do not output code, external fonts, or unsupported components.",
      prompt: JSON.stringify({ brief: body.prompt.trim(), currentSystem: body.system, vibeSliders: body.vibes, lockedCategories: body.locks }),
      maxOutputTokens: 1800,
      maxRetries: 0,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]),
      providerOptions: { anthropic: { thinking: { type: "disabled" } } },
    });
    if (!isGeneratedDirection(output)) return Response.json({ error: "AI returned unsupported options. Your current design is unchanged. Try a more specific brief." }, { status: 502 });
    return Response.json({ system: mergeUnlocked(body.system, output.system, body.locks), vibes: output.vibes });
  } catch (error) {
    if (APICallError.isInstance(error)) {
      const status = error.statusCode;
      if (status === 401 || status === 403) return Response.json({ error: "The AI key could not authenticate. Check its permissions, or use Local mode." }, { status: 502 });
      if (status === 429) return Response.json({ error: "AI is busy or your usage limit was reached. Try later, or use Local mode." }, { status: 429 });
      if (status === 400 || status === 402) return Response.json({ error: "The provider rejected the request. Check API credits and ANTHROPIC_MODEL access, or use Local mode." }, { status: 502 });
    }
    return Response.json({ error: "AI couldn’t finish this direction. Your current design is unchanged. Try again, or use Local mode." }, { status: 502 });
  }
}
