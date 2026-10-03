# 메니에르 기록 · Meniere Journal

증상과 생활을 기기에 암호화해 기록하고 진료 전에 PDF와 질문을 정리하는 Android·iOS 앱. 무료, 배너 광고만 사용한다. 한국어·영어와 밝은/어두운 화면을 지원한다.

현재 상태는 **구현·네이티브 QA 단계**다. Google Play·App Store 업로드, 심사 제출, 공개 출시는 아직 하지 않았다. 의료 문구 검수, iOS 실기기, 국가별 정책·광고 동의 검증이 출시 조건이다.

## 개발

Node 24.16.0, pnpm 11.3.0, Xcode와 Android SDK가 필요하다. Expo Go는 SQLCipher 및 광고 SDK를 포함하지 않으므로 개발용 네이티브 빌드를 사용한다.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm prebuild
pnpm android
# 또는
pnpm ios
```

네이티브 폴더는 Expo 설정에서 생성하고 Git에 저장하지 않는다. 일반 개발·QA는 샘플 광고를 사용한다. production 설정은 앱별 공개 광고 ID를 읽는다.

```sh
pnpm --dir apps/mobile exec expo install --check
node scripts/check-release.mjs --schema-only
pnpm check:release
```

마지막 명령은 미완료 출시 조건이 있으면 실패한다. 빌드 성공을 출시 완료로 취급하지 않는다.

## 문서

- [승인된 제품 계약](docs/approved-contract.md)과 [최초 기획 원문](docs/initial-plan.md)
- [구현·보관·계정·운영](docs/implementation.md)
- [실제 검증과 남은 조건](docs/qa.md)
- [제품 출시 원장](release/app-launch-ledger.json)과 [이번 후보 상태](release/market-launch-state.json)
