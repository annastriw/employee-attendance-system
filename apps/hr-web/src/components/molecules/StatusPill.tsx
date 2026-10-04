import { PILL_TONE_CLASS, type PillTone } from "./status-pill";

export type { PillTone } from "./status-pill";

/**
 * Generic status pill (dot + label) used across HR list rows so every status
 * reads with the same shape and the single accent. Pass a `tone` and `label`;
 * the tone helpers live in ./status-pill.
 */
export function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  return (
    <span className={`status-badge ${PILL_TONE_CLASS[tone]}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
