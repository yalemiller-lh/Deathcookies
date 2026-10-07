# Handoff: Deathcookies — personal quarterly planner (mobile)

## Overview
Deathcookies is a single-screen, mobile-first personal planner. The user's **planning year starts on their birthday** (default: May 1, user born 2002 → currently Year 24) and is split into **four quarters of three calendar months**. The home screen shows:

1. Today's date + where you are in the quarter (week X of Y, weeks left)
2. A quote of the day
3. **Deathcookies** — urgent to-dos that need doing ASAP (checklist)
4. **Priorities** — max 3 goals for the quarter, each tagged with a category and holding sub-card projects
5. **Backburner** — ideas to think on/explore later, promotable to priorities
6. **Set aside** — paused priorities (only shown if any)

A daily push notification tells the user how many deathcookies are left to "eat".

Tone matters: the app helps you orient, it never grades you. No streaks, no scores, no "overdue" counters, no guilt copy.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, **not production code to copy**. Recreate the design in the target environment. No codebase exists yet; recommended: **React Native (Expo)** or **SwiftUI** for a real iOS app with local notifications, or a **PWA** (React + Vite, localStorage/IndexedDB, Web Push) if a home-screen web app is enough.

Open `Deathcookies.dc.html` in a browser to see it running inside an iPhone frame (it needs `support.js` and `ios-frame.jsx` beside it). The logic class at the bottom of that file holds all date math, sample data and state transitions — read it as a spec.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and interactions are final. Recreate pixel-accurately. (Some sample content — studio, running, Nan — is placeholder data.)

## Design language
Black and white only, dark, edgy. No accent colors. Uppercase heavy grotesk headings, monospace micro-labels, hairline borders, nearly-square corners (2–4px). Primary actions are solid white buttons with black text; secondary are 1px outlined.

## Screen: Home (the only screen)
Phone width 402×874 reference (iPhone 16 Pro). Content column: padding `62px 16px 48px` inside the device (top clears status bar; in a real app use safe-area insets + 16px sides), max-width 560px, centered. Single scroll view. Sections stacked with **24px gap**.

### 1. Header
- Eyebrow: `YEAR {n} · QUARTER {q}` — JetBrains Mono 11px, letter-spacing .14em, uppercase, `#8a8a8a`.
- H1: today's date, e.g. `WEDNESDAY, OCTOBER 7` — Archivo 800, 34px, line-height 1, letter-spacing −0.03em, uppercase, `#f5f5f5`, margin-top 10px.
- Week line: `WEEK 10 OF 13 · 3 WEEKS LEFT` (last week → `final week`; `1 week left` singular) — JetBrains Mono 12px, .06em, uppercase, `#a8a8a8`, margin-top 10px.

### 2. Quote of the day
- Quote: `“…”` Archivo 600, 19px, line-height 1.3, letter-spacing −0.01em, `text-wrap: pretty`.
- Attribution: `— Seneca` JetBrains Mono 12px, .06em, `#a8a8a8`. 8px gap.
- Rotates daily: `QUOTES[dayOfYear % QUOTES.length]` (list in the logic class; public-domain/classical quotes).

### 3. Deathcookies
- Section header row (used by every section): flex, space-between, baseline; bottom border 1px `#262626`, padding-bottom 8px.
  - Title: Archivo 700, 17px, letter-spacing .02em, uppercase. Text: `DEATHCOOKIES`.
  - Right meta: `3 OPEN` JetBrains Mono 11px, .1em, uppercase, `#8a8a8a`.
- List container: bg `#0f0f0f`, 1px `#262626`, radius 4px.
- Row (whole row is a toggle button): min-height 52px, padding 14px 16px, 14px gap, bottom border 1px `#262626`, hover bg `#141414`.
  - Checkbox: 20×20, 1.5px `#f5f5f5` border, radius 2px; checked = filled `#f5f5f5`. 150ms bg transition.
  - Text: 15px/1.45. Done → `line-through`, color `#6a6a6a`.
- Add row: grid `1fr auto`, gap 8, padding `10px 10px 10px 16px`. Input is underline-only (1px `#333`, focus `#f5f5f5`), placeholder `Something that cannot wait…`, 16px. Button `ADD` outlined (1px `#333`, hover border `#f5f5f5`), mono 12px .1em.
- Below list, only if any done: text button `CLEAR THE DONE ONES` mono 12px `#8a8a8a`, hover `#f5f5f5`.

### 4. Quarter-review card (conditional)
Only shown in the last 14 days of a quarter. Full-width button: bg `#000`, 1px `#f5f5f5` border, radius 4, padding 16.
- Title `QUARTER 2 CLOSES SATURDAY, OCTOBER 31` (or `…CLOSES TODAY`) Archivo 700 19px uppercase.
- Body `Look back over each priority and decide what to carry into the next quarter. Ready when you are.` 14px `#a8a8a8`.
- CTA `BEGIN THE QUARTER REVIEW →` mono 12px .1em 600.
- Opens the Quarter Review sheet (below).

