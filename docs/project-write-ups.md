# Project write-ups

How an ashlog project page becomes an Inspect write-up. ashlog (notes.ashwin.co.in) is being retired; every project moves to `/projects/<slug>/`, and the older posts are notes at `/notes/<slug>/`. Tenzies (`src/content/projects/tenzies/`) is the reference.

## What a write-up is

- **The story behind the project, not its spec sheet.** Why it changed, how the hard parts work, what went wrong. ashlog's Overview, Goals, stack table, feature list and walkthrough do not carry over as sections.
- **Not the portfolio again.** v2 (`v2-portfolio/src/lib/data/projects.ts`: `longDesc`, `highlights`, `closer`) and v3 (`v3-portfolio/src/data/projects.ts`: `story`, `figures`) already say what the project does. Anything they cover gets a line at most. A write-up section earns its place with something they don't have: the reason for a decision, how it works, a number, a dead end, a fix.
- **Not the portfolio's media either.** Before planning a figure, look at what the portfolios already show: v2 `public/projects/<Name>/` (the showcase clip, `closer-*` images and screenshots), v3 `figures` in `projects.ts`, and the v3 capture scenes in `tools/capture/scenes/<slug>*.mjs`, which say exactly what each showcase clip clicks. A write-up figure must not show the same screen, state or interaction, even with marks added or a different title loaded. If the portfolio already shows it, explain it in prose or code, or show a state it never reaches (an error, an offline fallback, an old version). A write-up with only a hero and no figures is fine.
- **Read the code and history first.** Write from the source, `git log`, and the pre-rebuild commit, not from the portfolio or ashlog copy. Check every number and claim against the source before it goes in. Tenzies' first draft claimed the rebuild added the locking rule; the old code already had it, and that became the better story.
- **Never invent a reason.** If the why isn't in the code, commits or his words, state what happens and leave the motive out. Flag all new copy for him to ratify.

## Voice

His register: first person, plain, short sentences, a bit dry. No em or en dashes. Present tense for how it works, past tense for what happened. Short headings that say the point ("The rule that was already there", "Keeping time", "Sounds without files"). End with **Rough edges** as a short bold-led list, and optionally one line on what's next.

## Shape

1. Two short intro paragraphs: what it is in one or two sentences, where it came from, what the rebuild changed.
2. Four to six `##` sections, each about one decision or hard part. Code snippets only when the code is the explanation, kept under ~15 lines and copied from the source.
3. Rough edges.

The page adds a facts block (Made, Stack, Links) from frontmatter and a "Notes on <Project>" list automatically.

## Frontmatter

```yaml
title: Tenzies
dek: One or two sentences that say what changed and why it is interesting.
date: 2026-10-05T10:00:00+05:30
kind: project
tags: [tenzies, three-js, motion]
project:
  name: Tenzies
  icon: ../../../assets/projects/tenzies.svg
  about: "One line, same as the portfolio description."
  made: 2024, rebuilt in 2026
  live: https://tenzies.ashwin.co.in
  repo: https://github.com/Ashwin-S-Nambiar/Tenzies
  stack: [React 19, three.js, Tailwind CSS 4, Motion]
thumb: ./thumb.png
hero:
  image: ./win.webp
  alt: "..."
```

- The first tag is the project slug. Notes tagged with it show up under "Notes on <Project>".
- `project.name` must match the `project.name` on its notes, so a note's Project fact and inline `<Project />` link point to the write-up.
- No `notes:` field any more.

## Connecting notes

- Link a note inline on a phrase already in the sentence, never with an added sentence ("lie [on the same green table](/notes/dice-on-the-felt/)"). Same rule as the portfolios.
- Don't repeat what a note covers. Give it a sentence and link it.
- A note about another project's lab (the odometer) can still be linked where the fix is the same.
- Tag new or ported notes with the project slug so the list picks them up.

## Figures

**Before/after is the exception, not a template slot.** Use `Compare` or `ClipCompare` only when the change itself is the story and can't be said in a sentence (Tenzies: flat squares to 3D dice). Most projects get none. Inspect never gets one: it would be Inspect inside Inspect, and the BlogSpace and riso-era history stays out of the blog.

Use a figure only when the reader would miss something without it, and build a new component only when a write-up needs it. Every figure sits beside the paragraph that talks about it; no screenshot gallery at the end. Don't reuse portfolio media as is; a write-up figure has to add something (a comparison, marks, cues).

| Need | Component | Notes |
| --- | --- | --- |
| The old version against the new, still | `Compare` | before/after slider on two images of the same state |
| The old version against the new, in motion | `ClipCompare` | two synced clips of the same move, same crop, same length; labels are years; 0.25× toggle for fast motion |
| Explaining a state | `Annotated` | marks point at what the text names; 3 to 5 marks |
| A sequence that moves | `Clip` | cues, optionally a track; slowed if it lasts under a second |
| The same screen at different sizes | `DeviceSwitch` | iPhone, iPad and Desktop only when the layouts really differ |
| A detail up close | `Annotated` on a tight crop at 3x | a stamp, a release, a dice face: marks explain what decides each part |
| A live demo | `components/demos/*` | only when touching it teaches more than watching |
| A side remark | `Aside` | sparingly |

