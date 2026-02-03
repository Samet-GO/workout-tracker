# Workout Tracker — Business Analysis & Decision Framework

> Token-efficient reference doc from 9-expert business panel analysis.
> Use symbols: ✅ done | ⏳ pending | ❌ rejected | 🔴 critical | 🟡 important | 🟢 nice-to-have

---

## 1. Core Identity

### What Job Does This App Do?
```
Functional: Log sets/weights/reps during workout
Emotional:  Feel organized & in control of fitness
Social:     Have data to share w/ trainers/buddies
```

### Positioning Options (pick one)

| Option | Tagline | Trade-off |
|--------|---------|-----------|
| A. Privacy-First | "No cloud. No account. Your data." | Limits growth, maximizes trust |
| B. Minimalist | "Just track. Nothing else." | Competes w/ Notes app |
| C. Serious Lifter | "Built for progressive overload" | Needs more analytics |
| D. Portfolio Piece | N/A — personal project | No growth needed |

**Decision**: ✅ **A+B Hybrid — Privacy-First Minimalist**
- Core: No accounts, no cloud, local-first storage
- UX: Simple tracking, no bloat
- Future: Optional user-initiated sync to Apple Health, Samsung Health, MyFitnessPal, Virtuagym
- Philosophy: "Your data stays yours. Share only when YOU choose."

---

## 2. Competitive Landscape

### Five Forces Summary
```
Rivalry:        🔴 High (Strong, Hevy, JEFIT, FitNotes)
New Entrants:   🔴 High (zero barrier)
Substitutes:    🟡 Med  (paper, spreadsheets, Notes)
Buyer Power:    🔴 High (free alternatives, no lock-in)
Supplier Power: 🟢 Low  (no dependencies)
```

### Potential Moats
1. **Privacy guarantee** — "data never leaves device"
2. **Offline-first** — works in basement gyms, planes
3. **No account friction** — instant start
4. **Export transparency** — user owns data completely

### ERRC Grid (Blue Ocean)
```
ELIMINATE: accounts, subscriptions, cloud sync, social
REDUCE:    onboarding friction, feature complexity
RAISE:     offline reliability, data ownership, speed
CREATE:    export-everything, "workout receipts"
```

---

## 3. Risk Assessment

### Fragility Matrix

| Risk | Severity | Current Mitigation | Gap |
|------|----------|-------------------|-----|
| IndexedDB cleared by browser | 🔴 Critical | `persist()` requested | Not guaranteed |
| Phone dies/lost | 🔴 Critical | Manual export exists | Users forget |
| Modal race conditions | 🟡 Fixed | Ref-based guard added | Other bugs may exist |
| PWA restrictions (iOS) | 🟡 Medium | None | Need graceful degradation |
| No backup reminder | 🔴 Critical | None | **GAP** |

### Antifragility Opportunities
- [x] ~~Auto-export reminder~~ → Backup confirmation after each workout
- [x] ~~Export to device storage~~ → File System Access API for cloud folder backup
- [x] ~~"Recovery guide" if phone lost~~ → /recovery-guide.html
- [ ] Graceful degradation sans service worker

---

## 4. Growth & Sustainability

### Flywheel (if product intent)
```
Track workouts → See progress → Tell gym buddy → Buddy installs → Compare/discuss → Community grows
                                     ↑                                              |
                                     └──────────── Reinforcing Loop ────────────────┘
```

### Economic Engine Options

| Model | Pros | Cons |
|-------|------|------|
| Free forever | No friction, goodwill | No revenue |
| Tip jar | Voluntary, maintains free | Low conversion |
| Pro tier | Revenue potential | Feature gating complexity |
| One-time purchase | Simple, respects users | App Store only |

**Decision**: ✅ **One-time purchase**
- Fits hobby app scope
- Respects users (no subscriptions, no ads)
- Requires App Store distribution (iOS/Android)
- PWA can remain free as "demo" or full version

---

## 5. UX & Communication

### Current State
```
Onboarding:    🟢 Clear welcome screen
Navigation:    🟢 Standard bottom nav
Workout Flow:  🟡 Complex (choice ex, mood, RPE)
Progress Page: 🟡 Dense (many charts)
Error States:  ⚠️ Unknown (IndexedDB failure?)
Export:        🟡 Buried in Settings
```

### Doumont Recommendations
1. Progressive disclosure — hide RPE/mood until opted in
2. Empty states should guide, not just inform
3. Export prominence — critical feature shouldn't be buried
4. "Install as app" prompt on first visit

---

## 6. Technical Debt Signals

### Bug Pattern Analysis
```
Symptom:  Modal not closing after submission
Cause:    Race condition (live query delay vs state update)
Fix:      Ref-based guard to prevent re-trigger
Signal:   Fast prototyping → similar bugs likely exist
```

