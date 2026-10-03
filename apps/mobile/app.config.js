const production = process.env.APP_VARIANT === "production";
const admob = require("../../release/admob.json");
const androidAdId = production
  ? admob.android.appId
  : "ca-app-pub-3940256099942544~3347511713";
const iosAdId = production
  ? admob.ios.appId
  : "ca-app-pub-3940256099942544~1458002511";
if (
  production &&
  [androidAdId, iosAdId, admob.android.bannerId, admob.ios.bannerId].some(
    (id) => !/^ca-app-pub-9932778305312246[~/]\d+$/.test(id),
  )
) {
  throw new Error(
    "Production must use the verified Meniere Journal AdMob identifiers.",
  );
}
module.exports = {
  name: "Meniere Journal",
  slug: "meniere-support",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "meniere-journal",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.seoleeapps.menieresupport",
    supportsTablet: true,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: true,
    },
  },
  android: {
    package: "com.seoleeapps.menieresupport",
    versionCode: 1,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#EFF6F4",
    },
    blockedPermissions: [
      "android.permission.READ_CONTACTS",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.DETECT_SCREEN_CAPTURE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.FOREGROUND_SERVICE",
      "com.google.android.c2dm.permission.RECEIVE",
    ],
  },
  plugins: [
    ["expo-sqlite", { useSQLCipher: true, enableFTS: false }],
    ["expo-secure-store", { configureAndroidBackup: false }],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 180,
        backgroundColor: "#EFF6F4",
        dark: { backgroundColor: "#102623" },
      },
    ],
    ["expo-notifications", { color: "#226C60" }],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: androidAdId,
        iosAppId: iosAdId,
        delayAppMeasurementInit: true,
      },
    ],
    "./plugins/withPrivacy",
  ],
  extra: { production },
};
