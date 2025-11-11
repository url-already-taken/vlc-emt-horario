# UX Refresh Plan

## Step 1 — Pair Stops and Enrich Metadata
- Normalize stop names into `(street, cross, side)` keys (trim markers like `CARRIL BUS`, `DAVANT`, `S/N`; detect `parell`/`imparell`).
- Group by key, run greedy pairing within 60–80 m prioritizing opposite sides; validate by shared `id_linea` and contrasting `headSign` values (e.g., Gaspar Aguilar — Doctor Tomás Sala: `Forn d'Alcedo` ↔ `Sant Pau - Estació del Nord`).
- Persist `StopPair` records with shared lines, side labels, and reference exemplars (Real de Madrid block, Tres Forques, Uruguai) so downstream UI can treat pairs as atomic items.

## Step 2 — Compute Directional Insights per Line
- For each `(stop, lineId, headSign)` locate the nearest downstream stop with the same line/headSign (>30 m away, ideally same street different cross) to derive a bearing using `geoUtils.getBearing`.
- Map azimuth to compass emojis/arrows and classify vs. city center vector (`к центру/от центра`).
- Cache arrival ETA + direction tuples on each pair side to avoid recomputing during scrolling; expose through context so CompassOverlay and cards stay consistent.

## Step 3 — Redesign the Nearby List Around StopPairs
- Replace the current card layout with intersection-centric tiles: header shows `street — cross`, subtext highlights `сторона чётных/нечётных домов` + `ubica` snippet for custom local detail.
- For every shared line render two prominent buttons (one per side) containing line badge (`SN`), headSign, arrow, center/away label, and soonest arrival (once realtime is wired).
- Keep favorite toggle + compass overlay, but position them at the pair level so tapping the star bookmarks the entire intersection; allow expanding to peek at individual stops only if needed.
