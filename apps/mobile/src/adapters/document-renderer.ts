import type { Language, Summary } from "@meniere/product-core";
import {
  translator,
  symptomName,
  earName,
  impactName,
  timeName,
} from "../ui/labels";
export const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function renderSummary(summary: Summary, language: Language): string {
  const t = translator(language),
    s = summary,
    h = escapeHtml;
  const header = t("진료 준비 기록", "Visit preparation journal");
  const row = (e: Summary["episodes"][number]) =>
    `<tr><td>${h(e.date)}${e.crossesBoundary ? `<br/>${h(t("기간 경계에 걸침", "Crosses period boundary"))}` : ""}</td><td>${h(timeName(e.start, e.timeZone, language))}<br/>→ ${h(timeName(e.end, e.timeZone, language))}<br/>${h(e.timeZone)}</td><td>${h(e.symptoms.map((x) => symptomName(x, t)).join(", ") || t("미입력", "Not entered"))}<br/>${h(earName(e.ear, t))}</td><td>${h(impactName(e.impact, t))}</td></tr>`;
  const table = s.episodes.slice(0, 3).map(row).join("");
  const fullTable = s.episodes.map(row).join("");
  const hasFullQuestions =
    s.questions.length > 3 ||
    s.questions.some((q) => Array.from(q).length > 160);
  const questions = (
    s.questions.length
      ? s.questions.slice(0, 3)
      : [
          t(
            "다음 진료에서 이야기할 질문을 적어 주세요.",
            "Add questions to discuss at your next visit.",
          ),
        ]
  )
    .map(
      (q) =>
        `<li>${h(Array.from(q).slice(0, 160).join(""))}${Array.from(q).length > 160 ? "…" : ""}</li>`,
    )
    .join("");
  const details = s.episodes
    .map(
      (e) =>
        `<article><h3>${h(e.date)}</h3><p>${h(t("일상 복귀", "Return to daily activities"))}: ${h(timeName(e.recovery, e.timeZone, language))}</p><p>${h(t("증상 메모", "Symptom notes"))}: ${h(e.note || "—")}</p><p>${h(t("복약·치료 변경 메모", "Medication / treatment change notes"))}: ${h(e.treatment || "—")}</p></article>`,
    )
    .join("");
  const habits = s.habitLogs
    .map(
      (l) =>
        `<tr><td>${h(l.date)}</td><td>${h(l.title)}</td><td>${h({ done: t("실천함", "Done"), partial: t("일부", "Partly"), skipped: t("건너뜀", "Skipped") }[l.outcome])}</td><td>${h([l.sleepHours === null ? "" : `${l.sleepHours} ${t("시간", "hours")}`, l.stress === null ? "" : `${t("부담", "Stress")} ${l.stress}/3`, l.note].filter(Boolean).join(" · "))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"/><style>
    @page{size:A4;margin:16mm}body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans',Arial,sans-serif;font-size:11pt;color:#153D36;line-height:1.5}h1{font-size:22pt}h2{font-size:15pt}h3{font-size:12pt}p,li,td{overflow-wrap:anywhere;white-space:pre-wrap}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border-bottom:1px solid #c4d8d2;text-align:left;padding:7px;vertical-align:top}thead{display:table-header-group}tr,article{break-inside:avoid}.detail{break-before:page}.note{font-size:10pt;color:#4c635e}.stats{background:#edf5f2;padding:12px;border-radius:8px}
    </style></head><body><h1>${h(header)}</h1><p>${h(s.from)} — ${h(s.to)}</p><p class="note">${h(t("본인이 남긴 기록입니다. 누락과 기억의 오차가 있을 수 있으며 진단이나 치료 판단을 대신하지 않습니다.", "Patient-entered records may be incomplete or approximate. This journal does not provide diagnosis or treatment advice."))}</p><div class="stats">
    ${h(t("하루 상태를 남긴 날", "Days with a daily check-in"))}: ${s.recordedDays}/${s.totalDays}<br/>${h(t("미기록", "Unrecorded days"))}: ${s.missingDays} · ${h(t("증상 없음 확인", "Confirmed symptom-free days"))}: ${s.noSymptomDays}<br/>
    ${h(t("기록된 발작", "Recorded episodes"))}: ${s.episodeCount} · ${h(t("정확한 지속 시간", "Exact durations"))}: ${s.exactCount} · ${h(t("대략", "Approximate durations"))}: ${s.approximateCount} · ${h(t("시간 미확정", "Unknown durations"))}: ${s.unknownCount}<br/>
    ${h(t("정확한 전체 지속 시간 평균", "Mean full duration of exact records"))}: ${s.meanMinutes === null ? "—" : `${Math.round(s.meanMinutes)} ${h(t("분", "min"))}`}<br/>${h(t("큰 일상 중단을 남긴 발작 발생일", "Episode dates with major disruption"))}: ${s.majorImpactDays}
    </div><h2>${h(t("발작 내역", "Recorded episodes"))}</h2><table><thead><tr><th>${h(t("발생일", "Date"))}</th><th>${h(t("시작 → 종료", "Start → end"))}</th><th>${h(t("증상·귀", "Symptoms / ear"))}</th><th>${h(t("일상 영향", "Daily impact"))}</th></tr></thead><tbody>${table || `<tr><td colspan="4">${h(t("이 기간에 남긴 발작 기록이 없습니다.", "No episodes recorded in this period."))}</td></tr>`}</tbody></table>${s.episodes.length > 3 ? `<p class="note">${h(t("처음 3건을 표시합니다. 전체 발작 내역은 다음 페이지에 있습니다.", "The first 3 records are shown. Full episode records follow."))}</p>` : ""}<h2>${h(t("진료 질문", "Questions for your visit"))}</h2><ol>${questions}</ol><p class="note">${h(t("생성일", "Generated"))}: ${h(new Date(s.generatedAt).toISOString().slice(0, 10))} · Meniere Journal</p>
    ${
      details || habits || hasFullQuestions
        ? `<section class="detail"><h2>${h(t("상세 기록", "Detailed records"))}</h2>${s.episodes.length > 3 ? `<table><thead><tr><th>${h(t("발생일", "Date"))}</th><th>${h(t("시작 → 종료", "Start → end"))}</th><th>${h(t("증상·귀", "Symptoms / ear"))}</th><th>${h(t("일상 영향", "Daily impact"))}</th></tr></thead><tbody>${fullTable}</tbody></table>` : ""}${details}${habits ? `<h2>${h(t("생활 기록", "Habit records"))}</h2><table><thead><tr><th>${h(t("날짜", "Date"))}</th><th>${h(t("항목", "Habit"))}</th><th>${h(t("확인", "Check-in"))}</th><th>${h(t("메모", "Details"))}</th></tr></thead><tbody>${habits}</tbody></table>` : ""}${
            hasFullQuestions
              ? `<h2>${h(t("전체 질문", "Full questions"))}</h2><ol>${s.questions

                  .map((q) => `<li>${h(q)}</li>`)
                  .join("")}</ol>`
              : ""
          }</section>`
        : ""
    }</body></html>`;
}
