# 구현과 운영

메니에르 기록은 성인이 자신의 증상·하루 상태·생활 기록을 보관하고 진료 질문을 정리하는 무료 앱이다. Android와 iOS가 같은 제품 로직을 사용한다. 계정, 서버, Firebase, 원격 분석, 결제는 사용하지 않는다.

## 구조

- `packages/product-core`: 데이터 형식, 생성·검증, 기간 집계, 백업 병합, 원본 CSV. 플랫폼 SDK와 네트워크에 의존하지 않는다.
- `apps/mobile/src/adapters`: SQLCipher·OS 키 저장소, 파일·PDF·공유, 로컬 알림, 광고 동의.
- `apps/mobile/src/ui`: 기록·생활·진료·설정 화면. `App.tsx`가 저장 완료 이후에 화면 상태를 변경한다.
- `apps/mobile/modules/journal-privacy`: iOS 파일 보호 및 iCloud 백업 제외.
- `play-store`, `app-store`, `release`: 계정과 출시 정보. AppsInToss는 첫 버전에서 보류했다.

## 보관과 복구

전체 기록을 SQLCipher DB의 단일 행으로 원자적으로 저장한다. 데이터 형식 2에는 전정재활 계획과 수행 기록이 포함되며, 형식 1의 기존 설치·비밀번호 백업은 기록을 보존하는 일방향 변환 후 사용한다. 미래 형식은 거부한다. 키는 기기별 32바이트 난수이며 SecureStore에 보관한다. iOS는 잠금 해제된 기기에서만 접근하고 다른 기기로 키를 이전하지 않는다. Android는 자동 클라우드 백업과 기기 이전에서 앱 데이터를 제외한다. iOS는 DB 디렉터리에 파일 보호 및 백업 제외 속성을 설정한다.

수동 백업은 12자 이상 비밀번호를 사용하는 별도 SQLCipher 파일이다. 가져오기 전에 별도 임시 파일에서 암호·무결성·버전·전체 데이터 형식을 확인한다. 기존 데이터는 미리보기 전까지 변경하지 않는다. 동일 기록은 중복 생성하지 않고 충돌은 기본적으로 기존 기록을 유지한다. 다른 기기의 화면 설정과 연락처는 덮어쓰지 않는다. 결합 후 데이터가 유효하지 않으면 저장하지 않는다.

PDF와 CSV는 암호화되지 않는다. 사용자가 공유 전에 범위를 확인한다. Android의 인쇄·공유 호출이 끝났다고 수신자가 파일 읽기를 마친 것은 아니다. 미리보기는 HTML을 네이티브 인쇄기에 직접 넘기며, 공유 PDF·CSV·암호화 백업은 앱의 비공개 캐시에 두고 다음 앱 초기화 또는 전체 삭제 때 정리한다. 외부로 저장한 파일은 앱에서 회수하거나 삭제할 수 없다. 앱 삭제·기기 분실에는 비밀번호 백업이 필요하며 서버를 통한 복구가 없다.

## 광고와 계정

Google Play·AdMob 대상은 `wellknowngeek@gmail.com`이다. AdMob 로그인 이메일과 게시자 `pub-9932778305312246`을 콘솔에서 확인한 뒤 앱 두 개와 배너 두 개만 생성했다. 공개 ID 정본은 `release/admob.json`, 로컬 카탈로그는 `app/meniere-support/identity` 및 `app/meniere-support/admob/public-identifiers`다. 다른 앱 키와 Firebase 자원은 만들지 않았다.

기본 개발·QA 빌드는 Google 샘플 광고 ID를 사용한다. `APP_VARIANT=production`일 때만 등록한 앱의 광고 ID를 사용한다. 건강 데이터·검색어·의료 관심사를 광고 요청에 넣지 않으며 비개인화 요청만 보낸다. 기록 입력, 전정재활, 도움, 진료, 진행 중 발작 및 내보내기 작업 중에는 배너를 숨긴다. 광고 동의 오류는 기록 사용을 차단하지 않는다. 실제 광고 게재는 별도의 UMP·AdMob 검토 조건이다.

[개인정보처리방침 한국어](https://seorilabs.com/apps/meniere-support/privacy/) · [English](https://seorilabs.com/en/apps/meniere-support/privacy/) · 문의 `cs@seorilabs.com`.

## 출시와 변경

개발 브랜치와 Ready PR을 사용한다. main의 자동 작업은 정적 검사·제품 테스트·번들 생성이다. 네이티브 빌드 검증은 수동 workflow이며 스토어 제출을 하지 않는다. 공개 출시 조건은 제품 원장과 `market-launch-state.json`에 기록한다. `pnpm check:release --schema-only`는 원장 형식을 검사하며, 전체 `pnpm check:release`는 심사·공개·공개 설치까지 포함하는 출시 완료 검사다. 제출 전에는 해당 단계의 실제 준비와 동일 후보 설치 검증을 확인하고, 이후 단계는 수행한 뒤 근거와 함께 갱신한다. 전체 완료 검사가 미통과라고 내부 배포나 심사 준비를 금지하거나 이후 상태를 미리 통과시키지 않는다.

스토어에 이미 공개한 버전은 앱 마켓 상태를 직접 조회해 확인한다. 장애 시 기존 태그와 schema 호환성을 먼저 확인하고, 건강 기록을 지우는 되돌리기를 하지 않는다. 사용자에게 수동 백업과 내보내기 방법을 안내한다.

## 공식 구현 근거

- [Expo SQLite SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/#sqlcipher)
- [SQLCipher export와 무결성 검사](https://www.zetetic.net/sqlcipher/sqlcipher-api/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/): SDK 57의 `copy`·`move`는 비동기이므로 완료를 기다린다.
- [Google 사용자 동의 관리](https://developers.google.com/admob/android/privacy)
- [Expo Android 권한 제외](https://docs.expo.dev/guides/permissions/)와 [화면 캡처 방지](https://docs.expo.dev/versions/latest/sdk/screen-capture/): 캡처 방지에 사진 접근 권한은 필요하지 않다.

의료 도움 문구의 원 출처와 검토 한계는 `initial-plan.md`에 보존했다. 의료진 검수는 완료되지 않았다.

전정재활의 동작과 의료 검수 범위는 [운동 프로그램](rehab-program.md)에 기록했다.
