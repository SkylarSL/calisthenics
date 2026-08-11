# Calisthenics Skill Tree

A self-contained React component that renders a calisthenics progression
graph and lets a user select an exercise to see every prerequisite required
to reach it, highlighted directly on the graph.

## What's included

```
lib/
  types.ts          - SkillNode / SkillNodeInput types
  skillTreeData.ts   - example graph data (the one from the request) + slugify()
  graphUtils.ts       - graph indexing, column layout, and pathfinding
components/
  SkillTree.tsx       - the interactive graph component ("use client")
app/skill-tree/page.tsx - example route showing how to wire it up
```

## Installing into a fresh Next.js project

1. Copy the `lib/` and `components/` folders into your project (paths are
   relative imports, so keep them siblings or adjust the import paths).
2. Make sure Tailwind CSS is set up (this ships with `create-next-app` if you
   pick the Tailwind option). The component uses Tailwind utility classes
   for layout plus inline styles/CSS variables for the specific palette, so
   no `tailwind.config` changes are required.
3. Drop `<SkillTree />` into any page (it's a client component, so either
   use it inside a page that's already a client component, or import it
   directly — Next.js will handle the client boundary automatically):

```tsx
import SkillTree from "@/components/SkillTree";

export default function Page() {
  return <SkillTree />;
}
```

4. Uses system fonts out of the box — no font setup required.

## Using your own graph

Replace the contents of `skillTree` in `lib/skillTreeData.ts`, or pass your
own nodes in as a prop:

```tsx
import SkillTree from "@/components/SkillTree";
import { buildSkillTree } from "@/lib/skillTreeData";

const myTree = buildSkillTree([
  { exercise: "Rows", prerequisites: [], progressions: ["Pullups"] },
  { exercise: "Pullups", prerequisites: ["Rows"], progressions: [] },
]);

export default function Page() {
  return <SkillTree nodes={myTree} />;
}
```

Rules for the data:
- `exercise` names just need to be unique — ids are slugified automatically.
- `progressions` is the source of truth for the graph's edges (what an
  exercise leads to). `prerequisites` is currently just kept on the type for
  your own bookkeeping/display; it isn't required to be the exact inverse of
  `progressions`.
- Any exercise referenced inside `progressions` should also have its own
  entry in the array so the graph can resolve it.
- `colour` is optional and accepts one of six named values: `red`, `yellow`,
  `blue`, `green`, `orange`, `white`. It's case-insensitive and falls back to
  `white` if omitted or unrecognized. Each name maps to a stroke/fill/text
  triplet tuned for the dark canvas (see `lib/colors.ts`) rather than the
  literal CSS colour, so nodes stay readable against the background.
