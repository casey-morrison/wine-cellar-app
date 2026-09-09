# Wine Cellar

Personal wine cellar catalog and tasting journal for **Casey Morrison** — built with Expo (React Native) + TypeScript + Expo Router.

Dark cellar aesthetic, local-first data, **free on-device OCR** for bottle labels (Apple Vision on iOS / ML Kit on Android), with optional OpenAI cloud vision and a demo recognizer for testing.

> **Expo Go is not enough** for real free OCR. You need a **development build** (`expo-dev-client`) because `expo-mlkit-ocr` includes native code.

## Features

- **Cellar browse** — search + filters (region/country, type, vintage, rating, quantity)
- **Wine detail** — inventory (same vintage + other vintages), tasting history, critic scores, demo retail price
- **Identify** — take or pick a bottle photo → **on-device OCR** → fuzzy-match cellar → confirm → adjust inventory
- **Manual add/edit** — full wine form + quantity
- **Tasting log** — 0–10 with half points, optional drink (−1 bottle)
- **Settings** — on-device OCR explanation, optional OpenAI cloud fallback, demo toggle, ZIP, install blurb

## Development build (required for free OCR)

On-device OCR will **not** work inside Expo Go. Install packages, then build a custom client.

```bash
npm install
npx expo install expo-dev-client expo-mlkit-ocr expo-build-properties
npx expo prebuild
```

### Option A — EAS Build (recommended without a Mac / Xcode)

Casey may not have Cursor or Xcode. Prefer **EAS Build** to produce an installable iPhone development client in the cloud:

```bash
npm install -g eas-cli   # once
eas login                # Expo account
eas build:configure      # creates/links eas.json + project (once)
eas build -p ios --profile development
```

When the build finishes, open the Expo build page on your iPhone and install the development client (internal distribution). Then start the JS bundler and connect:

```bash
npx expo start --dev-client
```

### Option B — Local iOS build (Mac + Xcode)

```bash
npx expo run:ios
# or physical device:
npx expo run:ios --device
```

Android: `npx expo run:android` (or `eas build -p android --profile development`).

### app.json plugins (already wired)

- `expo-dev-client`
- `expo-mlkit-ocr` with `iosEngine: "auto"` (Apple Vision–friendly default on iOS)
- `expo-build-properties` with iOS `deploymentTarget: "16.0"` (required by ML Kit / package docs)

## Real bottle recognition

1. **Default — on-device OCR** (`OnDeviceBottleRecognizer`): `expo-mlkit-ocr` reads the label locally, heuristics parse producer / name / vintage / region / grape / type, then `catalogMatch.ts` fuzzy-matches the cellar.
2. **Optional — cloud vision**: Settings → enable **Prefer cloud vision** and paste an OpenAI API key (`VisionBottleRecognizer`).
3. **Demo stub**: Settings → **Use demo recognition** for UI testing without camera quality or a native build.

If on-device OCR is unavailable (Expo Go) and a cloud key is set, Identify may fall back to OpenAI once; otherwise you get a clear “install a development build” error.

### Privacy

- On-device OCR keeps label photos **on device** — no network for recognition.
- Cloud vision (opt-in) uploads the image to OpenAI; the key stays in AsyncStorage only and must never be committed.
- Critic scores and retail prices remain local demo stubs (`DemoProvider`).

## Scripts

| Command | Purpose |
|--------|---------|
| `npx expo start --dev-client` | Dev server for a development build |
| `npx expo start` | Bundler only (Expo Go cannot run OCR) |
| `npm run typecheck` | `tsc --noEmit` |
| `eas build -p ios --profile development` | Cloud iOS development client |
| `npx expo run:ios` | Local native iOS build (Mac) |

## Architecture

```
app/                  Expo Router screens (tabs + stack)
components/           UI + WineCard, ScorePicker
context/              CellarProvider
data/seedWines.ts     Sample catalog + tastings
hooks/useCellar.ts    State + CRUD
services/
  database.ts                   AsyncStorage persistence
  DemoBottleRecognizer.ts       BottleRecognizer interface + demo stub
  OnDeviceBottleRecognizer.ts   Free on-device OCR + label heuristics + catalog match
  VisionBottleRecognizer.ts     Optional OpenAI vision OCR + catalog match
  catalogMatch.ts               Fuzzy producer/name/vintage matching
  WineMetadataService.ts        Facade for critics + price
  DemoProvider.ts               Isolated demo metadata stub
types/wine.ts
eas.json                        EAS development / preview / production profiles
```

### Demo vs real

| Capability | Status |
|------------|--------|
| Cellar CRUD, filters, tastings, inventory | **Real** (local AsyncStorage) |
| Bottle photo capture / picker | **Real** (expo-image-picker) |
| Label → wine identification | **Real** on-device OCR in a **dev build**; optional OpenAI; optional demo stub |
| Critic scores (Spectator / Parker / Vinous) | **Demo** — `DemoProvider` |
| Average local retail by ZIP | **Demo** — `DemoProvider` (not live scrapes) |

To swap metadata later: implement `WineMetadataProvider` and call `wineMetadataService.setProvider(...)`.

## Next steps (App Store + more APIs)

1. `eas build --platform ios --profile production` with an Apple Developer account, then submit.
2. Replace `DemoProvider` with licensed critic feeds and a retail/price API.
3. Optionally migrate persistence from AsyncStorage to `expo-sqlite` for larger cellars / sync.
4. Add iCloud or backend sync if multi-device is needed.

## License

Private project for Casey Morrison. Template LICENSE from Expo scaffold may also apply to generated boilerplate.
