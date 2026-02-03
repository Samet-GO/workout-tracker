# Workout Tracker - Session State

**Last updated**: 2026-02-03
**Build status**: PASSING (`npm run build` = 0 errors)
**Branch**: main
**Deployed**: https://github.com/Samet-GO/workout-tracker → Vercel (pending user setup)

---

## Current Status: P0/P1/P2 Complete ✅

### Session Summary (2026-02-03)

**Decisions Made**:
- Positioning: Privacy-First Minimalist (optional sync to fitness apps later)
- Monetization: One-time purchase (App Store distribution)
- Maintenance: Quarterly updates + micro bug fixes
- Platform: PWA for now, native wrapper later

**P0 — Critical (✅ Complete)**:
- [x] Auto-backup to localStorage on workout complete
- [x] Cloud folder backup option (File System Access API)
- [x] Modal race conditions fixed (RpePrompt, MoodEnergyPrompt)
- [x] IndexedDB health check with error UI
- [x] Storage.persist() status in Settings with request button
- [x] Browser-specific warnings (Safari 7-day eviction, iOS instability, private browsing)
- [x] Storage usage indicator

**P1 — Important (✅ Complete)**:
- [x] PWA install prompt (Chrome/Edge + iOS instructions)
- [x] Mood prompt toggle (progressive disclosure)
- [x] Backup confirmation on workout complete page

**P2 — Nice-to-have (✅ Complete)**:
- [x] Offline status indicator (amber bar offline, green reconnect)
- [x] Empty state improvements (plans, strength chart, streak calendar, mood chart)
- [x] Accessibility audit (WCAG 2.1 AA compliance)
- [x] Recovery guide documentation (/recovery-guide.html + Settings link)
- [x] Landing page (/landing.html with privacy-first positioning)

### Key Files Changed This Session
| File | Changes |
|------|---------|
| `src/lib/export.ts` | Added local backup, File System Access API functions |
| `src/lib/db.ts` | Browser detection, health check, storage estimate, isDiskFullError |
| `src/components/layout/db-provider.tsx` | Warning banners, error UI for DB unavailable |
| `src/components/layout/install-prompt.tsx` | PWA install detection + iOS instructions |
| `src/components/layout/offline-indicator.tsx` | New: offline/online status bar |
| `src/app/settings/page.tsx` | Cloud backup UI, mood toggle, storage indicator |
| `src/app/workout/complete/page.tsx` | Backup confirmation card |
| `src/app/plans/page.tsx` | Improved empty state |
| `src/components/progress/strength-chart.tsx` | Improved empty states + a11y (labels, aria-pressed) |
| `src/components/progress/streak-calendar.tsx` | Added empty state (was null) |
| `src/components/progress/mood-energy-chart.tsx` | Improved empty state with settings link |
| `docs/business-analysis.md` | All decisions + research documented |
| `src/app/layout.tsx` | A11y: Skip link for keyboard users |
| `src/components/ui/sheet.tsx` | A11y: dialog role, aria-modal, focus trap, Escape key |
| `src/components/ui/input.tsx` | A11y: dark mode labels, error/description support, aria-invalid |
| `src/components/layout/bottom-nav.tsx` | A11y: aria-label, aria-current, sr-only badge text |
| `src/components/workout/exercise-card.tsx` | A11y: aria-expanded, keyboard delete, proper labels |
| `src/components/workout/rpe-prompt.tsx` | A11y: dialog role, Escape key, aria-pressed, progressbar |
| `src/components/workout/mood-energy-prompt.tsx` | A11y: dialog role, Escape key, aria-pressed, dark mode |
| `src/components/workout/set-logger.tsx` | A11y: proper label associations, form role |
| `src/components/shared/weight-input.tsx` | A11y: button labels, group role, focus styles |
| `public/recovery-guide.html` | New: Data recovery guide for users |
| `public/landing.html` | New: Marketing landing page |

### Recent Commits
```
deadf31 Fix set counting bug and improve RPE prompt
7e47d3e Fix dark mode colors in exercise logging components
d375474 Fix mood/energy prompt not closing after submission
1fc374c Add complete workout tracker PWA
```

### Next Steps
- P0/P1/P2 all complete
- App ready for production deployment
- Future considerations: i18n, Apple/Google Health sync, native app wrapper

