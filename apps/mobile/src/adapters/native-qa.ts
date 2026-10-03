import { File } from "expo-file-system";
import {
  beginEpisode,
  emptyJournal,
  endEpisode,
  mergeRestore,
  previewRestore,
  summarize,
} from "@meniere/product-core";
import { EncryptedJournal, temporaryDirectory } from "./storage";
import { documents } from "./documents";

// Included only in development bundles. Tests use a separate database and key.
export function installNativeQa() {
  Object.assign(globalThis, {
    runJournalNativeQa: async () => {
      const repository = new EncryptedJournal("ko", "qa");
      const passed: string[] = [];
      const assert = (value: unknown, name: string) => {
        if (!value) throw new Error(`QA_FAILED:${name}`);
        passed.push(name);
      };
      const now = Date.now();
      const password = "fictional-qa-backup-password";
      try {
        await repository.erase();
        const j = beginEpisode(
          emptyJournal("ko"),
          { now: () => now, timeZone: () => "Asia/Seoul" },
          { next: () => "fictional-episode" },
        );
        j.settings.onboarded = true;
        j.episodes[0].note = "가상 기록 · Fictional QA example";
        await repository.save(j);
        assert(
          (await repository.load()).episodes[0].note === j.episodes[0].note,
          "encrypted-save-load",
        );
        await repository.close();
        assert(
          (await repository.load()).episodes[0].active,
          "restart-retains-active-episode",
        );
        const bytes = await new File(repository.databaseUri).bytes();
        assert(
          String.fromCharCode(...bytes.slice(0, 16)) !== "SQLite format 3\0",
          "database-header-encrypted",
        );
        const uri = await repository.create(password);
        const imported = await repository.inspect(uri, password);
        assert(
          imported.episodes[0].note === j.episodes[0].note,
          "password-backup-roundtrip",
        );
        let failed = false;
        try {
          await repository.inspect(uri, "wrong-password");
        } catch {
          failed = true;
        }
        assert(failed, "wrong-password-rejected");
        assert(
          (await repository.load()).episodes[0].active,
          "failed-restore-preserves-original",
        );
        const damaged = new File(temporaryDirectory, "fictional-damaged.mjb");
        damaged.write("damaged backup");
        failed = false;
        try {
          await repository.inspect(damaged.uri, password);
        } catch {
          failed = true;
        }
        assert(failed, "damaged-backup-rejected");
        assert(
          previewRestore(j, imported).identicalCount === 1,
          "duplicate-backup-detected",
        );
        const completed = endEpisode(j, "fictional-episode", now + 60000);
        assert(
          mergeRestore(completed, imported, []).episodes[0].active === false,
          "restore-keeps-conflict-by-default",
        );
        const summary = summarize(
          completed,
          j.episodes[0].date,
          j.episodes[0].date,
          now,
          ["가상 질문 · Fictional question"],
        );
        for (const language of ["ko", "en"] as const) {
          const pdf = await documents.pdf(summary, language);
          const file = new File(pdf);
          const pdfBytes = await file.bytes();
          assert(
            String.fromCharCode(...pdfBytes.slice(0, 5)) === "%PDF-",
            `native-pdf-${language}`,
          );
          // Keep only the fictional PDFs for visual QA; real app export files are ephemeral.
          await file.move(
            new File(temporaryDirectory, `fictional-${language}.pdf`),
          );
        }
        const csv = await documents.csv(completed);
        assert(
          (await new File(csv).text()).includes("Fictional QA"),
          "native-csv",
        );
        new File(csv).delete();
        new File(uri).delete();
        damaged.delete();
        return { passed, fictionalPdfDirectory: temporaryDirectory.uri };
      } finally {
        await repository.erase();
      }
    },
  });
}
