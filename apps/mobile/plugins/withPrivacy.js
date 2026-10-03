const {
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
} = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
module.exports = (config) => {
  config = withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application[0];
    app.$["android:allowBackup"] = "false";
    app.$["android:fullBackupContent"] = "@xml/journal_backup_rules";
    app.$["android:dataExtractionRules"] = "@xml/journal_extraction_rules";
    return c;
  });
  return withDangerousMod(config, [
    "android",
    (c) => {
      const directory = path.join(
        c.modRequest.platformProjectRoot,
        "app/src/main/res/xml",
      );
      fs.mkdirSync(directory, { recursive: true });
      const exclude = [
        "root",
        "file",
        "database",
        "sharedpref",
        "external",
        "device_root",
        "device_file",
        "device_database",
        "device_sharedpref",
      ]
        .map((domain) => `<exclude domain="${domain}" path="."/>`)
        .join("");
      fs.writeFileSync(
        path.join(directory, "journal_backup_rules.xml"),
        `<full-backup-content>${exclude}</full-backup-content>`,
      );
      fs.writeFileSync(
        path.join(directory, "journal_extraction_rules.xml"),
        `<data-extraction-rules><cloud-backup>${exclude}</cloud-backup><device-transfer>${exclude}</device-transfer></data-extraction-rules>`,
      );
      return c;
    },
  ]);
};
