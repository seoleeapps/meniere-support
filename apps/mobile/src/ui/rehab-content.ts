import type { RehabKind } from "@meniere/product-core";
import type { translator } from "./labels";
export const rehabSources = {
  rationale: "https://www.nidcd.nih.gov/health/menieres-disease",
  gaze: "https://www.nbt.nhs.uk/our-services/a-z-services/physiotherapy/specialist-physiotherapy-service/therapy-erehab-video-resources/therapy-erehab-vestibular",
  vertical:
    "https://www.sfh-tr.nhs.uk/media/2kxnsa40/pil202512-04-vrmp-vestibular-rehabilitation-management-plan.pdf",
  balance:
    "https://www.therotherhamft.nhs.uk/patients-and-visitors/patient-information/standing-balance-retraining",
};
export function rehabName(kind: RehabKind, t: ReturnType<typeof translator>) {
  return {
    gaze_horizontal: t("시선 안정화 · 좌우", "Gaze stability · horizontal"),
    gaze_vertical: t("시선 안정화 · 상하", "Gaze stability · vertical"),
    balance_supported: t("지지물을 이용한 균형", "Balance with support"),
  }[kind];
}
export function rehabSteps(kind: RehabKind, t: ReturnType<typeof translator>) {
  if (kind === "balance_supported")
    return [
      t(
        "단단하고 평평한 바닥에서, 움직이지 않는 작업대나 난간을 손으로 잡고 섭니다. 필요한 경우 옆에서 도울 사람과 함께하세요.",
        "Stand on a firm, level surface holding a fixed counter or rail. Have someone beside you if you need support.",
      ),
      t(
        "눈을 뜨고 발은 의료진과 정한 간격으로 유지합니다. 앞의 고정된 곳을 보며 편한 자세를 유지합니다.",
        "Keep your eyes open and your feet at the spacing agreed with your clinician. Look at a stationary point and maintain a comfortable stance.",
      ),
      t(
        "정해 둔 시간만 유지하고 앉아서 쉽니다. 앱은 발 간격을 좁히거나 눈을 감도록 자동으로 진행하지 않습니다.",
        "Hold only for your agreed time, then sit and rest. The app does not progress to narrower stances or eyes closed.",
      ),
    ];
  return [
    t(
      "등을 받치고 앉습니다. 휴대폰을 눈높이의 움직이지 않는 거치대에 놓고 X가 선명하게 보이는 거리를 정하세요. 손에 든 휴대폰을 따라 움직이지 않습니다.",
      "Sit with your back supported. Place the phone in a stationary holder at eye level, at a distance where X is clear. Do not follow a hand-held moving phone.",
    ),
    kind === "gaze_horizontal"
      ? t(
          "눈은 가운데 X에 고정한 채 머리만 작은 범위에서 좌우로 돌립니다. X가 선명하게 보이는 속도와 의료진이 허용한 목 움직임 범위를 따르세요.",
          "Keep your eyes on the central X while turning only your head gently left and right. Use the speed that keeps X clear and the neck range allowed by your clinician.",
        )
      : t(
          "눈은 가운데 X에 고정한 채 머리만 작은 범위에서 위아래로 끄덕입니다. X가 선명하게 보이는 속도와 의료진이 허용한 목 움직임 범위를 따르세요.",
          "Keep your eyes on the central X while gently nodding only your head up and down. Use the speed that keeps X clear and the neck range allowed by your clinician.",
        ),
    t(
      "타이머가 끝나면 멈추고 쉽니다. 불편감이 가라앉고 안전하다고 느낄 때 직접 다음 회차를 시작하세요.",
      "Stop and rest when the timer ends. Start the next round yourself only when symptoms settle and you feel safe.",
    ),
  ];
}
export function rehabOutcome(
  value: "done" | "stopped" | "unfinished",
  t: ReturnType<typeof translator>,
) {
  return {
    done: t("완료", "Completed"),
    stopped: t("중단", "Stopped"),
    unfinished: t("미완료 · 확인 필요", "Unfinished · review needed"),
  }[value];
}