### Areas to Audit
- [ ] All modal/sheet close handlers
- [ ] All `useEffect` with live query dependencies
- [ ] All async operations with immediate state updates
- [ ] Error boundaries for IndexedDB failures

---

## 7. Blind Spots Identified

| Area | Status | Notes |
|------|--------|-------|
| Accessibility (a11y) | ✅ Done | WCAG 2.1 AA compliant: skip link, focus trap, dialog roles, aria-labels |
| Internationalization | ⏳ English-only | Limits market |
| Legal (GDPR/CCPA) | ⏳ Unknown | Export data implications |
| Offline indicators | ✅ Done | Amber bar when offline, green reconnect notice |

---

## 8. Decision Tree

### Intent Decision (required first)
```
Q: What is this project?
├─ Portfolio piece → Skip growth/monetization sections
├─ Personal tool  → Focus on reliability, skip marketing
├─ Product        → Full roadmap applies
└─ Undecided      → Build MVP, decide based on traction
```

### If Product Intent
```
Q: Growth strategy?
├─ Organic only   → Focus on remarkability, word-of-mouth
├─ Marketing      → Need positioning, landing page, ASO
└─ Community      → Need sharing features, social proof
```

### If Revenue Intent
```
Q: Monetization model?
├─ Free + tips    → Add tip jar, keep all features free
├─ Freemium       → Define free vs pro feature split
├─ Paid app       → App Store distribution, pricing
└─ None           → Sustainable as side project?
```

---

## 9. Prioritized Action Items

### 🔴 P0 — Critical (do before next deploy)
- [x] ~~Add backup reminder system~~ → Auto-backup to localStorage on workout complete
- [x] ~~Audit all modals~~ → Fixed RpePrompt timer race, added state reset to MoodEnergyPrompt
- [x] ~~Test IndexedDB failure scenarios~~ → Added health check, error UI, graceful degradation
- [x] ~~Verify storage.persist()~~ → Status shown in Settings, request button if not granted

### 🟡 P1 — Important (next sprint)
- [x] ~~Define positioning~~ → Privacy-First Minimalist
- [x] ~~Add to Home Screen prompt~~ → Install banner with iOS instructions
- [x] ~~Progressive disclosure~~ → Mood/RPE toggles in Settings
- [x] ~~Export discoverability~~ → Backup confirmation on workout complete

### 🟢 P2 — Nice-to-have (backlog)
- [x] ~~Accessibility audit~~ → WCAG 2.1 AA: skip link, focus trap, dialog roles, aria-labels, keyboard navigation
- [x] ~~Empty state improvements~~ → Improved plans, strength chart, streak calendar, mood chart
- [x] ~~Offline status indicator~~ → Added amber offline bar, green reconnection notice
- [x] ~~"Recovery guide" documentation~~ → /recovery-guide.html + link in Settings
- [x] ~~Landing page~~ → /landing.html with privacy-first positioning, features, comparison table

---

## 10. Expert Quick Reference

### When to Consult Each Framework

| Situation | Consult | Key Question |
|-----------|---------|--------------|
| "What should we build?" | Christensen | "What job is user hiring this for?" |
| "How do we compete?" | Porter | "What are the 5 forces? Where's our moat?" |
| "Is this effective?" | Drucker | "Does this help user achieve their goal?" |
| "Will users talk about it?" | Godin | "Is this remarkable? Who's the tribe?" |
| "How do we differentiate?" | Kim/Mauborgne | "What can we ERRC?" |
| "Can this scale?" | Collins | "Flywheel? Hedgehog? Economic engine?" |
| "What could go wrong?" | Taleb | "Fragilities? Black swans? Antifragile options?" |
| "System dynamics?" | Meadows | "Feedback loops? Leverage points?" |
| "Is it clear?" | Doumont | "Cognitive load? Progressive disclosure?" |

---

## 11. Metrics to Track (if product)

### North Star Candidates
- **Workouts completed per user per week** — engagement
- **Export frequency** — data ownership awareness
- **30-day retention** — stickiness
- **Install-to-first-workout time** — onboarding efficiency

### Health Metrics
- PWA install rate
- Offline usage %
- Average session duration
- Plateau alert → action rate

---

## 12. Open Questions

```
1. POSITION_CHOICE    — ✅ Privacy-First Minimalist (with optional sync)
2. MONETIZATION_INTENT — ✅ One-time purchase (App Store distribution)
3. GROWTH_STRATEGY    — ⏸️ Skipped for now
4. MAINTENANCE_COMMITMENT — ✅ Quarterly updates + bug fix micro-releases
5. TARGET_PLATFORM    — ✅ PWA for now (native wrapper later for App Store)
```

