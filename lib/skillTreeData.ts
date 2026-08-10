import { SkillNode, SkillNodeInput } from "./types";
import { normalizeColour } from "./colors";

export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Turns author-friendly input (plain exercise name strings) into a graph
 * keyed by stable ids. This is the only place slugs get generated, so the
 * rest of the app never has to worry about matching strings by hand.
 */
export function buildSkillTree(raw: SkillNodeInput[]): SkillNode[] {
  return raw.map((node) => ({
    id: slugify(node.exercise),
    exercise: node.exercise,
    prerequisites: node.prerequisites.map(slugify),
    progressions: node.progressions.map(slugify),
    colour: normalizeColour(node.colour),
    description: node.description?.trim() ?? "",
  }));
}

// Full calisthenics skill tree, generated from data.txt. `colour` and
// `description` are optional per-node; colour falls back to "white" and
// description falls back to an empty string if omitted.
//
// Two small corrections were made versus the raw source file so every
// progression edge resolves to a real node instead of silently vanishing:
//   - "laying leg raise progessions" -> "laying leg raise progressions"
//     (typo in the exercise name itself and in "L Sit"'s prerequisites list)
//   - In "Sitting Leg Raise Progressions"'s progressions list, a stray
//     " sit" entry (no matching node) was corrected to "L Sit" -- it
//     mirrors "Hanging Leg Raise Progressions" -> [L Sit, Toes To Bar] and
//     was almost certainly meant to say "L Sit".
// If either guess was wrong, just edit the relevant entries below.
const rawSkillTree: SkillNodeInput[] = [
  {
    exercise: "Row",
    prerequisites: [],
    progressions: ["Inverted Row"],
    colour: "yellow",
    description:
      "The row is the beginning for any pulling exercise. It's easily scalable and trains grip, back and scapular retraction. Use rings, 2 chairs and a stick, or a chair and heavy household items.",
  },
  {
    exercise: "Pullup",
    prerequisites: ["Inverted Row"],
    progressions: ["Weighted Pullup", "One Arm Pullup Progressions", "Front Lever Row Progressions", "Front Lever Raise Progressions", "Front Lever Progressions", "Explosive Pullup", "Dragon Flag Progressions"],
    colour: "yellow",
    description:
      "The classic exercise that proves you have a strong foundation. On their own they build a great back and work practically every back muscle. There are many ways to progress after learning this exercise.",
  },
  {
    exercise: "Weighted Pullup",
    prerequisites: ["Pullup"],
    progressions: ["One Arm Pullup", "Front Lever", "Muscle Up"],
    colour: "yellow",
    description:
      "Probably the best and most quantifiable way to build pulling strength. This strength can also carryover to many pulling skills such as the front lever or one arm pullup. These will also take your back gains to the next level.",
  },
  {
    exercise: "One Arm Pullup Progressions",
    prerequisites: ["Pullup"],
    progressions: ["One Arm Pullup"],
    colour: "yellow",
    description:
      "One arm pullup progressions are often overlooked. But they're a great way to build unilateral pulling strength and fix any imbalances. Plus they can come in clutch if you don't have weights for weighted variations. Ex. band assisted one arm pullup, pulley assisted one arm pullup, finger assisted one arm pullup",
  },
  {
    exercise: "One Arm Pullup",
    prerequisites: ["Weighted Pullup", "One Arm Pullup Progressions"],
    progressions: ["Weighted One Arm Pullup"],
    colour: "yellow",
    description:
      "The pinnicle of pulling strength. The only way up from here is to increase reps or increase weight.",
  },
  {
    exercise: "Front Lever",
    prerequisites: ["Weighted Pullup", "Front Lever Row Progressions", "Front Lever Raise Progressions", "Front Lever Progressions"],
    progressions: [],
    colour: "green",
    description:
      "The pinnicle of static static strength for pull. Proof of strong straight arm strength. You can turn these into dynamic movements as well.",
  },
  {
    exercise: "Muscle Up",
    prerequisites: ["Explosive Pullup", "Weighted Pullup", "Dip"],
    progressions: [],
    colour: "orange",
    description:
      "The muscle up is one of the most recognizable calisthenics skills. It combines explosive pulling with strong pushing, making it a true test of upper body power and coordination.",
  },
  {
    exercise: "Front Lever Row",
    prerequisites: ["Front Lever Row Progressions"],
    progressions: [],
    colour: "green",
    description:
      "Front lever rows build incredible straight arm and back strength. They're one of the best dynamic exercises for improving your front lever while adding serious pulling strength.",
  },
  {
    exercise: "Front Lever Raise",
    prerequisites: ["Front Lever Raise Progressions"],
    progressions: [],
    colour: "green",
    description:
      "Front lever raises teach you how to control your body through the entire movement. They're excellent for building straight arm strength and reinforcing proper front lever technique.",
  },
  {
    exercise: "Inverted Row",
    prerequisites: ["Row"],
    progressions: ["Pullup"],
    colour: "yellow",
    description:
      "Inverted rows bridge the gap between rows and pullups. They strengthen your back, grip and scapular control while preparing you for your first pullup.",
  },
  {
    exercise: "Front Lever Row Progressions",
    prerequisites: ["Pullup", "Hollow Body Hold Progressions"],
    progressions: ["Front Lever Row", "Front Lever"],
    colour: "green",
    description:
      "These progressions gradually build the strength needed for full front lever rows. They're scalable for any level and are one of the fastest ways to improve your pulling strength. Ex. band assisted front lever row, regular progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "Weighted One Arm Pullup",
    prerequisites: ["One Arm Pullup"],
    progressions: [],
    colour: "yellow",
    description:
      "If a one arm pullup wasn't enough, adding weight is the ultimate display of pulling strength. Very few people will ever reach this level.",
  },
  {
    exercise: "Front Lever Raise Progressions",
    prerequisites: ["Pullup", "Hollow Body Hold Progressions"],
    progressions: ["Front Lever Raise", "Front Lever"],
    colour: "green",
    description:
      "These progressions develop the control and strength needed for front lever raises. Focus on slow, controlled reps to build strength through the entire range of motion. Ex. band assisted front lever raise, regular progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "Front Lever Progressions",
    prerequisites: ["Pullup", "Hollow Body Hold Progressions"],
    progressions: ["Front Lever"],
    colour: "green",
    description:
      "Front lever progressions are the safest and most effective way to build toward the full skill. Every progression strengthens your core, lats and straight arm pulling. Ex. band assisted progressions, regular progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "Explosive Pullup",
    prerequisites: ["Pullup"],
    progressions: ["Muscle Up"],
    colour: "yellow",
    description:
      "Explosive pullups teach you to generate power instead of just strength. They're essential for skills like the muscle up and make regular pullups feel much easier.",
  },
  {
    exercise: "Incline Pushup",
    prerequisites: [],
    progressions: ["Pushup"],
    colour: "red",
    description:
      "The perfect starting point for pushing exercises. Incline pushups are easy to scale while building strength in your chest, shoulders and triceps.",
  },
  {
    exercise: "Pushup",
    prerequisites: ["Incline Pushup"],
    progressions: ["Dip", "Pike Pushup", "Handstand Progressions", "One Arm Pushup Progressions"],
    colour: "red",
    description:
      "One of the best bodyweight exercises you can learn. Pushups build pressing strength, muscle and stability while unlocking countless advanced pushing skills.",
  },
  {
    exercise: "Dip",
    prerequisites: ["Pushup"],
    progressions: ["Weighted Dip", "Planche Pushup Progressions", "Muscle Up"],
    colour: "red",
    description:
      "Dips are one of the best upper body pushing exercises. They develop your chest, shoulders and triceps while building the strength needed for many advanced skills.",
  },
  {
    exercise: "Weighted Dip",
    prerequisites: ["Dip"],
    progressions: [],
    colour: "red",
    description:
      "Weighted dips take one of the best pushing exercises to the next level. They're an excellent way to build raw pressing strength that carries over to many calisthenics skills.",
  },
  {
    exercise: "Handstand",
    prerequisites: ["Handstand Progressions"],
    progressions: ["Handstand Pushup", "One Arm Handstand Progressions"],
    colour: "red",
    description:
      "The handstand teaches balance, body awareness and shoulder stability. Mastering it opens the door to many advanced pushing skills.",
  },
  {
    exercise: "Handstand Progressions",
    prerequisites: ["Pushup"],
    progressions: ["Handstand"],
    colour: "red",
    description:
      "Handstand progressions build the balance, confidence and shoulder strength needed for a full handstand. They're easy to scale for any level and help you safely work toward one of calisthenics' most fundamental skills. Ex. wall holds, wall peels",
  },
  {
    exercise: "Handstand Pushup",
    prerequisites: ["Pike Pushup", "Handstand"],
    progressions: ["90 Degree Pushup", "Planche Progressions", "Planche Pushup Progressions"],
    colour: "red",
    description:
      "The handstand pushup is one of the best exercises for building overhead pressing strength. It develops powerful shoulders while laying the foundation for advanced balance skills.",
  },
  {
    exercise: "Pike Pushup",
    prerequisites: ["Pushup"],
    progressions: ["Handstand Pushup"],
    colour: "red",
    description:
      "Pike pushups are the stepping stone to handstand pushups. They strengthen your shoulders and teach the correct pressing pattern without requiring full body balance.",
  },
  {
    exercise: "One Arm Handstand Progressions",
    prerequisites: ["Handstand"],
    progressions: ["One Arm Handstand"],
    colour: "red",
    description:
      "These progressions gradually build the balance and strength needed for a one arm handstand. Patience and consistency are key with this skill. Ex. finger assisted one arm handstand, handstand walks",
  },
  {
    exercise: "One Arm Handstand",
    prerequisites: ["One Arm Handstand Progressions"],
    progressions: [],
    colour: "red",
    description:
      "The one arm handstand is one of the most difficult balance skills in calisthenics. It demands exceptional strength, body control and precision.",
  },
  {
    exercise: "Planche",
    prerequisites: ["Planche Progressions", "Planche Raise Progressions"],
    progressions: [],
    colour: "red",
    description:
      "The pinnacle of straight arm pushing strength. Holding your body parallel to the ground is a true demonstration of shoulder, chest and core strength.",
  },
  {
    exercise: "Planche Progressions",
    prerequisites: ["Handstand Pushup"],
    progressions: ["Planche", "Planche Raise Progressions"],
    colour: "red",
    description:
      "Planche progressions build the strength and technique needed for the full planche. Every progression develops stronger shoulders, wrists and straight arm strength. Ex band assisted planche, regular progressions (tuck, adv tuck, straddle, half lay), planche lean",
  },
  {
    exercise: "Planche Pushup",
    prerequisites: ["Planche Pushup Progressions"],
    progressions: [],
    colour: "red",
    description:
      "Planche pushups combine incredible straight arm strength with dynamic pressing power. They're among the hardest pushing exercises in calisthenics.",
  },
  {
    exercise: "Planche Pushup Progressions",
    prerequisites: ["Handstand Pushup", "Dip"],
    progressions: ["Planche Pushup", "90 Degree Hold"],
    colour: "red",
    description:
      "These progressions strengthen every part of the planche pushup. They gradually build the strength and control needed for the full movement. Ex. band assisted planche pushup, regular planche pushup progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "Planche Raise",
    prerequisites: ["Planche Raise Progressions"],
    progressions: [],
    colour: "red",
    description:
      "Planche raises develop explosive straight arm strength and body control. They're an advanced movement that challenges your shoulders and core through a large range of motion.",
  },
  {
    exercise: "Planche Raise Progressions",
    prerequisites: ["Planche Progressions"],
    progressions: ["Planche Raise", "Planche"],
    colour: "red",
    description:
      "These progressions prepare you for full planche raises by developing strength through every phase of the movement. Slow, controlled reps are the key to success. Ex. band assisted planche raise, regular planche raise progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "90 Degree Pushup",
    prerequisites: ["Handstand Pushup", "90 Degree Hold"],
    progressions: [],
    colour: "red",
    description:
      "The 90 degree pushup combines strength, balance and control into one movement. It's one of the most advanced pressing skills you can achieve.",
  },
  {
    exercise: "90 Degree Hold",
    prerequisites: ["Planche Pushup Progressions"],
    progressions: ["90 Degree Pushup"],
    colour: "red",
    description:
      "The 90 degree hold develops the bent arm strength and stability needed for advanced pressing skills. Mastering this position makes many other skills much easier.",
  },
  {
    exercise: "One Arm Pushup Progressions",
    prerequisites: ["Pushup"],
    progressions: ["One Arm Pushup"],
    colour: "red",
    description:
      "These progressions gradually build unilateral pressing strength while correcting imbalances between sides. They're the safest path toward a one arm pushup. Ex. staggered pushup, archer pushup, band assisted one arm pushup",
  },
  {
    exercise: "One Arm Pushup",
    prerequisites: ["One Arm Pushup Progressions"],
    progressions: [],
    colour: "red",
    description:
      "The one arm pushup is a classic display of bodyweight strength. It requires powerful pressing muscles, a strong core and excellent body control.",
  },
  {
    exercise: "Hollow Body Hold",
    prerequisites: ["Hollow Body Hold Progressions"],
    progressions: ["Dragon Flag Progressions", "Front Lever Progressions", "Front Lever Row Progressions", "Front Lever Raise Progressions"],
    colour: "blue",
    description:
      "The hollow body hold is the foundation of nearly every advanced calisthenics skill. A strong hollow position improves balance, body control and core strength.",
  },
  {
    exercise: "Laying Leg Raise Progressions",
    prerequisites: [],
    progressions: ["Hanging Leg Raise Progressions", "Sitting Leg Raise Progressions"],
    colour: "blue",
    description:
      "These progressions strengthen your lower abs and hip flexors while preparing you for more advanced core exercises. They're a great starting point for beginners. Ex. dead bugs, tucked knees, straight legs",
  },
  {
    exercise: "Hollow Body Hold Progressions",
    prerequisites: [],
    progressions: ["Hollow Body Hold"],
    colour: "blue",
    description:
      "These progressions make it easier to learn a strong hollow position. Building this foundation will make many other skills feel more stable. Ex. tucked knees tucked arms, tucked knees straight arms, straddle tucked arms, straddle straight arms",
  },
  {
    exercise: "Hanging Leg Raise Progressions",
    prerequisites: ["Laying Leg Raise Progressions"],
    progressions: ["L Sit", "Toes To Bar"],
    colour: "blue",
    description:
      "These progressions develop grip, core strength and body control. They're an important step toward exercises like the L sit and toes to bar. Ex. knee raise, straight legs",
  },
  {
    exercise: "L Sit",
    prerequisites: ["Hanging Leg Raise Progressions", "Sitting Leg Raise Progressions"],
    progressions: [],
    colour: "blue",
    description:
      "The L sit is one of the first major static core skills. It builds strong hip flexors, abs and shoulder stability while improving overall body control.",
  },
  {
    exercise: "Sitting Leg Raise Progressions",
    prerequisites: ["Laying Leg Raise Progressions"],
    progressions: ["L Sit", "V Sit"],
    colour: "blue",
    description:
      "These progressions strengthen compression and hip flexor strength. They're the key to unlocking skills like the V sit. Ex. sitting straight leg raises",
  },
  {
    exercise: "V Sit",
    prerequisites: ["Sitting Leg Raise Progressions"],
    progressions: [],
    colour: "blue",
    description:
      "The V sit is an advanced progression from the L sit that requires exceptional compression and flexibility. It's one of the best demonstrations of core strength.",
  },
  {
    exercise: "Dragon Flag",
    prerequisites: ["Dragon Flag Progressions"],
    progressions: [],
    colour: "green",
    description:
      "The dragon flag is one of the hardest core exercises you can perform. It develops incredible body tension and core strength that carries over to many calisthenics skills.",
  },
  {
    exercise: "Dragon Flag Progressions",
    prerequisites: ["Hollow Body Hold", "Pullup"],
    progressions: ["Dragon Flag"],
    colour: "green",
    description:
      "These progressions safely build the strength needed for the full dragon flag. Focus on maintaining a straight, rigid body throughout each rep. Ex. regular progressions (tuck, adv tuck, straddle, half lay)",
  },
  {
    exercise: "Toes To Bar",
    prerequisites: ["Hanging Leg Raise Progressions"],
    progressions: [],
    colour: "blue",
    description:
      "Toes to bar combine grip, coordination and core strength into one movement. They're a great way to build dynamic control while strengthening your entire midsection.",
  },
  {
    exercise: "Seated Squat",
    prerequisites: [],
    progressions: ["Squat"],
    colour: "white",
    description:
      "The seated squat is an easy introduction to squatting. It helps build confidence, strength and proper movement patterns before progressing further.",
  },
  {
    exercise: "Squat",
    prerequisites: ["Seated Squat"],
    progressions: ["Weighted Squat", "Lunge", "Bulgarian Split Squat"],
    colour: "white",
    description:
      "The squat is one of the most fundamental lower body exercises. It builds strength, muscle and mobility while improving nearly every athletic movement.",
  },
  {
    exercise: "Weighted Squat",
    prerequisites: ["Squat"],
    progressions: ["Pistol Squat"],
    colour: "white",
    description:
      "Adding weight is one of the best ways to continue building lower body strength. Stronger squats translate to more power, balance and athleticism.",
  },
  {
    exercise: "Deadlift",
    prerequisites: [],
    progressions: [],
    colour: "white",
    description:
      "The deadlift strengthens your entire posterior chain, including your back, glutes and hamstrings. Few exercises build full body strength as effectively.",
  },
  {
    exercise: "Back Extension",
    prerequisites: [],
    progressions: [],
    colour: "white",
    description:
      "Back extensions strengthen your lower back, glutes and hamstrings. They're a simple but effective exercise for improving posture and building a resilient posterior chain.",
  },
  {
    exercise: "Pistol Squat",
    prerequisites: ["Weighted Squat", "Lunge", "Bulgarian Split Squat"],
    progressions: ["Dragon Squat"],
    colour: "white",
    description:
      "The pistol squat is a challenging single leg exercise that builds strength, balance and mobility all at once. It's one of the best bodyweight leg movements you can learn.",
  },
  {
    exercise: "Dragon Squat",
    prerequisites: ["Pistol Squat"],
    progressions: [],
    colour: "white",
    description:
      "Dragon squats combine strength, mobility and coordination into one advanced movement. They're an excellent challenge once you've mastered pistol squats.",
  },
  {
    exercise: "Lunge",
    prerequisites: ["Squat"],
    progressions: ["Pistol Squat"],
    colour: "white",
    description:
      "Lunges build strong, balanced legs while improving stability and coordination. They're a staple exercise for developing single leg strength.",
  },
  {
    exercise: "Bulgarian Split Squat",
    prerequisites: ["Squat"],
    progressions: ["Pistol Squat"],
    colour: "white",
    description:
      "Bulgarian split squats are one of the best lower body exercises for building strength and muscle. They challenge each leg individually while improving balance and stability.",
  },
];

export const skillTree: SkillNode[] = buildSkillTree(rawSkillTree);
