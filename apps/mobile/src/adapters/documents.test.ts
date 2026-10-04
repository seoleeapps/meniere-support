import { beforeEach, expect, it, vi } from "vitest";
import { emptyJournal, summarize } from "@meniere/product-core";

const native = vi.hoisted(() => ({
  files: new Map<string, string>(),
  printJobs: [] as { html?: string; uri?: string }[],
  sharedUris: [] as string[],
}));
vi.mock("expo-print", () => ({
  printAsync: vi.fn(async (options: { html?: string; uri?: string }) => {
    // Android acknowledges the open window before onWrite reads its content.
    native.printJobs.push(options);
  }),
  printToFileAsync: vi.fn(async () => {
    const uri = "file:///cache/printed.pdf";
    native.files.set(uri, "%PDF-fictional");
    return { uri };
  }),
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async (uri: string) => {
    // The chooser returns before the selected receiver reads the provider URI.
    native.sharedUris.push(uri);
  }),
}));
vi.mock("./storage", () => ({
  temporaryDirectory: { uri: "file:///cache/journal-sharing" },
}));
vi.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri =
        (typeof base === "string" ? base : base.uri) + (name ? "/" + name : "");
    }
    get exists() {
      return native.files.has(this.uri);
    }
    write(value: string) {
      native.files.set(this.uri, value);
    }
    move(target: { uri: string }) {
      const value = native.files.get(this.uri);
      if (value === undefined) throw new Error("File missing");
      native.files.set(target.uri, value);
      native.files.delete(this.uri);
      this.uri = target.uri;
    }
    delete() {
      native.files.delete(this.uri);
    }
  },
}));
import { documents, sharing } from "./documents";

beforeEach(() => {
  native.files.clear();
  native.printJobs.length = 0;
  native.sharedUris.length = 0;
});

it.each(["ko", "en"] as const)(
  "keeps %s print content readable after the native window opens",
  async (language) => {
    const summary = summarize(
      emptyJournal(language),
      "2026-10-04",
      "2026-10-04",
      0,
      ["Fictional QA <question>"],
    );
    await documents.preview(summary, language);
    // Model the delayed Android PrintDocumentAdapter.onWrite callback.
    await Promise.resolve();
    const job = native.printJobs[0];
    const content = job.html ?? native.files.get(job.uri!);
    expect(content).toBeDefined();
    expect(content).toContain("Fictional QA &lt;question&gt;");
    expect(content).toContain(`lang="${language}"`);
  },
);

it("keeps shared PDF, CSV and encrypted backup files readable after receiver selection", async () => {
  const summary = summarize(emptyJournal(), "2026-10-04", "2026-10-04", 0);
  const pdf = await documents.pdf(summary, "en");
  const csv = await documents.csv(emptyJournal());
  const backup = "file:///cache/journal-sharing/fictional.mjb";
  native.files.set(backup, "fictional-encrypted-bytes");
  const exports = [
    [pdf, "application/pdf"],
    [csv, "text/csv"],
    [backup, "application/octet-stream"],
  ] as const;
  const before = exports.map(([uri]) => native.files.get(uri));
  for (const [uri, mime] of exports) await sharing.share(uri, mime);
  await Promise.resolve();
  expect(native.sharedUris.map((uri) => native.files.get(uri))).toEqual(before);
  expect(before.every((content) => content !== undefined)).toBe(true);
});
