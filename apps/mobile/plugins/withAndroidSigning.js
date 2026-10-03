const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== "groovy") {
      throw new Error(
        "Android release signing requires the Expo Groovy template.",
      );
    }
    const source = c.modResults.contents;
    const release =
      /(release\s*\{\s*)(?:\/\/[^\n]*\n\s*)*signingConfig signingConfigs\.debug/;
    if (!release.test(source) || !source.includes("    signingConfigs {")) {
      throw new Error(
        "Android signing template changed; review before building.",
      );
    }
    c.modResults.contents = source
      .replace(
        "android {",
        `def meniereSigningValue = { name ->
    def value = System.getenv(name)
    if (!value) throw new GradleException("Missing Android signing setting: " + name)
    return value
}

android {`,
      )
      .replace(
        "    signingConfigs {",
        `    signingConfigs {
        upload {
            storeFile file(meniereSigningValue("ANDROID_SIGNING_STORE_FILE"))
            storePassword meniereSigningValue("ANDROID_SIGNING_STORE_PASSWORD")
            keyAlias meniereSigningValue("ANDROID_SIGNING_KEY_ALIAS")
            keyPassword meniereSigningValue("ANDROID_SIGNING_KEY_PASSWORD")
        }`,
      )
      .replace(release, "$1signingConfig signingConfigs.upload");
    return c;
  });
