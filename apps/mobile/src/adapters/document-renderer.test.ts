import { expect, it } from "vitest";
import { beginEpisode, emptyJournal, summarize } from "@meniere/product-core";
import { escapeHtml, renderSummary } from "./document-renderer";
it("escapes user content and uses the same summary counts as the screen", () => {
  const now = Date.parse("2026-10-03T00:00Z"),
    j = beginEpisode(
      emptyJournal(),
      { now: () => now, timeZone: () => "UTC" },
      { next: () => "a" },
    );
  j.episodes[0].note = '<script>alert("x")</script> & 한글';
  const s = summarize(j, "2026-10-01", "2026-10-03", now, [
    "<img src=x onerror=x>",
  ]);
  for (const language of ["ko", "en"] as const) {
    const html = renderSummary(s, language);
    expect(html).toContain("0/3");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("한글");
    expect(html).toContain('lang="' + language + '"');
  }
});
it("retains additional questions and detailed records on continuation pages", () => {
  const html = renderSummary(
    summarize(emptyJournal(), "2026-10-03", "2026-10-03", 0, [
      "1",
      "2",
      "3",
      "fourth",
    ]),
    "en",
  );
  expect(html).toContain("fourth");
  expect(html).toContain('class="detail"');
  expect(html).toContain("thead{display:table-header-group}");
});
it("escapes all HTML delimiters", () =>
  expect(escapeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#39;"));

it("keeps the first page bounded and retains long questions in full", () => {
  const j = emptyJournal();
  for (let i = 0; i < 6; i++) {
    const episode = beginEpisode(
      emptyJournal(),
      { now: () => Date.parse("2026-10-03T00:00Z"), timeZone: () => "UTC" },
      { next: () => "e" + i },
    ).episodes[0];
    j.episodes.push({ ...episode, active: false, note: "detail-" + i });
  }
  const question = "long-question-".repeat(100);
  const html = renderSummary(
    summarize(j, "2026-10-03", "2026-10-03", 0, [
      question,
      "second",
      "third",
      "fourth",
    ]),
    "en",
  );
  const firstPage = html.split('<section class="detail">')[0];
  expect(firstPage.match(/<tr><td>2026-10-03/g)).toHaveLength(3);
  expect(firstPage).not.toContain(question);
  expect(html).toContain(question);
  expect(html).toContain("detail-5");
  expect(html).toContain("Full episode records follow.");
});