---

## Previous: Sprint G — Seed Re-ID & Database Hygiene Fixes (COMPLETE)

Fixes 6 issues identified by the specification review panel.

### What Changed
- **G1**: `StructureType` union type added to constants.ts; `TemplatePart.structure` and `TemplatePartSeed.structure` typed as `StructureType?` instead of `string?`
- **G2**: `seedVersion?: number` added to `UserPreferences` interface (non-indexed, no schema bump)
- **G3**: `seed.ts` fully rewritten with conditional re-seed strategy:
  - Reads `seedVersion` from IndexedDB (UserPreferences), not localStorage
  - Version match → skip, return early
  - Version mismatch + no sessions → clear template tables + re-seed from scratch
  - Version mismatch + sessions exist → update template metadata only (preserves IDs)
  - New templates always seeded fully even when sessions exist
  - Throws error (not console.warn) when `_exerciseName` doesn't resolve
  - All localStorage usage removed
  - `SEED_VERSION` bumped to 3
- **G4**: `navigator.storage.persist()` called after seed completes in db-provider (silent, logs result)
- **G5**: Plans and workout pages now load only referenced exercises (~5-15) instead of all 109
  - Plans page: collects exerciseIds from dayData.exercisesByPart, queries `db.exercises.where('id').anyOf([...ids])`
  - Workout page: collects exerciseIds from templateExercises, same optimized query

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/constants.ts` | Added STRUCTURE_TYPES + StructureType |
| `src/lib/db.ts` | seedVersion on UserPreferences, StructureType on TemplatePart |
| `src/data/templates/types.ts` | StructureType on TemplatePartSeed |
| `src/lib/seed.ts` | Full rewrite: conditional re-seed, IndexedDB version, throw on name miss |
| `src/components/layout/db-provider.tsx` | Added navigator.storage.persist() |
| `src/app/plans/[planId]/page.tsx` | Optimized exercise query |
| `src/app/workout/page.tsx` | Optimized exercise query |

### Verification
- `tsc --noEmit` passes with 0 errors
- Fresh install: clear IndexedDB → 8 templates seeded, seedVersion=3 in UserPreferences
- Existing user (no sessions): version bump clears and re-seeds templates
- Existing user (with sessions): version bump updates metadata only, IDs preserved
- Exercise typo: seed throws error instead of console.warn
- Console shows "Persistent storage granted/not granted"
- Plans/workout pages load ~15 exercises instead of 109

---

## Sprint F — Straight Sets Conversion & Template Cleanup (COMPLETE)

User feedback after Sprint E:
1. **Alternating sets not possible at user's gym** — needs straight sets (finish all sets of one exercise before next)
2. **Template names don't match PDF** — names like "Casual I: Full Body Hypertrophy" with "General hypertrophy for beginners" are not in the PDF
3. **Flexible workout days** — user wants to define own schedule (already supported, no change needed)

### What Changed
- All 8 template files rewritten: exercises reordered from alternating (A1-B1-A2-B2) to straight sets (A1-A2-A3-B1-B2-B3)
- Template names fixed to match PDF: "Casual Template I", "Moderate Template II", etc.
- Descriptions standardized: "1-Day Split | 60 Minutes | Hypertrophy", "2-Day Split | 90 Minutes | Strength", etc.
- Part names cleaned up (removed "Alternating Sets" suffix)
- `structure` field updated to `"straight-sets"` on converted parts
- Circuit parts kept as-is (accessories circuits are fine)
- `index.ts` — no changes needed (just re-exports objects)
- `tsc --noEmit` passes with 0 errors

### Files Modified
| File | Changes |
|------|---------|
| `src/data/templates/casual-1-60-hyp.ts` | F1: Name, desc, straight sets, reordered |
| `src/data/templates/casual-2-60-str.ts` | F2: Name, desc, straight sets, reordered |
| `src/data/templates/casual-3-90-hyp.ts` | F3: Name, desc, straight sets, reordered |
| `src/data/templates/casual-4-90-str.ts` | F4: Name, desc, straight sets, reordered |
| `src/data/templates/moderate-1-60-hyp.ts` | F5: Name, desc, Day 2 parts converted |
| `src/data/templates/moderate-2-60-str.ts` | F6: Name, desc, Day 1 Part 4 + Day 2 parts converted |
| `src/data/templates/moderate-3-90-hyp.ts` | F7: Name, desc, Day 1 Part 5 + Day 2 parts converted |
| `src/data/templates/moderate-4-90-str.ts` | F8: Name, desc, Day 2 parts converted |

### After Sprint F
User must: clear IndexedDB (Application → Storage → Clear site data) and reload to re-seed templates.

---

## Sprint E — Color Palette & Day Display Bugs (COMPLETE)

---

## Sprint E: Color Palette & Day Display Bugs

### E1: Fix Dark Mode on Badge Component — COMPLETE
**File**: `src/components/ui/badge.tsx`
**Problem**: All 6 badge variants use light-only colors (e.g., `bg-zinc-100 text-zinc-800`). No `dark:` prefixes anywhere.
**Fix**: Add dark variants to every badge variant:
- `default`: add `dark:bg-blue-900/50 dark:text-blue-300`
- `secondary`: add `dark:bg-zinc-800 dark:text-zinc-300`
- `success`: add `dark:bg-green-900/50 dark:text-green-300`
- `warning`: add `dark:bg-amber-900/50 dark:text-amber-300`
- `destructive`: add `dark:bg-red-900/50 dark:text-red-300`
- `outline`: add `dark:border-zinc-600 dark:text-zinc-300`

### E2: Fix Dark Mode on Plan Card — COMPLETE
**File**: `src/components/plans/plan-card.tsx`
**Problem**: Hardcoded light colors: `text-zinc-900`, `text-zinc-500`, `bg-blue-50`, `text-blue-700`
**Fix**: Add dark variants:
- `text-zinc-900` → add `dark:text-zinc-100`
- `text-zinc-500` → add `dark:text-zinc-400`
- `bg-blue-50 text-blue-700` → add `dark:bg-blue-900/30 dark:text-blue-300`

### E3: Fix Dark Mode on Plan Detail Page — COMPLETE
**File**: `src/app/plans/[planId]/page.tsx`
**Problem**: Extensive hardcoded light-only colors:
- Header bar: `bg-white/80`, `border-zinc-200`, `text-zinc-900` — no dark variants
- Description: `text-zinc-600` — no dark variant
- Day selector: `text-zinc-700`, `border-blue-600`, `bg-blue-50`, `text-blue-700`, `border-zinc-200`, `text-zinc-600` — no dark variants
- Exercise rows: `bg-zinc-50`, `text-zinc-900`, `text-zinc-500` — no dark variants
- Part headings: `text-zinc-900` — no dark variant (inside Card which does have dark mode)
**Fix**: Add `dark:` counterparts to every hardcoded zinc/blue color class.

### E4: Fix Dark Mode on Plans List Page Skeleton — COMPLETE
**File**: `src/app/plans/page.tsx`
**Problem**: Skeleton uses `bg-zinc-200` without dark variant
**Fix**: Add `dark:bg-zinc-800`

### E5: Fix Exercise Loading Race Condition — COMPLETE
**File**: `src/app/plans/[planId]/page.tsx`
**Root cause**: The `exercises` array from `useLiveQuery(() => db.exercises.toArray(), [])` is NOT included in the loading guard. Currently:
```tsx
if (!template || !dayData) { return loading spinner }
```
When `exercises` is `undefined` (still loading), `exerciseMap` becomes an empty Map. ALL named exercises show as "Unknown" regardless of day, making different days appear identical.
**Fix**: Change the guard to:
```tsx
if (!template || !dayData || !exercises) { return loading spinner }
```
This single-line fix resolves both the "exercises not in PDF" complaint AND the "all days look the same" complaint.

### E6: Verify Template Data Accuracy (VERIFIED — NO CHANGES NEEDED)
Template exercise data was cross-referenced against the PDF:
- All `_exerciseName` values resolve to valid exercises in the database:
  - "Chin-Up" → exists in `lats.ts`
  - "Lat Pulldown" → exists in `back.ts`
  - "Barbell Bench Press" → exists in `chest.ts`
  - "Lateral Raise" → exists in `shoulders.ts`
  - "Incline Dumbbell Curl" → exists in `biceps.ts`
  - "Dip" → exists in `triceps.ts`
  - "Barbell Squat", "Leg Press", "Leg Extension" → exist in `quads.ts`
  - "Lying Leg Curl" → exists in `hamstrings.ts`
  - "Hip Thrust" → exists in `glutes.ts`
  - "Overhead Press" → exists in `shoulders.ts`
  - "Tricep Pushdown" → exists in `triceps.ts`
  - "Straight-Arm Pulldown" → exists in `back.ts`
  - "Barbell Shrug" → exists in `traps.ts`
  - "Barbell Curl" → exists in `biceps.ts`
  - "Barbell Row" → exists in `back.ts`
- Exercise data (reps, rest, weight/intensity descriptors) matches PDF tables
- **The "wrong exercises" the user sees is caused by E5 (loading race condition showing "Unknown")**

---

## Sprint D: UX Fix Plan (PREVIOUS — COMPLETE)

### D1: Improve Plan Detail Page (`/plans/[planId]/page.tsx`) — COMPLETE
- [x] Show **weight descriptor** per exercise (Dumbbell icon + "Light"/"Moderate"/"Heavy")
- [x] Show **rest time** per exercise (Timer icon + "Rest 60s")
- [x] Show **part structure type** badge under part name ("Alternating Sets", "Circuit", "Straight Sets")
- [x] Better visual grouping with section headers + badges
- [x] Exercise notes displayed in italic below each exercise

### D2: Improve Exercise Card During Workout (`/components/workout/exercise-card.tsx`) — COMPLETE
- [x] Add "Logging: Exercise Name — Set X of Y" label near the SetLogger area
- [x] Show rest time near the set logger
- [x] Weight/intensity descriptors already visible in collapsed card subtitle (were already there)

### D3: Improve Workout Page (`/workout/page.tsx`) — COMPLETE
- [x] Choice exercise picker now shows weight/intensity descriptors
- [x] Part headers show structure badge (alternating sets, circuit, etc.)

### D4: Add Part-Level Notes to Templates (data layer) — DEFERRED
- [ ] Add optional `notes` field to `TemplatePartSeed` type
- [ ] Add `notes` column to `templateParts` table in DB schema
- [ ] Populate part-level notes from PDF data

---

## Key Files for Sprint D

| File | What to Change |
|------|---------------|
| `src/app/plans/[planId]/page.tsx` | Enhanced plan detail display — add weight/rest/structure info |
| `src/components/workout/exercise-card.tsx` | Add exercise name label near set logger |
| `src/data/templates/types.ts` | Add optional `notes` to `TemplatePartSeed` |
| `src/lib/db.ts` | Add `notes` to `templateParts` table |
| `src/lib/seed.ts` | Persist part notes during seed |
| `src/data/templates/*.ts` | Add part-level notes from PDF |

---

## Context From PDF (068-101.pdf)

The source PDF contains 8 Coach Greg workout templates with this structure per template:
- **Template header**: Name, split type, duration, focus
- **Per-part**: Section name, Notes & Instructions block, exercise table
- **Per-exercise**: Order, Category, Exercise name, Reps, Rest, Weight, Intensity
- **Part notes contain critical coaching cues**: pause reps, deadlift safety, belt usage, progressive overload guidance, TUT instructions

### Template Data Accuracy
Template data (exercises, reps, rest, weight/intensity descriptors) was verified against the PDF and is correct. The issue is display-only.

### PDF Templates Overview
- **Casual I-IV**: 1-day full-body splits (60min/90min, hypertrophy/strength)
  - 3 parts each: compound alternating sets, compound alternating sets, accessory circuit
  - Casual plans have 2-3 circuit rounds
- **Moderate I-IV**: 2-day splits (lower/upper, 60min/90min, hypertrophy/strength)
  - Day 1: Legs & Biceps (straight sets + accessory circuit + biceps/calves finisher)
  - Day 2: Upper & Back (deadlifts + bench/back alternating + accessories)

---

## Sprint Completion Summary (Previous)

### Sprint A: Templates — COMPLETE
All 8 Coach Greg templates rewritten to match the original prompt:
- [x] Casual I: 60min Hypertrophy (1-day, alternating sets + 2 circuit rounds)
- [x] Casual II: 60min Strength (1-day, alternating sets + 3 circuit rounds)
- [x] Casual III: 90min Hypertrophy (1-day, expanded volume)
- [x] Casual IV: 90min Strength (1-day, expanded volume, lower reps)
- [x] Moderate I: 60min Hypertrophy (2-day split: lower/upper)
- [x] Moderate II: 60min Strength (2-day split: lower/upper)
- [x] Moderate III: 90min Hypertrophy (2-day split, drop sets, forced reps)
- [x] Moderate IV: 90min Strength (2-day split, expanded)
- [x] templates/index.ts exports exactly 8 templates
- [x] Plan detail page shows intensity descriptors (Easy/Moderate/Hard/All Out)
- [x] Exercise card shows "X reps" for targetSets=1 pattern
- [x] Weight and intensity descriptors visible per exercise

### Sprint B: Missing Features — COMPLETE
- [x] B1: Mood/energy scale expanded from 1-5 to 1-10 with labeled levels and color coding
- [x] B2: Smart suggestions in QuickLogBar based on previous RPE + current energy
- [x] B3: Streak tracking logic (consecutive weeks with ≥1 workout)
- [x] B4: Streak calendar component on progress page (12-week grid, flame icon)
- [x] B5: Swipe-to-delete on logged sets (framer-motion drag with red delete backdrop)
- [x] B6: Tap-to-edit on logged sets (inline editor with weight/reps, save/cancel)
- [x] `updateSet` added to useActiveWorkout hook
- [x] Energy level passed through to QuickLogBar for smart suggestions

### Sprint C: Quality & Polish — COMPLETE
- [x] C1: RPE button min-height increased to 44px
- [x] C2: Special set toggle buttons min-height increased to 44px with larger padding
- [x] C3: localStorage draft persistence for manual set weight/reps (auto-save, clear on submit)
- [x] C4: Improved insight cards with exercise-specific plateau narratives + mood/energy volume correlation
- [x] C5: Workout history list already present on progress page (date, plan name, sets, volume, duration)
- [x] C6: Dark mode classes added to mood prompt, workout header, streak calendar

---

## What Exists Now (Complete Feature Set)

### Infrastructure
- Next.js 16.1.6 with App Router + Turbopack
- Dexie.js 4 (IndexedDB) with 7 tables, proper indexes
- Tailwind CSS v4 + CVA + dark mode (`.dark` class strategy)
- PWA: `@ducanh2912/next-pwa`, manifest.json, service worker
- Recharts for charts (dynamic import, `ssr: false`)
- Framer Motion for animations
- Web Audio API for rest timer beep
- 109 exercises across 13 muscle groups
- Idempotent seed function with `_exerciseName` → `exerciseId` resolution

### Pages (8 routes)
| Route | Status | What It Does |
|-------|--------|--------------|
| `/` | Working | Onboarding check → redirect to `/plans` |
| `/plans` | Working | Lists all 8 Coach Greg templates |
| `/plans/[planId]` | Working | Template detail with intensity badges, day selector |
| `/workout` | Working | Active workout: exercise cards, set logging, swipe/tap, rest timer, RPE, smart suggestions |
| `/workout/complete` | Working | Post-workout summary: sets, volume, duration |
| `/exercises` | Working | Exercise library with search + muscle group filter |
| `/progress` | Working | Streak calendar, insight cards (plateau + mood/energy), volume chart, strength chart, mood chart, history |
| `/settings` | Working | Theme, weight unit, rest timer, RPE toggle, increment, export/import |

### Components (27 total)
- **UI**: button, card, badge, input (4)
- **Layout**: bottom-nav, header, theme-provider, db-provider (4)
- **Workout**: exercise-card, set-logger, quick-log-bar, rest-timer, rpe-prompt, mood-energy-prompt, special-set-input (7)
- **Plans**: plan-card, exercise-picker (2)
- **Progress**: volume-chart, strength-chart, mood-energy-chart, plateau-alerts, insight-cards, streak-calendar (6)
- **Onboarding**: welcome-screen (1)
- **Shared**: weight-input (1)

### Hooks (5)
| Hook | Purpose |
|------|---------|
| `use-active-workout` | Start/log/delete/update/complete workout sessions + sets |
| `use-previous-workout` | Fetch most recent completed session for same template/day |
| `use-rest-timer` | Countdown timer with callback on complete |
| `use-exercise-history` | All sets for an exercise + best set |
| `use-preferences` | Read/update user preferences singleton |

### UX Features
- Three-tap flow: Plans → Start Workout → Match (copies previous set)
- QuickLogBar: Match / +2.5 / +5 buttons with haptic feedback + smart suggestions
- Smart suggestions based on previous RPE and current energy level
- Previous workout preload with set-by-set comparison
- Rest timer with countdown, skip, and beep
- RPE prompt: optional, auto-dismiss 3s, swipe-to-dismiss, 44px touch targets
- Mood/energy prompt: 1-10 scale with color coding and labeled levels
- Swipe-to-delete on logged sets (framer-motion drag)
- Tap-to-edit on logged sets (inline editor)
- localStorage draft persistence for manual set inputs
- Progressive disclosure: advanced set options hidden, first incomplete exercise auto-expanded
- Bottom nav: fixed, 64px height, `pb-safe` for iPhone, 4 tabs
- Dark mode: system/light/dark with CSS variables, verified on all pages
- Onboarding: 3-step welcome for first-time users
- Data export/import: full JSON backup/restore
- Workout streak tracking (consecutive weeks) with 12-week calendar grid
- Insight cards: consistency, volume trends, plateau detection, energy/volume correlation

---

## Architecture Reference

### Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS + CVA | v4 |
| Database | Dexie.js (IndexedDB) | 4.3.0 |
| Charts | Recharts | 3.7.0 |
| Animation | Framer Motion | 12.29.3 |
| Icons | Lucide React | 0.563.0 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |
| Validation | Zod | 4.3.6 |

### Database Schema (7 tables)
```
exercises:        ++id, name, muscleGroup, equipment, isCustom
workoutTemplates: ++id, name, frequency
templateParts:    ++id, templateId, dayIndex, partOrder
templateExercises:++id, partId, exerciseId, isChoice, order
workoutSessions:  ++id, templateId, dayIndex, startedAt, completedAt
workoutSets:      ++id, sessionId, exerciseId, templateExerciseId, completedAt
userPreferences:  ++id
```

### Key Types on workoutSets
`weight, reps, rpe?, partialsCount?, dropSetWeight?, dropSetReps?, forcedRepsCount?, isPausedReps?`

### Key Types on workoutSessions
`templateId, dayIndex, startedAt, completedAt?, mood? (1-10), energy? (1-10), notes?`

### Key Types on templateExercises
`targetSets, targetReps, restSeconds, isChoice, choiceMuscleGroup?, weightDescriptor?, intensityDescriptor?, specialSetType?, notes?, order`

### Key Types on templateParts (current)
`templateId, dayIndex, partOrder, name, structure?`
**Needs**: `notes?` field added for part-level coach instructions

### Project Structure
```
src/
├── app/           8 pages (layout, home, plans, plans/[id], workout, workout/complete, exercises, progress, settings)
├── components/    27 components across ui/, layout/, workout/, plans/, progress/, onboarding/, shared/
├── hooks/         5 hooks (active-workout, previous-workout, rest-timer, exercise-history, preferences)
├── lib/           7 files (db, seed, utils, constants, analytics, export, sound)
└── data/
    ├── exercises/ 13 muscle group files + types + index (109 exercises)
    └── templates/ 8 template files + types + index
```

### Known Quirks
- `turbopack: {}` in next.config.ts required for PWA plugin compatibility
- Recharts Tooltip formatter signature: `(value: number | undefined, name?: string)`
- Dexie `bulkAdd({ allKeys: true })` returns need cast as `number[]`
- `useLiveQuery` deps must be stable primitives (use `.map(p => p.id).join(",")` not array refs)
- Home page uses `localStorage` for onboarding flag + Dexie for session count
- Set draft persistence uses `localStorage` key `set-draft-{exerciseId}`

---

## How to Resume

```
Read /home/ogsam/projects/workout-tracker/docs/session_state.md then [your request]
```

**Sprint F (straight sets conversion) is COMPLETE.** All 8 templates rewritten with straight-set ordering, correct names, and updated structure labels. Build passes.

To verify: clear IndexedDB (Application → Storage → Clear site data), reload, check plan detail pages show exercises grouped by exercise (all sets of one exercise together).

D4 (part-level notes from PDF) still deferred. Reference the PDF at `/home/ogsam/projects/workout-tracker/docs/068-101.pdf` for source workout data.
