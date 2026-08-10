import type { SkillColour } from "./types";

/**
 * Raw CSS colour names (`red`, `yellow`, ...) are too saturated to read well
 * against the dark canvas, so each named colour maps to a stroke/fill/text
 * triplet tuned for contrast instead of using the literal CSS colour.
 */
export const COLOUR_STYLES: Record<
  SkillColour,
  { stroke: string; fill: string; text: string }
> = {
  red: { stroke: "#ef4444", fill: "#2a1414", text: "#fecaca" },
  yellow: { stroke: "#eab308", fill: "#2a2410", text: "#fef08a" },
  blue: { stroke: "#3b82f6", fill: "#141f2a", text: "#bfdbfe" },
  green: { stroke: "#22c55e", fill: "#142a1c", text: "#bbf7d0" },
  orange: { stroke: "#f97316", fill: "#2a1d10", text: "#fed7aa" },
  white: { stroke: "#d4d4d8", fill: "#1e2227", text: "#ededea" },
};

/** What each colour represents, shown in the legend instead of the raw colour name. */
export const COLOUR_LABELS: Record<SkillColour, string> = {
  red: "Push",
  yellow: "Pull",
  blue: "Core",
  white: "Legs",
  orange: "Push + Pull",
  green: "Pull + Core",
};

const VALID_COLOURS = new Set<SkillColour>([
  "red",
  "yellow",
  "blue",
  "green",
  "orange",
  "white",
]);

/** Falls back to "white" for missing/unrecognized values instead of throwing. */
export function normalizeColour(value: unknown): SkillColour {
  const lowered = typeof value === "string" ? value.trim().toLowerCase() : "";
  return VALID_COLOURS.has(lowered as SkillColour)
    ? (lowered as SkillColour)
    : "white";
}
