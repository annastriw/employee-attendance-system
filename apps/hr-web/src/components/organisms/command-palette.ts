import type { ReactNode } from "react";

export interface Command {
  id: string;
  label: string;
  /** Group heading, e.g. "Navigasi", "Tema", "Akun". */
  group: string;
  /** Extra terms to match against (synonyms, path, etc.). */
  keywords?: string;
  icon?: ReactNode;
  /** Short hint shown on the right (e.g. a shortcut or current state). */
  hint?: string;
  run: () => void;
}

/**
 * Case-insensitive subsequence match: every character of the query must appear
 * in order within the target. Cheap, dependency-free fuzzy matching good enough
 * for a short command list.
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = target.toLowerCase();
  let i = 0;
  for (const char of t) {
    if (char === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

/** Filters commands by label + keywords, preserving input order. */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;
  return commands.filter(
    (c) =>
      fuzzyMatch(query, c.label) ||
      (c.keywords ? fuzzyMatch(query, c.keywords) : false),
  );
}
