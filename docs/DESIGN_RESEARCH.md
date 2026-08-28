# Design Research — sources crawled with Firecrawl

Crawled 2026-08-28 before any code was written, per the master prompt's build order.

| Source | Status | What we took |
|---|---|---|
| supahero.io | scraped (88k chars) | Hero-section patterns: one oversized statement line, a single primary action, ambient motion behind the type. Sites reviewed incl. Linear, Stripe, Ramp, Attio, Resend, Folk, Arc, Wise. |
| seesaw.website/category/design | scraped (56k chars) | Studio-portfolio editorial voice: sentence-case statements over feature bullets. |
| saaspo.com | scraped | Style taxonomy we designed against: `Scroll Animations`, `Boxed`, `Bento`, `Black & White`, `Interesting Buttons`, `Copy focused`, `Unique Footer`; asset taxonomy `Feature Abstracts`, `Animated`, `Vector`. |
| searchsystem.co | scraped | **The strongest reference for this product.** Swiss signage systems — North/RAC brand guidelines, North/Barbican signage, Selfridges signage, Neubau type. Hairline rules, mono uppercase labels, numeric-led hierarchy. Railway signage heritage maps directly onto a railway product. |
| cosmos.so | blocked (Firecrawl does not support the site) | — |
| same.energy | not reachable as a text page (canvas app) | — |
| recent.design `?category=motion` | scraped (JSON) | Microinteraction vocabulary: *Braille Loader*, *Dotted Countdown*, *Tachometer Component*, *Generative Tile Animation*, *Kinetic Type Reel*, *Scrollbar BUT Cooler*, *Messages Icon Unread Concept*. |
| recent.design `?category=web` | scraped (JSON) | Cursor language: *Jesper Landberg Portfolio* — "cursor follow animations"; *CO'WATCH! Clock* — "enlarged cursor effect"; *Deepsec Hero* — "element scaling on hover"; *Sidebar Sub-Menu* — "smooth accordion panel animations". |
| motionarray.com/stock-motion-graphics | scraped (JSON) | Confirmed there is no train/transport stock category worth leaning on — the train graphic is authored as original SVG + Framer Motion, not sourced. |
| uiverse.io/ui-kits | scraped (JSON) | Kit archetypes that match our brief almost exactly: **Cairn** "serif headlines, hairline grids, high-contrast", **Penumbra** "fine hairline borders, refined serif-meets-grotesk", **Mosaic Press** "cream, ink and electric accent tiles", **Mossforge** "cream paper surfaces, charged accent", **Crimson Plinth** "tactile, layered press button, calm paper-light". |
| untitledui.com/react/components | scraped (JSON) | Component checklist we implement: Buttons, Inputs, Checkboxes, Radio, Textareas, Toggles, Select, Dropdowns, **Progress indicators**, **Verification code inputs**, Modals, Alerts, **Date pickers**, **Loading indicators**. |

## What the research changed in the build

1. **Signage, not dashboard.** From SearchSystem's North/RAC and Barbican work: hairline `1px` rules instead of shadows, mono uppercase micro-labels (`DEPARTS`, `PLATFORM`, `COACH`), and numerals as the loudest element on a card. This is why fare and time use tabular-nums at a larger optical size than the train name.
2. **Cream paper canvas + one charged accent.** Mossforge/Mosaic Press. Canvas `#FBF9F4`, ink `#12211E`, single deep-teal accent. Semantic colour is reserved for status only, per master prompt §4.
3. **Verification code input.** Untitled UI's `Verification code inputs` is a named component — the OTP screen uses a real 6-cell segmented input with paste handling, not six loose text boxes.
4. **Progress indicators as first-class.** The payment state machine and journey tracking both render as staged progress, never a bare spinner (master prompt §8).
5. **Cursor: follow, not replace.** Jesper Landberg's "cursor follow" + CO'WATCH's "enlarged cursor" — a lagging soft ring that scales on interactive elements. Kept mild, disabled on touch and under `prefers-reduced-motion`, and it never hides the native cursor.
6. **Motion graphic authored, not stocked.** Motion Array has no usable railway set, so the login train is original SVG: parallax landscape bands, a rolling train with turning wheels, telegraph poles, and a track that draws itself.
7. **Microinteraction set.** Braille Loader → the searching-trains dot matrix. Tachometer → the live-speed readout in Track. Dotted Countdown → the arriving-in timer. Generative Tile → the seat map fill.
