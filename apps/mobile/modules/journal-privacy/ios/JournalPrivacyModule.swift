import ExpoModulesCore

public class JournalPrivacyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("JournalPrivacy")
    AsyncFunction("excludeFromBackup") { (uri: String) in
      guard var url = URL(string: uri), url.isFileURL else {
        throw NSError(domain: "JournalPrivacy", code: 1)
      }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
    }
  }
}
