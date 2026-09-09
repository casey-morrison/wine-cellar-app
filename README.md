# Wine Cellar

Personal wine cellar catalog and tasting journal for **Casey Morrison** — built with Expo (React Native) + TypeScript + Expo Router.

Dark cellar aesthetic, local-first data, **real OpenAI vision label recognition** (Expo Go compatible), plus demo critic scores and retail price estimates.

## Features

- **Cellar browse** — search + filters (region/country, type, vintage, rating, quantity)
- **Wine detail** — inventory (same vintage + other vintages), tasting history, critic scores, demo retail price
- **Identify** — take or pick a bottle photo → **cloud vision OCR** → fuzzy-match cellar → confirm → adjust inventory
- **Manual add/edit** — full wine form + quantity
- **Tasting log** — 0–10 with half points, optional drink (−1 bottle)
- **Settings** — OpenAI API key + model, optional demo recognition toggle, ZIP for demo prices, reset sample data

## Run on iPhone (Expo Go)

```bash
npm install
npx expo start
```

1. Install **Expo Go** from the App Store.
2. Scan the QR code from the terminal (same Wi‑Fi as your computer), or open the project URL in Expo Go.
3. Open **Settings** and paste an OpenAI API key (from [platform.openai.com](https://platform.openai.com)).
4. Grant camera / photo permissions when prompted on the Identify tab.

iOS Simulator (Mac): `npx expo start --ios`

## Real bottle recognition

Expo Go cannot ship native on-device ML Kit easily, so Identify uses a **cloud vision recognizer**:

1. The bottle photo is read on-device (`expo-file-system`) and base64-encoded.
2. `VisionBottleRecognizer` calls the OpenAI Chat Completions vision API (`gpt-4o-mini` by default, or `gpt-4o`).
3. A strict JSON prompt extracts producer, wine name, vintage, and optional region / grape / type.
4. Results are **fuzzy-matched** against your cellar (producer+name+vintage → producer+name → producer+partial name).
5. The existing confirm screen shows stock, tasting, critics, and price — unmatched OCR wines can be added as new.

### Enable recognition

1. Settings → **OpenAI API key** → Save recognition settings.
2. Optional: set **Recognition model** (`gpt-4o-mini` default).
3. Leave **Use demo recognition** OFF for real OCR.

Without a key, Identify shows an alert directing you to Settings (it does **not** silently fall back to the URI-hash demo). Enable “Use demo recognition” only for offline stub testing.

### Cost & privacy

- Each Identify call sends the image to OpenAI and uses a small amount of API credit (mini is cheaper).
- The API key is stored **on-device only** (AsyncStorage) and must never be committed.
- Critic scores and retail prices remain local demo stubs (`DemoProvider`).

## Scripts

| Command | Purpose |
|--------|---------|
| `npx expo start` | Dev server / Expo Go |
| `npm run typecheck` | `tsc --noEmit` |
| `npx expo export` | Static web export (sanity check) |

## Architecture

```
app/                  Expo Router screens (tabs + stack)
components/           UI + WineCard, ScorePicker
context/              CellarProvider
data/seedWines.ts     Sample catalog + tastings
hooks/useCellar.ts    State + CRUD
services/
  database.ts                 AsyncStorage persistence
  DemoBottleRecognizer.ts     BottleRecognizer interface + demo stub
  VisionBottleRecognizer.ts   OpenAI vision OCR + catalog match
  catalogMatch.ts             Fuzzy producer/name/vintage matching
  WineMetadataService.ts      Facade for critics + price
  DemoProvider.ts             Isolated demo metadata stub
types/wine.ts
```

### Demo vs real

| Capability | Status |
|------------|--------|
| Cellar CRUD, filters, tastings, inventory | **Real** (local AsyncStorage) |
| Bottle photo capture / picker | **Real** (expo-image-picker) |
| Label → wine identification | **Real** via OpenAI vision when key is set; optional demo stub |
| Critic scores (Spectator / Parker / Vinous) | **Demo** — `DemoProvider` |
| Average local retail by ZIP | **Demo** — `DemoProvider` (not live scrapes) |

To swap metadata later: implement `WineMetadataProvider` and call `wineMetadataService.setProvider(...)`.

## Next steps (App Store + more APIs)

1. `npx eas-cli@latest build --platform ios` with an Apple Developer account.
2. Replace `DemoProvider` with licensed critic feeds and a retail/price API.
3. Optionally migrate persistence from AsyncStorage to `expo-sqlite` for larger cellars / sync.
4. Add iCloud or backend sync if multi-device is needed.

## License

Private project for Casey Morrison. Template LICENSE from Expo scaffold may also apply to generated boilerplate.