After closing a quarter, a dismissible notice card appears here: bg `#0f0f0f`, border `#262626`: `QUARTER 2 IS CLOSED.` / `Quarter 3 begins November 1 with 2 priorities carried forward. Choose the rest when you are ready.` / `OKAY`.

### 5. Priorities
Header: `PRIORITIES` / `3 OF 3`. Cards stacked, 10px gap. **Max 3 active.**

**Collapsed card** (default) — bg `#0f0f0f`, 1px `#262626`, radius 4, padding `14px 16px`. Whole header is one button (min-height 44):
- Left: roman numeral `I`/`II`/`III` mono 12px `#8a8a8a`, min-width 22, padding-top 4.
- Category tag (above title): `HEALTH` mono 10px, .14em, uppercase, padding `3px 7px`, 1px `#f5f5f5` border, radius 2.
- Title: Archivo 600, 18px/1.25, −0.01em.
- Right: chevron (9×9 box, 1.5px right+bottom border `#8a8a8a`, rotate 45° collapsed → −135° expanded, 200ms).
- **Nothing else shows when collapsed** — only tag + title.

**Expanded** — divider (1px `#262626`, padding-top 12) then, 12px gap:
- Optional "Adjusted" note: 1px `#f5f5f5` box, radius 3, `ADJUSTED` mono label + note text 14px.
- Project sub-cards: bg `#161616`, 1px `#2a2a2a`, radius 3, padding `12px 14px`. Name 15px 600; last activity mono 12px `#a8a8a8` e.g. `THU · 5 km in the rain` (none → `Quiet last week` in `#6a6a6a`).
- Empty: dashed 1px `#3a3a3a` box `No projects connected yet.`
- Inline add-project form (when toggled): input + white `ADD` button.
- `WHY IT MATTERS` (mono 11px .14em `#8a8a8a`) + 15px/1.5 `#d0d0d0` paragraph.
- `PROGRESS WOULD LOOK LIKE` + paragraph.
- Footer row: `EDIT` (underlined, white) left; `+ PROJECT` / `CANCEL` (`#8a8a8a`) right.

**Edit mode** (replaces card body): title input (Archivo 600 18px); **Category** chip picker — one of `hobby · health · career · finances · relationship` (selected = white fill/black text; else 1px `#333`); `Why it matters` textarea; `Progress would look like` textarea; **Connected projects** toggle chips; hint line; `SAVE` (white, flex) + `CANCEL` (outlined); for existing priorities also `SET THIS ONE ASIDE FOR NOW` text button. Title is required (hint: `Give it a title first, even a rough one.`).

Below cards, if < 3 active: dashed add button `+ PRIORITY · ROOM FOR 1 MORE` (or `+ FIRST PRIORITY FOR THIS QUARTER`).

### 6. Backburner
Header `BACKBURNER` / `3 IDEAS`. Same list container as Deathcookies.
- Row: min-height 56, padding `6px 6px 6px 16px`. Text 15px `#d0d0d0` (flex 1); `PRIORITISE` mono 11px text button; `×` 44×44 button `#6a6a6a` (hover white) removes.
- Add row: placeholder `An idea to think on…`, `ADD`.
- `PRIORITISE` opens the Change Focus sheet.

### 7. Set aside (conditional)
Header `SET ASIDE` + `Kept, with their notes.` Rows: bg `#0f0f0f`, border `#262626`, title 15px `#d0d0d0`, right `BRING BACK` (white) or `NO ROOM YET` (`#6a6a6a`, disabled) when 3 active.

## Bottom sheets
All: dim overlay `rgba(0,0,0,.7)` (fade 200ms); sheet bg `#0f0f0f`, top border 1px `#333`, padding `12px 20px 44px`, max-height 92–94%, scrollable; grabber 40×3 `#333`; slide-up 350ms `cubic-bezier(.2,.8,.2,1)` from translateY(32px). Tap overlay closes.

**Change focus (promote from Backburner)**
- Eyebrow `CHANGE FOCUS NOW`, H2 = the idea text (Archivo 700 22px).
- If < 3 active: copy `There is room for one more priority this quarter…` + white `ADD AS PRIORITY III`.
- If 3 active: copy `You are already holding three. To take this on now, set one aside. It keeps its notes and can come back at any review.` + one row per active priority with `SET ASIDE` → pauses that one, adds the idea.
- After promoting: idea leaves Backburner, new priority opens straight into edit mode with hint `Pick a category and write down why it matters while it is fresh.`
- `NOT NOW, KEEP IT HERE` closes.

