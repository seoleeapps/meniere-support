# 공개 후 광고 설정과 증상 입력 점검

2026-10-07 점검. 대상은 Google Play의 `com.seoleeapps.menieresupport`와 AdMob Android 앱 `ca-app-pub-9932778305312246~4130423403`이다.

## 광고 URL과 현재 상태

- Google Play Console에서 개인 개발자 계정 `Seolee Apps`, ID `5547060480954653351`, 대상 패키지의 프로덕션 상태를 확인했다. 공개 Google Play 페이지가 열리고 설치 버튼을 제공한다. 이번 점검에서 공개 설치나 실제 광고 노출을 검증한 것은 아니다.
- 공개 페이지의 App support → Website는 `https://seorilabs.com/`이다. 저장소의 `play-store/google-play.config.json`과 일치한다. Android에서는 이 개발자 웹사이트가 app-ads.txt 탐색 기준이다.
- `https://seorilabs.com/app-ads.txt`는 `https://www.seorilabs.com/app-ads.txt`로 연결되어 HTTP 200과 `text/plain` 응답을 제공한다. 대상 게시자 `pub-9932778305312246`의 DIRECT 행이 있다. robots.txt는 HTTP 200이며 전체 경로를 허용한다.
- AdMob 로그인 이메일과 게시자 ID를 재조회해 대상 앱 소유자를 대조했다. app-ads.txt 표의 정확한 패키지 행은 `파일을 찾아서 확인했습니다`, URL은 `https://seorilabs.com/app-ads.txt`, 최종 크롤링은 조회 당시 `5분 전`이었다.
- 같은 앱 설정에는 앱 인증 `확인 안됨`, 승인 상태 `검토 필요`가 남아 있다. URL 오류와 파일 크롤링 실패는 현재 확인한 원인이 아니다. 파일 확인과 앱 인증·광고 준비 심사는 별개다.
- 다음 단계는 앱 설정의 Verify app → Check for updates다. Google 공식 안내에 따르면 앱 인증 성공 뒤 광고 준비 심사가 시작된다. 이번 URL 점검에서는 인증 요청·심사 제출·설정 변경을 하지 않았다.
- 앱 코드상 동의 수집·광고 초기화는 생활 또는 설정 화면에서 시작한다. 그 전에는 홈과 목록에서도 배너가 준비되지 않는다. 입력·도움·진료 준비·진행 중 발작에서는 광고를 숨기는 기존 정책을 유지한다. 이 코드 확인은 실제 광고 노출의 증거가 아니다.
- Apple 설정은 저장소에서 등록 확인 대기 상태다. 이번에 확인한 URL과 광고 상태는 Android에 한정한다.

공식 근거: [개발자 웹사이트와 app-ads.txt 문제 확인](https://support.google.com/admob/answer/9776740?hl=en), [파일 확인 후 별도 앱 인증](https://support.google.com/admob/answer/14538460?hl=en).

## 증상 입력 설계

사용자는 아이콘·증상명 카드와 선택 시 색상·체크 표시를 선택했다. 기존 기록 형식과 증상의 의미는 유지한다.

- 목적: 기억나는 증상을 모두 선택하고 발작 기록에 저장한다.
- 핵심 행동: `기록 저장`.
- 증상 선택을 세 개의 시간 입력 위로 이동해 먼저 보이게 한다.
- 여섯 증상을 개별 아이콘과 이름으로 표시한다. 전체 카드가 누르기 영역이며, 선택 상태는 진한 배경과 체크 표시, 선택 개수로 전달한다.
- 선택은 필수가 아니다. 0개 선택을 증상 없음 확인으로 바꾸지 않는다.
- 작은 화면 또는 큰 글자에서는 한 열로 표시하고 텍스트를 줄이거나 자르지 않는다.
- 화면 읽기에는 증상명, checkbox 역할과 checked·disabled 상태를 제공한다. 저장 중에는 카드 입력을 막는다.
- 색·간격·글자·SVG는 기존 앱 구성요소를 재사용한다. 추가 SDK나 기록 변환은 없다.

## 검증

`pnpm check`의 타입 검사, 코어 33개·플랫폼 8개 테스트, 구조와 출시 메타데이터 형식 검사가 통과했다. 런타임 검증 결과는 아래에 별도로 기록한다.

- iPhone 16 Pro / iOS 18.1 전용 신규 시뮬레이터: 가상 발작에서 어지럼·이명 선택, 어지럼 해제·재선택, 선택 개수 갱신, 저장, 기록 목록에서 다시 열기와 두 checkbox의 `checked` 유지 확인. 한국어·영어 실행 화면을 실제 캡처해 아이콘·색·체크·라벨을 비교했다. 한국어 기본 글자 크기에서 여섯 카드가 첫 화면 안에 보인다.
- iPhone SE 3세대 / iOS 18.1 전용 신규 시뮬레이터: 시스템 `accessibility-large` 글자 크기와 다크 모드에서 한 열 배치, 카드의 스크롤·선택과 읽을 수 있는 증상명을 확인했다. 카드와 체크 표시는 겹치지 않는다.
- 시뮬레이터 전체 Maestro flow는 개발 메뉴 및 제어 서버 시작 지연으로 완료되지 않았다. 서버가 시작된 뒤 공식 Maestro XCTest HTTP의 `viewHierarchy`·`touch`·`swipe` API로 실제 네이티브 입력을 수행하고 상태와 캡처를 대조했다. flow 실패를 통과로 바꾸어 기록하지 않는다.
- 테스트는 새로 생성한 시뮬레이터 두 대의 별도 앱 저장소에서 가상 입력만 사용했다. 기존 시뮬레이터·실기기·사용자 기록은 수정하지 않았다.
- 초기 CI의 Expo 호환 버전 검사 실패를 SDK 57의 공식 패치 버전으로 맞춰 해결했다. Expo 57.0.27, constants 57.0.21, notifications 57.0.22, screen-capture 57.0.4, sqlite 57.0.4와 잠금 파일을 반영했다. 설치 도구가 요구하는 게시 후 대기 예외는 선택한 정확한 패치 버전만 등록하며 와일드카드나 검사 생략은 없다. `expo install --check`, 최종 Android export와 제품 CI가 통과했다.
- 런타임 화면은 기존 SDK 57 개발용 네이티브 셸에 수정 JS를 연결해 확인한 것이다. 갱신한 네이티브 패치가 포함된 새 APK·IPA는 빌드하지 않았다. 다음 출시 후보에서 네이티브 빌드와 기기 검증이 필요하다.
- 연결된 실기기가 없어 Android/iOS 실기기의 이번 UI 변경과 실제 운영 배너는 미검증이다. VoiceOver 실제 읽기, 키보드·오류 흐름의 이번 재검증도 남아 있다. checkbox 접근성 상태 조회를 실제 화면 읽기 검증으로 표현하지 않는다.

캡처와 네이티브 입력 상태는 기본 저장소 `artifacts/symptom-cards-20261007/`에 보존한다. 핵심 캡처는 `symptom-cards-ko-verified.png`, `symptom-cards-en-verified.png`, `symptom-cards-small-large-dark-verified.png`이다. 스토어 배포나 AdMob 인증 요청은 수행하지 않았다.
