# Handoff: Deathcookies — Weeklies, Rejection Therapy, tab bar

## Overview
This update to the Deathcookies app (`yalemiller-lh/Deathcookies`) does four things:
1. **Removes** Priorities (with projects, the editor, Set aside), the Backburner, the Promote sheet and the Quarter review sheet/card.
2. **Adds Weeklies**: a recurring checklist whose ticks clear every Monday.
3. **Adds a second tab, Rejection Therapy**: 100 numbered cards, done one at a time.
4. **Adds a bottom tab bar**: `Today` · `Rejection Therapy`.

These stay as they are now in the repo: header, quote of the day (opens the Quotes sheet), Deathcookies, footer (Quotes · Settings), Settings sheet, Quotes sheet, Birthday sheet, update banner and the daily reminder.

## About the design files
`Deathcookies.dc.html` is a **design reference built in HTML**. It's a prototype that shows the intended look and behaviour; it isn't production code. Rebuild it in the existing codebase (React + TypeScript + Vite, Firestore, layered `domain/ → data/ → ui/`), following the repo's patterns: pure domain commands that return `Change[]`, class names in `src/ui/styles.css`, and the tokens already defined there. Open the file in a browser to try it. The Tweaks panel has a **scenario** switch (Oct 7 / Oct 12 / Oct 29); moving to a different week shows Weeklies resetting.

## Fidelity
**High fidelity.** Colours, type and spacing match `src/ui/styles.css` exactly. Reuse the existing classes wherever this README names them.

---

## Screens