**Quarter review**
- Eyebrow `QUARTER REVIEW`, H2 `LOOKING BACK ON QUARTER 2` (Archivo 800 28px uppercase), intro `{range}. For each priority: what happened, and whether to continue, adjust, or retire it. Nothing here is a verdict on you.`
- Per active priority: title; `Progress was going to look like: …` (mono 12px); `What actually happened?` textarea; segmented `CONTINUE | ADJUST | RETIRE` (container 1px `#333` black; selected segment white/black); Adjust reveals `What changes next quarter?` input; Retire shows `Setting something down is a decision, not a failure. Its projects stay on the go.`
- Summary `2 CONTINUE · 1 ADJUST · 0 RETIRE`, white `CLOSE Q2 · BEGIN Q3`, outlined `COME BACK LATER`.
- On close: retired priorities removed (their projects unlinked, kept); adjusted ones store the change note as `adjust`; decisions saved to history; quarter key marked closed so UI advances to the next quarter.

**Birthday** (sheet exists in prototype; entry point was removed — add one in Settings / onboarding): date input, live preview `Today falls in Year 24 · Quarter 2 · August 1 – October 31, 2026`, `SAVE` / `CANCEL`. Reject future dates.

## Notification
- Daily local notification (prototype simulates it as an in-app banner 900ms after load; real app: user-chosen time, default 08:30).
- Content: title `3 deathcookies to eat`, body `Start with: {first open deathcookie}`. Singular `1 deathcookie to eat`. Zero → `No deathcookies today` / `Plate is clean. Nothing urgent to eat.`
- Banner style: 12px from sides, bg `rgba(22,22,22,.96)` + blur 12, 1px `#3a3a3a`, radius 14, shadow `0 12px 40px rgba(0,0,0,.6)`; enters translateY(−20px)→0 over 450ms; auto-dismiss 8s; tap dismisses.
- **App icon:** solid black circle on white. In banner: 38×38 white tile radius 9 with 20×20 black circle.
- App name everywhere: **Deathcookies**.

## Date logic (critical)
```
yearStart = most recent occurrence of birthday (month/day) on or before today
yearNumber = yearStart.year − birthYear
quarterStarts = yearStart + 0, 3, 6, 9 months (clamp day to month length)
quarter q = last start ≤ today; quarterEnd = nextStart − 1 day
week of quarter = floor((dayOfQuarter − 1) / 7) + 1; total weeks = ceil(daysInQuarter / 7)
```
Birthday May 1 → Q1 May 1–Jul 31, Q2 Aug 1–Oct 31, Q3 Nov 1–Jan 31, Q4 Feb 1–Apr 30.
Quarter review card window: today ≥ quarterEnd − 14 days.

## State (persist all locally)
- `birthday: 'YYYY-MM-DD'`
- `priorities: [{id, title, category: 'hobby'|'health'|'career'|'finances'|'relationship', why, progress, status: 'active'|'paused', adjust?}]` — max 3 active
- `projects: [{id, name, priorityId|null}]`
- `activity: [{date, text, projectId}]` — drives "last activity" on project cards (prototype uses fixed sample; real app needs a way to log activity, e.g. tap a project → "log something")
- `cookies: [{id, text, done}]`
- `backburner: [{id, text, date}]`
- `quarterReviews: [{date, decisions: [{title, decision, note}]}]`, `closedQuarterKeys: string[]`
- `notificationTime: 'HH:MM'`, `notificationsOn: bool`
- UI-only: `expanded{id:bool}`, `editingId`, `editDraft`, `addingProjectFor`, open sheet.

## Design tokens
Colors: bg `#000000` · surface `#0f0f0f` · surface-2 `#161616` · border `#262626` · border-2 `#2a2a2a` · input border `#333333` · dashed `#3a3a3a` · text `#f5f5f5` · text-2 `#d0d0d0` · muted `#a8a8a8` · faint `#8a8a8a` · disabled `#6a6a6a` · primary button `#f5f5f5` (hover `#ffffff`) on `#000`.
Type: **Archivo** (Google Fonts; 600/700/800) for headings/body; **JetBrains Mono** (400/500/600) for labels, meta, buttons. Body 15px/1.5. Inputs 16px (prevents iOS zoom).
Radii: 4 (cards), 3 (inputs/buttons/sub-cards), 2 (tags/checkbox/segments), 14 (notification), 9 (icon tile).
Spacing: section gap 24 · list gap 10 · card padding 14–16 · sheet padding 20.
Touch targets: ≥ 44px everywhere.
Motion: fade-in on mount 350ms ease-out (opacity + 6px rise); sheet 350ms cubic-bezier(.2,.8,.2,1); chevron 200ms.

## Assets
None — no images or icon files. Icon is a black circle on white (generate 1024×1024 for the app icon). Fonts from Google Fonts.

## Files
- `Deathcookies.dc.html` — the full prototype (template + logic class with all data, date math and handlers). Ignore the `frame` / `scenario` / `showReminder` props; they're prototype-only toggles. Some removed screens (weekly review, past reviews) still have dead logic in the class — don't implement them.
- `ios-frame.jsx` — prototype-only iPhone bezel. Not part of the app.
- `support.js` — prototype runtime. Not part of the app.
