# Wine Cellar

Personal wine cellar catalog and tasting journal for **Casey Morrison** — built with Expo (React Native) + TypeScript + Expo Router.

Dark cellar aesthetic, local-first data, demo bottle recognition, critic scores, and retail price estimates so the full flow works without API keys.

## Features

- **Cellar browse** — search + filters (region/country, type, vintage, rating, quantity)
- **Wine detail** — inventory (same vintage + other vintages), tasting history, critic scores, demo retail price
- **Identify** — take or pick a bottle photo → demo match → confirm → adjust inventory
- **Manual add/edit** — full wine form + quantity
- **Tasting log** — 0–10 with half points, optional drink (−1 bottle)
- **Settings** — ZIP for demo prices, reset sample data (~36 seeded wines)

## Run on iPhone (Expo Go)

```bash
npm install
npx expo start
```

1. Install **Expo Go** from the App Store.
2. Scan the QR code from the terminal (same Wi‑Fi as your computer), or open the project URL in Expo Go.
3. Grant camera / photo permissions when prompted on the Identify tab.

iOS Simulator (Mac): `npx expo start --ios`

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
  database.ts         AsyncStorage persistence
  DemoBottleRecognizer.ts   Isolated demo vision stub
  WineMetadataService.ts    Facade for critics + price
  DemoProvider.ts           Isolated demo metadata stub
types/wine.ts
```

### Demo vs real

| Capability | Status |
|------------|--------|
| Cellar CRUD, filters, tastings, inventory | **Real** (local AsyncStorage) |
| Bottle photo capture / picker | **Real** (expo-image-picker) |
| Label → wine identification | **Demo** — `DemoBottleRecognizer` matches catalog |
| Critic scores (Spectator / Parker / Vinous) | **Demo** — `DemoProvider` |
| Average local retail by ZIP | **Demo** — `DemoProvider` (not live scrapes) |

To plug in live APIs later:

1. Implement `BottleRecognizer` and swap `demoBottleRecognizer`.
2. Implement `WineMetadataProvider` and call `wineMetadataService.setProvider(...)`.

No API keys are required for this demo build.

## Next steps (App Store + real APIs)

1. `npx eas-cli@latest build --platform ios` with an Apple Developer account.
2. Replace demo recognizer with a label/vision API (e.g. custom model or commercial wine ID).
3. Replace `DemoProvider` with licensed critic feeds and a retail/price API.
4. Optionally migrate persistence from AsyncStorage to `expo-sqlite` for larger cellars / sync.
5. Add iCloud or backend sync if multi-device is needed.

## License

Private project for Casey Morrison. Template LICENSE from Expo scaffold may also apply to generated boilerplate.
