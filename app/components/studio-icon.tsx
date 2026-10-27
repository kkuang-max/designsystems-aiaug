import type { CSSProperties } from "react";

export function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    edit: <><path d="m15 4 5 5M4 20l4-1L21 6l-5-5L3 14Z"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z"/></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    down: <path d="m6 9 6 6 6-6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    unlock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></>,
    roll: <><path d="m3 5 3 0 12 14h3m-5 0h5v-5M3 19h3l4-5m4-4 4-5h3m-5 0h5v5"/></>,
    export: <><path d="M12 15V3m-4 4 4-4 4 4M5 14v6h14v-6"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    undo: <><path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12"/></>,
    redo: <><path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/></>,
    desktop: <><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-5 0h10"/></>,
    mobile: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></>,
    moon: <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/></>,
    heart: <path d="M12 21 3.5 12a5 5 0 0 1 8.5-5 5 5 0 0 1 8.5 5Z"/>,
    bag: <><path d="M5 7h14l2 14H3Zm4 0V5a3 3 0 0 1 6 0v2"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>,
    compare: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    play: <path d="m8 4 12 8-12 8Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name] || paths.sparkle}</svg>;
}
