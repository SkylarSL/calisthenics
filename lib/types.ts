export type SkillColour = "red" | "yellow" | "blue" | "green" | "orange" | "white";

export interface SkillNodeInput {
  exercise: string;
  prerequisites: string[]; // exercise names, must match another node's `exercise`
  progressions: string[]; // exercise names, must match another node's `exercise`
  colour?: SkillColour; // one of: red, yellow, blue, green, orange, white. Defaults to "white" if omitted/unrecognized.
  description?: string; // short paragraph shown in the prerequisites sidebar. Defaults to "" if omitted.
}

export interface SkillNode {
  id: string; // slugified exercise name, used as the graph key
  exercise: string; // display name
  prerequisites: string[]; // ids
  progressions: string[]; // ids
  colour: SkillColour;
  description: string;
}
