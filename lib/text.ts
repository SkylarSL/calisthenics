/**
 * Capitalizes the first letter of each word without altering the rest of
 * the word's casing — so "one arm pullups" -> "One Arm Pullups", but an
 * already-intentional casing like "V-Sit" or "L-Sit" isn't stomped on by
 * forcing the remainder of each word to lowercase.
 */
export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}