- `description` is optional — a short paragraph shown for that exercise in
  the prerequisites sidebar. Falls back to an empty string (rendered as "No
  description yet.") if omitted.

## How it works

Select a single exercise on the graph and every prerequisite required to
reach it lights up — each node glows in its own `colour`, connected by an
animated white line that flows along the route, while everything unrelated
dims out. This uses the same "ancestors" traversal regardless of how many
parallel branches lead there: selecting `one arm pullups` highlights `rows`,
`pullups`, *and* both `weighted pullups` and `assisted one arm pullups`,
since either of those last two is a valid route in. Root movements (nothing
required to reach them) just show "no prerequisites needed."

Selecting a second exercise replaces the current selection — only one
exercise is highlighted at a time. Clicking the selected exercise again
clears the selection.

You don't have to hunt for a node on the graph — the "Selection" section of
the top-right panel has a search-as-you-type box. Type part of an exercise
name to get a filtered dropdown (up to 8 matches), navigate it with
arrow keys, and press Enter or click a result to select it. Selecting from
search also pans the canvas so the exercise is centered in view, since it
might currently be off-screen.

The collapsible sidebar on the left lists every prerequisite for the
current selection, ordered from the earliest root movement up through the
selected exercise itself, each with its `description` underneath. It's a
scrollable dropdown, collapsed by default — click the "Prerequisites"
header (or select an exercise, which opens it automatically) to reveal the
list; click the header again to collapse it.

## Design notes

Dark, high-contrast "gym at night" palette (charcoal background, chalk-white
text). Nodes are colour-coded by their own `colour` field at all times —
selecting an exercise doesn't swap that colour out, it makes the relevant
nodes glow (a coloured drop-shadow driven by each node's own hue) while the
connecting edges turn white with an animated flowing dash, and everything
unrelated dims to grey. The graph fills the whole viewport and can be
dragged around with the mouse (or touch) to pan; a "Recenter" button in the
overlay snaps it back to the middle. Selection, search, the legend, and
category colours live in a translucent panel floating in the top-right
corner; the prerequisite descriptions live in their own collapsible panel
on the left — both float above the graph so neither blocks it.

## Mobile / responsive layout

Below the `sm` breakpoint (640px), both floating panels switch from
corner-pinned fixed widths to full-width bars stacked at the top of the
screen — the prerequisites panel first, then the info panel (search,
selection, legend) below it, since two ~300px panels side by side simply
don't fit on a phone screen. The decorative title is hidden on mobile to
free up space, since both panels would otherwise render on top of it
anyway. The legend + category colour key collapses into its own dropdown
(same pattern as the prerequisites panel) so it doesn't take up space until
you actually want it.

One known tradeoff: if you expand the prerequisites dropdown on a small
screen, it can grow tall enough to visually sit on top of the info panel
below it (it's given a higher z-index specifically so it overlaps *on top*
of the info panel rather than being clipped behind it) — both stay
independently scrollable and functional, it's just not a perfectly
non-overlapping layout in that specific combination.

**Touch dragging**: panning uses the Pointer Events API (`onPointerDown`
/`onPointerMove`/`onPointerUp`), which unifies mouse and touch input, so no
separate touch-specific handling is needed for the pan gesture itself.
Pointer capture is grabbed immediately on press rather than only once a
drag is detected — capturing late lets the OS's own scroll/pan gesture
recognizer steal the touch sequence first on most mobile browsers, which is
what caused drags to die a few pixels into the gesture. Because capture is
now immediate, clicks are detected by hit-testing which node (if any) was
under the pointer at press time (via a `data-node-id` attribute) rather
than relying on the browser's native `click` event — pointer capture
redirects `click` to the capturing element, so the old click-vs-drag logic
would silently break tapping nodes if capture happened immediately.

**Pinch/zoom**: two-finger pinch (tracked via multiple simultaneous
pointer ids) zooms the canvas in and out, anchored so whatever's under your
fingers stays under your fingers rather than the graph jumping around.
Trackpad pinch on desktop works the same way — browsers report it as a
`wheel` event with `ctrlKey` set, handled via a native (non-passive) event
listener so `preventDefault()` can actually stop the browser's own
page-zoom. Plain mouse-wheel scrolling is left alone. Zoom is clamped
between 40% and 250%, with `+`/`−` buttons and a live percentage readout in
the "View" section of the info panel for mouse-only users, and "Recenter"
resets both pan and zoom back to fitting the whole graph on screen.

## Deploying to GitHub Pages

This app has no server dependencies (no API routes, no data fetching), so
it can ship as a fully static site. Three files handle it:

- **`next.config.js`** — sets `output: "export"` so `next build` produces
  plain static files in `./out`. `basePath` is derived automatically from
  `GITHUB_REPOSITORY` at build time in CI, so it's correctly `/your-repo`
  for a normal project repo, or empty for a `username.github.io` user/org
  page repo — nothing to hardcode or remember to update.
- **`public/.nojekyll`** — GitHub Pages runs Jekyll by default, which
  ignores folders starting with `_`, including Next's `_next` build output.
  This file disables that.
- **`.github/workflows/deploy.yml`** — builds and deploys automatically on
  every push to `main` (or manually via the Actions tab).

Setup: push this project to a GitHub repo, then in the repo go to
**Settings → Pages → Source** and select **GitHub Actions**. Push to
`main` and the workflow builds and deploys on its own. The live URL shows
up in the Pages settings and in the workflow run summary — for a project
repo it'll be `https://<username>.github.io/<repo-name>/`.

If you'd rather deploy elsewhere (Vercel, Netlify, Cloudflare Pages, your
own server), `next.config.js`'s `output: "export"` still works — just run
`next build` and serve the resulting `out/` folder, or drop the `output`
and `basePath` lines entirely if you're using a platform with native
Next.js support (like Vercel) instead of a static host.
