# .config/ — Credential Drop Folder

Drop all project credentials and config files here. **This folder is git-ignored** (except this README and the template). Nothing here ever gets committed.

---

## Files to Drop Here

| File | Where to Get It | Required? |
|------|-----------------|-----------|
| `google-services.json` | Firebase Console → Project Settings → Android app | ✅ Required |
| `GoogleService-Info.plist` | Firebase Console → Project Settings → iOS app | ✅ Required |
| `config.json` | Copy from `config.template.json`, fill in your values | ✅ Required |

---

## Step-by-step Setup

### 1. Firebase Config Files

1. Go to [Firebase Console](https://console.firebase.google.com) → `pawmii-app` project
2. **Android** → Project Settings → Your apps → Download `google-services.json` → drop here
3. **iOS** → Project Settings → Your apps → Download `GoogleService-Info.plist` → drop here

### 2. Fill in config.json

```bash
cp .config/config.template.json .config/config.json
```

Then open `.config/config.json` and fill in all the values.

### 3. Run Setup

```bash
npm run setup
```

This validates your config, then copies the Firebase files to the right locations so Expo can pick them up automatically.

---

## How It Works (No .env Needed)

`app.config.js` (Expo's dynamic config) reads from `.config/config.json` at build time. All values flow into the app as Expo constants or build-time env vars via EAS. You never write `.env` files manually.

The setup script (`scripts/setup.js`) copies:
- `google-services.json` → `apps/mobile/google-services.json` (Android)
- `GoogleService-Info.plist` → `apps/mobile/GoogleService-Info.plist` (iOS)

Both locations are also git-ignored.