### Tab bar (new; on every screen)
- Fixed to the bottom of the viewport, `z-index: 10`, background `#000`, `border-top: 1px solid var(--border)` (#262626).
- Padding is `6px 8px` plus `calc(14px + env(safe-area-inset-bottom))` at the bottom.
- Two equal buttons (`flex: 1`), `min-height: 48px`, laid out as a column with `gap: 6px`, centred.
  - Indicator: a `24×2px` bar above the label, `var(--text)` when active and transparent otherwise.
  - Label: `var(--mono)` 11px, `letter-spacing: .1em`, uppercase. Active: `var(--text)` at weight 600. Inactive: `var(--faint)` (#8a8a8a) at weight 500.
- Labels: **Today**, **Rejection Therapy**.
- Switching tabs scrolls to the top (`window.scrollTo({ top: 0 })`).
- `.page` needs extra bottom padding so content clears the bar: about `calc(env(safe-area-inset-bottom) + 110px)`.
- Use `role="tablist"`/`role="tab"` with `aria-selected`.

### Today tab (the current `Home`, reduced)
Order inside `.column` (gap 24px):
1. `Header` (unchanged): eyebrow `YEAR n · QUARTER n`, the `.h1` date, and the `.week-line`.
2. The quote button (unchanged).
3. `Cookies` (unchanged).
4. **Weeklies** (new, described below).
5. `footer.footer`: `Quotes` · `Settings` (unchanged).

Remove: the `closedNotice` notice, the review card, `Priorities`, `Backburner`, `SetAside`, `PromoteSheet` and `QuarterReviewSheet`.

### Weeklies section (new)
It's built the same way as `Cookies`:
- `section.section` with `SectionHeader title="Weeklies" meta="{done} of {total}"`, e.g. `2 of 5`.
- `div.list` contains one row per item, then `AddRow` with placeholder **"Something to do every week…"**, label "New weekly".
- **Row:** a flex row with `border-bottom: 1px solid var(--border)`, holding:
  - A checkbox button with `flex: 1`. Use `.cookie-row` styling but with `padding: 14px 0 14px 16px` and no border of its own: `.checkbox` + `.cookie-text`, adding `is-on` / `is-done` when ticked this week. Use `role="checkbox"` and `aria-checked`.
  - A remove button styled as `.idea-remove` (44×44, `×`, colour `var(--disabled)`, hover `var(--text)`), `aria-label="Remove {text}"`.
- Under the list: `span.hint` (mono 12px), colour `var(--faint)`, reading **`Resets Monday, {Month D}`**. The date is next week's Monday.

**Reset rule.** Each item stores `doneWeek: ISODate | null`, which is the Monday that starts the week it was ticked. An item counts as done only when `doneWeek === mondayOf(today)`. Nothing has to run on Monday: last week's ticks just stop matching. Ticking sets `doneWeek` to this week's Monday; unticking sets it to null. Weeks start on **Monday** in the device's local time: `mondayOf(d) = d − ((d.getDay() + 6) % 7)` days.

### Rejection Therapy tab (new)
`.column`, gap 24px:
1. **Header**
   - Eyebrow (`.eyebrow`): `REJECTION THERAPY`.
   - `.h1`: the percentage done, `Math.round(done / 100 * 100)%`, e.g. **`2%`**.
   - `.week-line`: `{100 − done} NOS TO GO`, using singular "no" when 1 is left. When all 100 are done it reads `ALL ONE HUNDRED`.
2. **Section** (`section.section`) with `SectionHeader title="100 rejections" meta="{done} done"`.
3. **Current card** (shown while done < 100)
   - A `form`, laid out as a column with gap 12px, padding `14px 16px`, background `var(--surface)` (#0f0f0f), `1px solid var(--text)`, radius 4px.
   - First row (gap 14px): an empty `.checkbox` (20px, `1.5px solid var(--text)`), then `No. {NN}` in mono 12px, `letter-spacing: .1em`, uppercase, weight 600. Numbers are zero-padded to two digits (`03`); card 100 shows `100`.
   - A `.btn-primary.full` labelled **Submit**, min-height 48px.
   - There's no text field. Submit just marks this card done.
4. **When all 100 are done**, replace the card with a `.notice`: title **"A hundred no's."**, body **"Every card is filled. They are all below."**
5. **List** (`div.list`), in this order:
   - **Upcoming cards**, from current + 1 to 100, one row each:
     - Flex row, gap 14px, `min-height: 44px`, padding `10px 16px`, bottom border.
     - An empty checkbox with border `var(--dashed)` (#3a3a3a).
     - `No. {NN}` in mono 12px, `letter-spacing: .1em`, uppercase, colour `var(--disabled)` (#6a6a6a).
   - **Done cards** at the bottom, in the order they were completed (No. 01 first):
     - Row with gap 14px, padding `14px 16px`, bottom border.
     - A filled checkbox (`.checkbox.is-on`).
     - Then a column holding `No. {NN}` (mono 12px, `var(--faint)`) on the left and the date on the right: `Oct 5`, mono 11px, `letter-spacing: .06em`, uppercase, `var(--disabled)`.

Submitting moves the card from the top to the bottom of the list, and the next number becomes the current card.

---

## Data model changes (`src/domain/model.ts`, Firestore)

Add:
```ts
export interface Weekly { id: string; text: string; doneWeek: ISODate | null; createdAt: number; }
export interface Rejection { id: string; n: number; date: ISODate; createdAt: number; } // n = 1..100
export const REJECTION_TOTAL = 100;
// PlannerState: + weeklies: Weekly[]; + rejections: Rejection[];
```
Firestore:
```
users/{uid}/weeklies/{id}     text, doneWeek, createdAt
users/{uid}/rejections/{id}   n, date, createdAt
```
Domain commands (new `src/domain/weeklies.ts` and `src/domain/rejections.ts`, each with tests):
- `addWeekly(text, ctx)`: trim the text; empty text returns `[]`.
- `toggleWeekly(state, id, ctx)`: switch `doneWeek` between `mondayOf(ctx.now)` and `null`.
- `removeWeekly(state, id)`
- `isDoneThisWeek(w, today)` and `weeklySummary(state, today)`, which returns `{ done, total }`.
- `logRejection(state, ctx)`: `n = max(n) + 1`, using the local date. Return `[]` when n would go past 100. Taking the max of `n` keeps two devices from both creating card N.
- `rejectionProgress(state)`, which returns `{ done, current: number | null, percent }`.

Remove, along with their UI and tests: priorities, projects, activity, backburner, quarterReviews, `closedQuarterKeys`, `quarterReview.ts`, `priorities.ts`, `projects.ts` and `backburner.ts`. **Leave existing Firestore documents where they are.** Just stop reading them, so nothing is lost if this needs to be undone. The quarter maths in `dates.ts` stays, because the header still shows Year/Quarter and the week line.

## Reminder
No change. It still counts open deathcookies (`reminder.ts`). Weeklies and rejections aren't mentioned in it.

## Sample content in the prototype
- Weeklies: "Three runs, however short", "Call Nan", "Plan the week's meals", "One morning in the studio", "Inbox to zero".
- Two rejections already done.

All of this is placeholder. The real app starts empty.

## Design tokens
These are unchanged; use `src/ui/styles.css` `:root`:
- **Colours:** bg #000, surface #0f0f0f, surface-2 #161616, hover #141414, border #262626, border-2 #2a2a2a, input-border #333, dashed #3a3a3a, text #f5f5f5, text-2 #d0d0d0, muted #a8a8a8, faint #8a8a8a, disabled #6a6a6a.
- **Type:** Archivo (400–800) for UI, JetBrains Mono (400–600) for labels.
- **Radii:** 4px for cards and lists, 3px for buttons and inputs, 2px for checkboxes.

## Files
- `Deathcookies.dc.html`: the prototype. Its logic class at the bottom of the file contains the reference implementation of the week-reset and card-numbering rules.
- `ios-frame.jsx`: the phone frame used for previewing only; don't ship it.
- `support.js`: the runtime the prototype needs to open in a browser.
