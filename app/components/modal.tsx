"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./studio-icon";

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`studio-modal ${wide ? "wide" : ""}`} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