Not built yet, build when a project needs it: a spec strip (palette swatches, type specimen, shortcuts) and sidenotes.

### DeviceSwitch and DeviceFrame

- Most app write-ups get one, near the start, with a sentence on how the phone layout differs. Skip it when the portfolio already shows the same widths side by side (Redline).
- The status bar ink follows `ground`: dark ink on light screens, light ink on dark ones.
- The home indicator stays on both iPhone and iPad; it's on screen in every app on both.

- `kind: 'phone' | 'tablet' | 'desktop'`. iPhone and iPad use the v3 lab frame geometry; desktop is a plain screenshot with no shell.
- Pass `ground` as the app's background colour so the status bar and safe areas match.
- Capture sizes, with the app's footer hidden on iPhone and iPad:
  - iPhone: 390 × 778 at 3×
  - iPad: 1180 × 784 at 2×, `hasTouch`
  - desktop: 1280 × 800 at 2×, footer kept

### Hero and thumbnail

- Hero: a clean desktop still (or clip) of the project's best moment.
- Thumbnail (896 × 560): the project's main surface with all UI hidden, framed at 16:10 with even margins. Hide with `body *{visibility:hidden!important}` and make only the subject visible again.

## Capturing

Capture from local builds, never the live site, with real app state:

- Serve `dist/` with `python3 -m http.server`. For the pre-rebuild version, `git archive <commit> | tar -x` into the scratchpad, install and build.
- Seed state through `localStorage` in `addInitScript` (Tenzies: `tz:game`), and seed `Math.random` (mulberry32) so runs repeat.
- Use Playwright with `channel: 'chrome'` (WebGL works headless) and the Playwright Node module from `v3-portfolio/tools/capture/node_modules`.
- **Retina stills:** `page.screenshot` at `deviceScaleFactor` 2 or 3.
- **Clips:** the CDP screencast only returns 1× frames. Loop `Page.captureScreenshot` with `clip: { x, y, width, height, scale: 2 }` instead, and slow the page so the loop samples densely:
  - init script that scales `performance.now`, `Date.now`, rAF timestamps and `setTimeout`/`setInterval` delays by `k` (0.1)
  - `Animation.setPlaybackRate({ playbackRate: k })` over CDP for CSS and WAAPI
  - write an ffconcat list from capture timestamps, encode with `setpts=PTS*k`, crop, `fps=60`, H.264 CRF 22, `+faststart`, trimmed to the scripted length
- Script actions on a fixed timeline so both sides of a `ClipCompare` line up.
- Measure mark boxes from element rects in the same crop, as percentages.
- Stills to WebP with `cwebp -q 84 -m 6 -sharp_yuv`. Posters from the first frame of the MP4.
- Review frames on a contact sheet before using a clip.
- Posters are the clip's first frame, so make that frame a finished screen: let data load before recording starts, never record a page mid fade-in.
- Park the cursor on empty space. Hovering cards can prefetch, which changes what the app does next.
- When an app judges health from recent successes (MovieVault's 10 s grace), let that window pass before failing requests on purpose, and block the whole API rather than one endpoint.
- Phone layouts often hide controls in sheets. Set state up on desktop, save `storageState`, and open every size from it.
- Quote a `dek` that contains `: ` so the YAML (and `docs/render-og.py`) parses it.
- `render-og.py` redraws every card; restore cards whose post didn't change instead of committing byte noise.

## Per project checklist

1. Read the ashlog page, the v2 and v3 entries, the README, the source and `git log`. Note what the portfolios already say.
2. Find the pre-rebuild commit; build it if a before/after earns its place.
3. List the decisions and hard parts with evidence from code or commits. Pick four to six.
4. Plan figures against the table above. Drop any that only decorate.
5. Capture, write, check every claim against the source.
6. Add OG card: `python3 docs/render-og.py` (write-ups get the label "write-up").
7. Check 320, 390, 768, 1024, 1440, 2560 in light and dark; CLS 0 through a scroll and every control; no horizontal scroll; keyboard on every control.
8. Flag new copy for ratification.

## After all nine

- Port the Spotify and Trakt widget write-ups from ashlog as notes. Drop the glossary notes.
- Point notes.ashwin.co.in at Inspect with redirects (`/projects/<Name>` to `/projects/<slug>/`, everything else to `/`), then archive ashlog.
- Replace `notes.ashwin.co.in` links: v2 `noteLink`, v3 `noteLink` and `links.ts`, v1 Hero, Redline home and seed data. The chip stays labelled "notes"; it now opens the write-up.
