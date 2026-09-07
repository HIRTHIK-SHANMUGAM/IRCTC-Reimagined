# Images

Drop photographs in here and they appear automatically — the app looks for the
paths below and falls back to its drawn `SceneArt` illustration whenever a file
is missing, so nothing breaks either way.

## Where each file is used

| Path | Used by | Suggested size |
| --- | --- | --- |
| `destinations/<id>.jpg` | Recommended-For-You cards on the dashboard | 640×400 |
| `packages/<id>.jpg` | Holiday Packages catalogue and detail view | 800×500 |
| `hotels/<id>.jpg` | Hotel listings | 640×400 |
| `activities/<id>.jpg` | Activities & Attractions cards | 640×400 |
| `tourism.jpg` | IRCTC Tourism promo card in the dashboard sidebar | 640×560 |

The `<id>` values are the record ids in `src/data/catalog.ts` and
`src/features/dashboard/Recommended.tsx` — for example `packages/pkg-2.jpg`
for "Kerala Backwaters & Hills", or `destinations/r1.jpg` for the first
recommendation card.

## Format

- **JPEG** for photographs, quality ~80. WebP also works if you prefer.
- Landscape crops. The cards use `object-fit: cover`, so the centre of the
  frame is what survives the crop.
- Keep each file under ~200 KB; these load on the dashboard's first paint.

## Licensing

Only add images you have the right to use — your own photographs, or ones
under a licence that permits redistribution (Creative Commons, Unsplash,
Pexels). Keep attribution here if the licence requires it.

| File | Source | Licence |
| --- | --- | --- |
| _(none yet)_ | | |
