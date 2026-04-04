# Build SpendWise APK

## Prerequisites
- Android Studio (download from https://developer.android.com/studio)
- Open Android Studio and accept all SDK licenses

## Generate Keystore (one-time)
The keystore is already generated. If you need to regenerate:
```
keytool -genkeypair -v -keystore spendwise-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias spendwise
```

## Build Release APK

### Option 1: Using Android Studio (Recommended)
1. Open Android Studio
2. Click **Open an existing project** → select the `android/` folder
3. Wait for Gradle sync to complete (first time may take few minutes)
4. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. When prompted, use the existing keystore (`spendwise-release.jks`, password: `spendwise123`)
6. The APK will be generated at: `android/app/debug/output/apk/debug/spendwise.apk` (or release variant)

### Option 2: Using Command Line (via Android Studio's gradle wrapper)
1. Open Android Studio → Open the `android/` project
2. Open Terminal in Android Studio (bottom panel)
3. Run: `./gradlew assembleRelease` (Linux/macOS) or `gradlew assembleRelease` (Windows)
4. Find the APK at: `android/app/build/outputs/apk/release/app-release.apk`

## Build Debug APK (for testing)
```
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Install on Device (via ADB)
```
adb install android/app/build/outputs/apk/release/app-release.apk
```

## APK Size
The release build with minification enabled should produce an APK around 2-3MB since it's basically a WebView wrapper.

## Update Process
1. Make changes to the website
2. Deploy to Vercel
3. Increment `versionCode` in `android/app/build.gradle`
4. Rebuild APK and redistribute
