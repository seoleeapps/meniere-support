# Android 공개 출시 준비

2026-10-03 사용자의 `안드로이드 출시까지 진행해. legacy-admob 프로필로` 요청은 이 앱의 Google Play 공개 출시 승인이다. iOS 제출은 이번 요청 범위에 넣지 않는다. 개인 계정에 앱 초안을 생성했다. 아직 업로드·심사 제출·공개는 하지 않았다.

## 계정과 건강 기능 신고

`legacy-admob`에서 로그인 이메일 `wellknowngeek@gmail.com`, 개발자 `Seolee Apps`, 계정 ID `5547060480954653351`, **개인 계정**을 현재 콘솔로 확인했다. 기존 앱은 세 개였다. 이번 앱 초안을 `com.seoleeapps.menieresupport`로 생성했으며 콘솔 앱 ID는 `4975784705764720395`다. 초기 로딩 중 나타난 계정 확인 잠금 문구는 데이터 로딩 후 사라졌다. 앱 생성 화면은 열리므로 신규 앱 생성 제한을 확정된 장애로 기록하지 않는다.

[Play Console 요구사항](https://support.google.com/googleplay/android-developer/answer/10788890)은 의료 앱 등 건강 서비스를 제공하는 개발자에게 조직 계정을 요구한다. [건강 기능 신고 분류](https://support.google.com/googleplay/android-developer/answer/14738291)에서는 질환 관리와 물리치료·재활을 Medical 영역에 둔다. 실제 신고에서 활동·영양·수면, 질병 및 컨디션 관리, 의료 참조 및 교육, 물리치료 및 재활을 선택했다. 의료기기 앱 항목은 선택하지 않았다. 신고의 두 번째 화면은 현재 지역별 추가 요구사항이 없다고 표시했으며 저장 후 재조회한 선택이 일치했다. 조직 전환을 요구하거나 개인 계정의 저장을 차단하는 안내는 없었다. 따라서 계정 유형만으로 출시 불가라고 한 초기 판단을 확정된 차단으로 사용하지 않는다. 신고 저장은 앱 심사·계정 적격성 최종 승인이 아니다.

계정의 `내 정보`에서 `계정 유형 변경`은 비활성화돼 있으며 도움말은 먼저 조직 웹사이트 제공·인증을 요구한다. 전환은 기존 앱 세 개를 포함한 계정 전체의 법적 신원과 공개 개발자 정보에 영향을 준다. 사용자는 의료 앱으로 전환할 의도가 없다고 명확히 했다. 기존 계정을 전환하지 않고 개인 기록·기존에 배운 운동을 보조하는 비의료기기 제품 의도를 유지한다. 계정 소유자 정보나 결제 프로필은 수정하지 않았다. 조직 전환이 실제 요구될 경우 그때 해당 콘솔·심사 근거를 기록한다.

## 의료진 제품 감수와 사용자 확인의 구분

사용자는 의료진 제품 감수를 받지 않았으며 참여 의료진도 없다고 답했다. [Google 건강 콘텐츠 정책](https://support.google.com/googleplay/android-developer/answer/16679511)에 모든 건강 앱이 의료진 감수 증명서를 제출해야 한다는 일률적 조항은 확인되지 않았다. 건강 기능 신고, 공개 개인정보처리방침, 오해하거나 해를 줄 수 있는 기능 금지, 의료기기 해당 시 규제 증명, 그 밖의 건강·의료 앱의 면책 및 의료 전문가 상담 안내가 요구된다. 의료진 감수 계획을 Google의 법적 필수 조건으로 설명하지 않는다.

제품 감수 미완료라는 사실과 기존 기획의 품질 검토 계획은 유지한다. 앱 사용자가 자신의 운동·시간·횟수를 의료진과 확인하는 체크는 개발 제품이 감수를 받았다는 증거가 아니다. 국가별 의료기기 해당 여부 역시 감수 여부와 별개다.

[FDA의 집행 재량 예시](https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-which-fda-will-exercise-enforcement-discretion)는 가정의 물리치료 운동을 돕는 영상·게임 등의 낮은 위험 소프트웨어를 포함한다. 이 자료만으로 본 앱이 전 세계에서 의료기기가 아니라고 확정하지 않는다. 스토어 설명의 비의료기기 면책 초안은 실제 출시 국가 분류가 정리된 뒤 적용한다. 앱 자체의 치료 효과·정확도·임상 검증을 주장하지 않는다.

## 서명 빌드

버전 `0.1.0`, versionCode `1`, 패키지 `com.seoleeapps.menieresupport`. production prebuild는 앱별 실제 AdMob ID와 `withAndroidSigning`을 사용한다. Gradle은 다음 네 환경변수가 없으면 즉시 실패한다. 비밀값을 생성된 Gradle 파일에 삽입하지 않는다.

- `ANDROID_SIGNING_STORE_FILE`
- `ANDROID_SIGNING_STORE_PASSWORD`
- `ANDROID_SIGNING_KEY_ALIAS`
- `ANDROID_SIGNING_KEY_PASSWORD`

등록된 논리 ID는 `app/meniere-support/google-play/upload-key`다. 다른 앱 서명이나 debug 인증서를 production의 대체값으로 사용하지 않는다. 일반 QA prebuild는 샘플 광고·debug 서명을 유지한다. 업로드 키의 공개 지문과 실제 산출물은 출시 원장에 기록한다. Play App Signing의 최종 설치 인증서는 아직 생성되지 않았다.

```sh
APP_VARIANT=production pnpm --dir apps/mobile exec expo prebuild --platform android --no-install
# 카탈로그에서 확인한 이 앱의 서명 환경변수만 주입한다. shell 추적은 켜지 않는다.
cd apps/mobile/android
APP_VARIANT=production ./gradlew bundleRelease
```

현재 설치된 Seeker QA 앱은 debug 인증서로 서명돼 있다. production 인증서로 덮어 설치하려고 앱을 삭제하거나 데이터를 초기화하지 않는다. Play 내부 테스트에서 같은 후보를 설치·검증한 증거는 아직 없다.

## 스토어 자료

한국어·영어 이름, 짧은 설명, 상세 설명, 릴리스 문구 정본은 `play-store/google-play.config.json`이다. `play-store/release.json`의 중복 설정을 이 파일로 대체했다. 모든 기록·백업·내보내기는 무료이며 배너 광고만 사용한다. 성인 대상, 로그인 없음, 의료진·서버 모니터링 없음으로 신고한다.

건강 기능 신고에는 질환 관리와 물리치료·재활을 숨기지 않았으며 초안으로 저장했다. 광고 SDK가 네트워크·기기·광고 상호작용 정보를 처리하므로 Data safety를 `데이터 수집 없음`으로 신고하지 않는다. 세부 초안은 `play-store/policy/data-safety-review.md`에 기록했다. 등급, 광고 ID 신고, 규제 분류, SDK 데이터 신고, 그래픽 자산, 국가 설정은 아직 콘솔에 반영하지 않았다.

한국어·영어 개인정보처리방침은 현재 HTTP 200으로 확인했다. 승인된 전 세계 목표는 실제 국가별 검토·콘솔 국가 선택을 완료했다는 뜻이 아니다. 광고의 UMP 메시지와 AdMob 스토어 연결·앱 검토·실제 게재도 미완료다.
