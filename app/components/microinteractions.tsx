"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { type DesignSystem } from "@/lib/design-system";
import { Icon } from "./studio-icon";
import { themeStyle } from "./preview";

type MotionTokens = Pick<DesignSystem, "duration" | "easing" | "hoverScale">;
const presets: { name: string; tokens: MotionTokens }[] = [
  { name: "Quiet", tokens: { duration: 160, easing: "ease-out", hoverScale: 1.01 } },
  { name: "Expressive", tokens: { duration: 320, easing: "spring", hoverScale: 1.04 } },
  { name: "Direct", tokens: { duration: 120, easing: "linear", hoverScale: 1 } },
];

export function Microinteractions({ system, reducedMotion, onReducedMotion, onChange }: {
  system: DesignSystem;
  reducedMotion: boolean;
  onReducedMotion: (value: boolean) => void;
  onChange: (tokens: Partial<MotionTokens>) => void;
}) {
  const [speed, setSpeed] = useState(1);
  const [saved, setSaved] = useState(false);
  const [moved, setMoved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [submission, setSubmission] = useState<"idle" | "saving" | "saved">("idle");
  const [entrance, setEntrance] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function submit() {
    if (timer.current) clearTimeout(timer.current);
    setSubmission("saving");
    timer.current = setTimeout(() => { setSubmission("saved"); timer.current = null; }, Math.max(700, system.duration / speed * 3));
  }
  function replay() {
    setMoved(value => !value);
    setEntrance(value => value + 1);
  }
  const style = { ...themeStyle(system), "--p-duration": `${system.duration / speed}ms` } as CSSProperties;
  return <div className={`preview-surface motion-surface ${reducedMotion ? "reduce-motion" : ""}`} style={style}>
    <header className="motion-heading"><div><span className="sample-eyebrow">THE FEELING BETWEEN STATES</span><h1>Small moments.<br/><em>A whole personality.</em></h1><p>Explore how your system responds, moves, and reassures. Try each example with a mouse, touch, or keyboard.</p></div><button className="sample-secondary" onClick={replay}><Icon name="play" size={14}/> Replay motion</button></header>

    <section className="motion-settings" aria-labelledby="motion-settings-title">
      <div className="motion-settings-heading"><div><h2 id="motion-settings-title">Your motion language</h2><p>These tokens are shared with your previews and exports.</p></div><div className="motion-presets" aria-label="Motion presets">{presets.map(preset => <button key={preset.name} aria-pressed={Object.entries(preset.tokens).every(([key, value]) => system[key as keyof MotionTokens] === value)} className="sample-secondary" onClick={() => onChange(preset.tokens)}>{preset.name}</button>)}</div></div>
      <div className="motion-token-controls">
        <label>Duration <output>{system.duration} ms</output><input aria-label="Motion duration" type="range" min={80} max={800} step={10} value={system.duration} onChange={event => onChange({ duration: +event.target.value })}/></label>
        <label>Easing<select aria-label="Motion easing" value={system.easing} onChange={event => onChange({ easing: event.target.value as MotionTokens["easing"] })}><option value="ease-out">Ease out · settle gently</option><option value="spring">Spring · a little bounce</option><option value="linear">Linear · steady pace</option></select></label>
        <label>Hover scale <output>{system.hoverScale.toFixed(2)}×</output><input aria-label="Motion hover scale" type="range" min={1} max={1.08} step={0.01} value={system.hoverScale} onChange={event => onChange({ hoverScale: +event.target.value })}/></label>
      </div>
      <div className="motion-playback"><label>Playback speed<select aria-label="Motion playback speed" value={speed} onChange={event => setSpeed(+event.target.value)}><option value={0.5}>0.5× · slow down</option><option value={1}>1× · actual speed</option><option value={2}>2× · speed up</option></select></label><label className="sample-checkbox"><input type="checkbox" checked={reducedMotion} onChange={event => onReducedMotion(event.target.checked)}/> Reduce motion</label><small>Your device’s reduced-motion preference is always respected. Playback speed only changes this playground.</small></div>
    </section>

    <div className="motion-examples">
      <section className="specimen"><span className="specimen-label">01 / HOVER, PRESS & SAVE</span><h2>Make an action feel responsive.</h2><p>Hover or focus, press, then release. A saved state gives the action a clear ending.</p><div className="motion-demo-stage"><button className={`sample-primary motion-save ${saved ? "is-saved" : ""}`} aria-pressed={saved} onClick={() => setSaved(!saved)}><Icon name={saved ? "check" : "heart"} size={17}/>{saved ? "Saved to collection" : "Save to collection"}</button></div><div className="motion-behavior"><span>Trigger: hover / focus / click</span><span>Scale + color + confirmation</span></div></section>
      <section className="specimen"><span className="specimen-label">02 / EASING & TRAVEL</span><h2>The journey has a character.</h2><p>Watch how your easing changes the start, travel, and landing of the same movement.</p><div className="motion-demo-stage"><div className={`motion-track ${moved ? "at-end" : ""}`} aria-label={moved ? "Object at end of track" : "Object at start of track"}><span className="motion-orb"/></div></div><div className="motion-behavior"><button className="sample-text-button" onClick={() => setMoved(!moved)}><Icon name="play" size={13}/> {moved ? "Play back" : "Play transition"}</button><span>{system.easing} · {system.duration} ms</span></div></section>
      <section className="specimen"><span className="specimen-label">03 / DISCLOSURE & LAYOUT</span><h2>Reveal, without a jump.</h2><p>Keep the relationship between a trigger and its content clear as the layout changes.</p><div className="motion-demo-stage motion-disclosure-stage"><div className="motion-disclosure"><button aria-expanded={expanded} aria-controls="motion-details" onClick={() => setExpanded(!expanded)}><span>A little more detail</span><Icon name="down" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}/></button><div id="motion-details" className={`motion-disclosure-content ${expanded ? "open" : ""}`} inert={!expanded}><div><p>Thoughtful transitions help people follow what changed, without pulling them away from their task.</p></div></div></div></div><div className="motion-behavior"><span>Trigger: expand / collapse</span><span>Height + rotation</span></div></section>
      <section className="specimen"><span className="specimen-label">04 / LOADING & SUCCESS</span><h2>Keep people in the loop.</h2><p>An immediate response, a busy state, and a clear confirmation make waiting easier.</p><div className="motion-demo-stage motion-feedback"><button className="sample-primary" disabled={submission === "saving"} onClick={submit}>{submission === "saving" ? <><span className="motion-spinner"/> Saving…</> : submission === "saved" ? <><Icon name="check" size={15}/> Save again</> : <>Save changes <Icon name="arrow" size={15}/></>}</button><span role="status">{submission === "saving" ? "Saving your sample changes…" : submission === "saved" ? "All changes saved. This is a local demo." : "Ready when you are."}</span></div><div className="motion-behavior"><span>Trigger: submit</span><span>Idle → busy → success</span></div></section>
      <section className="specimen"><span className="specimen-label">05 / STATE CHANGES</span><h2>A small, deliberate switch.</h2><p>Movement reinforces the state; the label and semantics communicate it too.</p><div className="motion-demo-stage"><label className="motion-toggle-row"><span>Collection updates<small>{notifications ? "Notifications on" : "Notifications off"}</small></span><button className={`sample-switch ${notifications ? "on" : ""}`} role="switch" aria-checked={notifications} aria-label="Collection updates" onClick={() => setNotifications(!notifications)}><span/></button></label></div><div className="motion-behavior"><span>Trigger: toggle</span><span>Position + background</span></div></section>
      <section className="specimen"><span className="specimen-label">06 / ENTRANCE & ATTENTION</span><h2>Arrive with a little care.</h2><p>Use a brief entrance to draw attention to new feedback, then let it settle.</p><div className="motion-demo-stage"><div key={entrance} className="motion-notification"><span className="motion-notification-icon"><Icon name="check" size={17}/></span><div><strong>A good direction, saved.</strong><span>Your next idea has a starting point.</span></div></div></div><div className="motion-behavior"><button className="sample-text-button" onClick={() => setEntrance(entrance + 1)}><Icon name="play" size={13}/> Replay entrance</button><span>Opacity + short travel</span></div></section>
    </div>
    <aside className="motion-guidance"><Icon name="info" size={18}/><div><h2>Start with the purpose.</h2><p>What triggers this? What changes? How does someone know it finished? Keep essential feedback visible when motion is reduced, and use the same rhythm for similar actions.</p></div></aside>
  </div>;
}