## 13. Storage & Browser Research (2026-02-03)

### Critical Findings

| Issue | Browser | Severity | Mitigation |
|-------|---------|----------|------------|
| **7-day eviction** | Safari | 🔴 Critical | Warning banner + backup prompts |
| **50MB PWA limit** | iOS Safari | 🟡 High | Storage usage indicator |
| **IndexedDB instability** | iOS | 🟡 High | Warning banner + backups |
| **QuotaExceededError in AbortError** | All | 🟡 Medium | Proper error unwrapping |
| **Private browsing** | Firefox <115 | 🟡 Medium | Detection + warning |
| **Storage not persistent** | All | 🟢 Low | Request button + indicator |

### `storage.persist()` Behavior

| Browser | Prompt? | Auto-grant criteria |
|---------|---------|---------------------|
| Chrome | No | User engagement, bookmarks, notifications |
| Firefox | **Yes** | User must approve |
| Safari | No | User engagement (but 7-day eviction still applies) |

### Sources
- [MDN Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [WebKit Storage Policy Updates](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [Dexie QuotaExceededError](https://dexie.org/docs/DexieErrors/Dexie.QuotaExceededError)
- [IndexedDB pain points](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a)
- [web.dev Persistent Storage](https://web.dev/articles/persistent-storage)
- [PWA iOS Limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)

### Implemented Mitigations
1. ✅ Browser detection (Safari, iOS, private mode)
2. ✅ Warning banners for risky browsers
3. ✅ Storage usage indicator with color coding
4. ✅ Persistence status with request button
5. ✅ `isDiskFullError()` helper for proper quota error detection
6. ✅ Auto-backup on workout complete
7. ✅ Cloud folder backup option

---

## 14. Future Integration Roadmap

### Sync Targets (user-initiated, optional)
| Platform | API | Complexity | Notes |
|----------|-----|------------|-------|
| Apple Health | HealthKit | 🟡 Medium | Requires native wrapper (Capacitor/PWA) |
| Samsung Health | Samsung SDK | 🟡 Medium | Android only |
| Google Fit | REST API | 🟢 Easy | Web-friendly |
| MyFitnessPal | OAuth API | 🟡 Medium | Requires API key approval |
| Virtuagym | REST API | 🟡 Medium | Business API access needed |
| Strava | OAuth API | 🟢 Easy | Good for cardio sessions |
| CSV/JSON Export | Native | ✅ Done | Already implemented |

### Integration Philosophy
```
User clicks "Sync" → Authenticates once → Pushes selected workouts → Done
No background sync. No accounts on our side. User always in control.
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-03 | Initial analysis from 9-expert business panel |
| 2026-02-03 | Fixed modal race condition bug (mood/energy prompt) |
| 2026-02-03 | Implemented circuit/superset workout flow |
| 2026-02-03 | Added split-to-rounds and split-exercises features |
| 2026-02-03 | Decision: Privacy-First Minimalist positioning with optional sync |
| 2026-02-03 | Decision: One-time purchase monetization model |
| 2026-02-03 | Decision: Quarterly updates + micro bug fixes maintenance |
| 2026-02-03 | Decision: PWA for now, native wrapper later |
| 2026-02-03 | Implemented auto-backup to localStorage on workout complete |
| 2026-02-03 | Added folder backup option (File System Access API) for cloud sync |
| 2026-02-03 | Fixed modal race conditions (RpePrompt, MoodEnergyPrompt) |
| 2026-02-03 | Added IndexedDB health check and error handling |
| 2026-02-03 | Added storage persistence status to Settings |
| 2026-02-03 | Deep research: Safari 7-day eviction, iOS instability, QuotaExceededError handling |
| 2026-02-03 | Added browser-specific warnings (Safari, iOS, private browsing) |
| 2026-02-03 | Added storage usage indicator and comprehensive diagnostics |
| 2026-02-03 | Added PWA install prompt (Chrome/Edge + iOS instructions) |
| 2026-02-03 | Added mood prompt toggle (progressive disclosure) |
| 2026-02-03 | Added backup confirmation on workout complete page |
| 2026-02-03 | Added offline status indicator (amber bar, green reconnect) |
| 2026-02-03 | Improved empty states (plans, strength chart, streak calendar, mood chart) |
| 2026-02-03 | **P2 Complete**: Accessibility audit (WCAG 2.1 AA compliance) |
| 2026-02-03 | **P2 Complete**: Recovery guide documentation (/recovery-guide.html) |
| 2026-02-03 | **P2 Complete**: Landing page (/landing.html) with privacy-first positioning |

---

*Reference this doc before feature decisions. Update as decisions are made.*
