"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { Icon } from "./studio-icon";

export type DesignReference = { image?: string; referenceUrl?: string };
export type ReferenceInputHandle = { upload: (file: File) => void };
export function DesignReferenceInput({ value, onChange, disabled, onReading, ref }: {
  ref?: Ref<ReferenceInputHandle>;
  value: DesignReference; onChange: (value: DesignReference) => void; disabled: boolean; onReading: (reading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  function upload(file?: File) {
    if (!file || disabled) return;
    const id = ++revision.current;
    setError(""); setReading(false); onReading(false);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2_500_000 || !file.size) {
      setError("Choose a PNG, JPG, or WebP under 2.5 MB."); return;
    }
    setReading(true); onReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (id !== revision.current) return;
      const data = String(reader.result);
      const image = new Image();
      image.onload = () => {
        if (id !== revision.current) return;
        onChange({ ...value, image: data }); setName(file.name || "Pasted image"); setReading(false); onReading(false);
      };
      image.onerror = () => {
        if (id !== revision.current) return;
        setError("This image couldn’t be opened. Try another file."); setReading(false); onReading(false);
      };
      image.src = data;
    };
    reader.onerror = () => { if (id === revision.current) { setError("Couldn’t read this image."); setReading(false); onReading(false); } };
    reader.readAsDataURL(file);
  }
  useImperativeHandle(ref, () => ({ upload }));
  async function pasteClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(type => ["image/png", "image/jpeg", "image/webp"].includes(type));
        if (type) { upload(new File([await item.getType(type)], "Pasted image", { type })); return; }
      }
      setError("No image found. Copy an image, then paste it here.");
    } catch { setError("Click the reference area and press ⌘V or Ctrl+V to paste an image, or upload a file."); }
  }
  return <fieldset className="design-reference" disabled={disabled}>
    <legend>Inspire the whole system <span>optional</span></legend>
    <div className={`design-reference-drop ${dragging ? "dragging" : ""}`} tabIndex={disabled ? -1 : 0} role="group" aria-label="Image reference. Paste or drop an image here."
      onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files[0]); }}>
      {value.image ? <div className="design-reference-preview">
        {/* Local data URLs are supplied by the user. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.image} alt="Design inspiration reference"/>
        <div><strong>{name || "Reference image"}</strong><span>Used for type, shape, spacing & mood</span></div>
        <button type="button" aria-label="Remove reference image" onClick={() => { revision.current++; onChange({ ...value, image: undefined }); setReading(false); onReading(false); setError(""); }}><Icon name="close" size={14}/></button>
      </div> : <p>Drop an image or paste it here</p>}
      <div className="design-reference-actions"><button type="button" className="button small" onClick={() => input.current?.click()}>{reading ? "Reading image…" : value.image ? "Replace image" : "Upload image"}</button><button type="button" className="text-button" onClick={pasteClipboard}>Paste image</button></div>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload design reference" onChange={event => { upload(event.target.files?.[0]); event.target.value = ""; }}/>
      <small>PNG, JPG, WebP · up to 2.5 MB</small>
    </div>
    <label className="design-reference-url">Reference link<input type="url" disabled={reading} maxLength={2000} placeholder="https://a-site-you-love.com" value={value.referenceUrl || ""} onChange={event => onChange({ ...value, referenceUrl: event.target.value || undefined })}/></label>
    <p>Links inspire content and mood. For visual details, attach a screenshot. References use AI mode.</p>
    {error && <p className="generation-error" role="alert">{error}</p>}
  </fieldset>;
}
