# EAS Build Fix - Environment Secrets Setup

## 🔴 Problem

EAS build is failing because it references environment secrets that aren't configured:

```
MAPBOX_DOWNLOAD_TOKEN: @MAPBOX_DOWNLOAD_TOKEN
EXPO_PUBLIC_API_BASE_URL: @EXPO_PUBLIC_API_BASE_URL
```

The `@` prefix means these are **EAS secrets** that need to be configured in your Expo account.

---

## ✅ Solution 1: Configure EAS Secrets (Recommended)

### Step 1: Get Your Secrets

You need these values:
1. **MAPBOX_DOWNLOAD_TOKEN** - From your Mapbox account
2. **EXPO_PUBLIC_API_BASE_URL** - Your backend URL

### Step 2: Set Secrets in EAS

```powershell
cd C:\Users\divay\OneDrive\Desktop\Runiverse\Frontend

# Set Mapbox download token
eas secret:create --scope project --name MAPBOX_DOWNLOAD_TOKEN --value "YOUR_MAPBOX_TOKEN_HERE" --type string

# Set API base URL
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://runiverse.onrender.com" --type string
```

### Step 3: Retry Build

```powershell
eas build --profile preview --platform android
```

---

## ✅ Solution 2: Use Local Values (Quick Fix)

If you don't want to set up secrets, modify `eas.json` to use direct values:

### Edit `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "MAPBOX_DOWNLOAD_TOKEN": "sk.YOUR_ACTUAL_TOKEN_HERE",
        "EXPO_PUBLIC_API_BASE_URL": "https://runiverse.onrender.com"
      }
    }
  }
}
```

**Warning:** Don't commit actual tokens to git! Add them to `.gitignore` or use secrets.

---

## ✅ Solution 3: Local Build (No EAS Needed)

Build directly on your machine:

### For Android:

```powershell
cd Frontend
npx expo run:android --variant release
```

**Requirements:**
- Android Studio installed
- Android SDK configured
- USB debugging enabled on phone

### Install APK:

The APK will be created at:
```
Frontend/android/app/build/outputs/apk/release/app-release.apk
```

Transfer to your phone and install!

---

## 🔍 Check Current Secrets

See what secrets are already configured:

```powershell
cd Frontend
eas secret:list
```

---

## 📝 Get Mapbox Token

1. Go to https://account.mapbox.com/
2. Login
3. Go to **Access Tokens**
4. Find or create a **Secret Token** with download:read scope
5. Copy the token (starts with `sk.`)

---

## ⚡ Quick Command Reference

```powershell
# Login to EAS
eas login

# List secrets
eas secret:list

# Create secret
eas secret:create --scope project --name SECRET_NAME --value "VALUE" --type string

# Delete secret
eas secret:delete --scope project --name SECRET_NAME

# Build
eas build --profile preview --platform android

# Check build status
eas build:list
```

---

## 🎯 Recommended Solution for Your Case

Since you just want to **test walking functionality**, I recommend:

### **Option: Local Release Build**

```powershell
cd C:\Users\divay\OneDrive\Desktop\Runiverse\Frontend
npx expo run:android --variant release
```

**Why:**
- ✅ No EAS setup needed
- ✅ No secrets configuration
- ✅ Builds in ~5 minutes (vs 15-20 for EAS)
- ✅ APK ready immediately
- ✅ Same as production build for testing

**How to Use:**
1. Connect phone via USB
2. Enable USB debugging
3. Run command above
4. App installs automatically
5. Go for walk and test!

---

## 🐛 Troubleshooting

### "Android SDK not found"
Install Android Studio: https://developer.android.com/studio

### "No devices found"
- Enable USB debugging on phone
- Connect via USB
- Trust computer on phone

### "Build failed"
```powershell
cd Frontend
rm -r -fo android, ios
npx expo prebuild --clean
npx expo run:android --variant release
```

---

## 📦 Alternative: Expo Go

For quick testing (not production-like):

```powershell
cd Frontend
npx expo start
```

Then scan QR code with Expo Go app.

**Limitation:** Won't work with custom native modules like @rnmapbox/maps

---

**Recommendation:** Use local build for fastest testing!
