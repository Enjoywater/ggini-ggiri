# 끼니끼리 (GGINI GGIRI)

> 다회차(N차) 모임에서 인원과 조건이 계속 바뀌어도 공정하게 정산할 수 있도록 돕는 PWA.

N차 모임에서 매번 달라지는 참여자, 결제자, 술값 분담까지 —
끼니끼리가 공정한 정산을 자동으로 계산합니다.
설치 없이 브라우저에서 바로, 또는 홈 화면에 추가하여 앱처럼.

## 주요 기능

### 정산 입력

- N차별로 결제자, 참여자, 금액 입력 (빠른 금액 버튼, 전체 선택/해제 토글)
- 참여자 일괄 추가 (쉼표/줄바꿈 구분), 인라인 이름 수정, 프리셋(그룹) 저장/불러오기
- 세션 합계 실시간 표시, 금액 입력 시 자동 전체선택
- 0원 세션 경고 (시각적 강조 + 정산 시 toast 알림), 결제자 참여 해제 방어

### 주류 분리 정산

- 주류 단가/수량/음주자 지정 — 비음주자는 술값 부담 제외
- 시각적으로 구분된 주류 섹션, 음주자 전체 선택/해제

### 자동 정산 결과

- 보내야 할 금액 / 받을 금액 양방향 표시 + 송금 요약
- 세션별 계산식 투명 공개 (기본 부담, 주류 부담, 10원 절사 설명)
- 송금 완료 체크 (건별 완료 표시, 카운트, 초기화) + 전체 완료 시 축하 배너
- 삭제 실행취소 (참여자/세션 삭제 후 5초간 Undo 토스트로 되돌리기)

### 공유

- 카카오톡 피드 공유 (Kakao JS SDK — 송금 요약 + 계좌 정보 + 상세 링크)
- 텍스트 공유 / 클립보드 복사 (세션별 내역 + 개인별 부담액 포함)
- 공유 링크(`/detail?id=...`)로 정산 상세 조회

### 기록 관리

- 정산 기록 자동 저장, 검색 & 정렬 (이름/제목 검색, 최신순/오래된순/금액 높은순)
- JSON Export/Import (백업/복원, 계좌 정보 자동 제외)
- 계좌 정보 저장 + 원클릭 복사, 미설정 시 설정 유도 CTA 배너

### 접근성 & UX

- WCAG AA 색상 대비, 44px 최소 터치 타겟, 상태 반영 ARIA 라벨
- `aria-live` 실시간 알림, `aria-controls` 연결, 키보드 네비게이션
- 다크모드 (라이트/다크/시스템), Skeleton 로딩, 모달 포커스 트랩
- Sticky 정산하기 버튼 (safe-area 대응)

## 정산 규칙

- 세션 기본 부담액: `(총액 - 술값) / 참여인원`
- 술값 부담액: `(주류 단가 x 수량) / 음주자 수` (술값이 총액을 초과하면 총액으로 상한 제한)

- 각 개인 부담액은 10원 단위 절사(`floor`)
- 절사로 생긴 차액은 해당 세션 결제자에게 보정 (`adjustRemainder`)
- 정산 상세(`settle()`)와 송금 계산(`calculateBalance()`)이 동일한 절사·보정 로직을 공유하여 금액 정합성 보장
- 전체 합계(받을 돈/보낼 돈) 일치 보장
- 송금 경로는 Greedy 방식으로 최소 동선에 가깝게 최적화

정밀 연산은 `big.js`를 사용해 부동소수점 오차를 줄입니다.

## 시작하기

### 요구사항

- Node.js: `22.14.0` (`.tool-versions` 기준)
- npm

### 설치

```bash
npm install
```

### 로컬 개발 서버

```bash
npm run dev
```

기본 주소: `http://localhost:3000`

### 테스트

```bash
npm run test
```

감시 모드:

```bash
npm run test:watch
```

### 린트

```bash
npm run lint
```

### pre-push hook

`git push` 실행 시 자동으로 ESLint → TypeScript 타입 체크 → 전체 테스트를 순서대로 실행합니다.
하나라도 실패하면 push가 차단되어 테스트 실패 코드가 배포되는 것을 방지합니다.

- hook 파일: `.git/hooks/pre-push`
- CI: `.github/workflows/ci.yml` (GitHub Actions — push/PR 시 lint → type-check → test → build)

## 빌드 및 배포

### 웹 빌드

```bash
npm run build
```

Vercel에 배포 중이며, 환경변수 설정이 필요합니다:
- `NEXT_PUBLIC_KAKAO_JS_KEY` — 카카오 JavaScript 앱 키
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon 키

### PWA

빌드 결과물(`out/`)을 정적 호스팅에 배포하면 PWA로 동작합니다.

- `manifest.json` — 앱 이름, 테마 컬러, standalone 모드 설정
- `sw.js` — Service Worker (정적 에셋 캐시, 오프라인 지원, 외부 API 캐시 제외)

사용자는 모바일 브라우저에서 **"홈 화면에 추가"** 를 통해 네이티브 앱처럼 사용할 수 있습니다.

## 기술 스택

- 프레임워크: Next.js 16 (App Router), React 19, TypeScript (strict mode)
- 상태관리: Zustand + persist + useShallow
- 정산 연산: big.js
- 공유 데이터: lz-string (압축) + Supabase (저장, 지연 로딩)
- 카카오톡 공유: Kakao JS SDK
- 식별자 생성: nanoid
- 스타일: Tailwind CSS v4
- PWA: manifest.json + Service Worker
- 테스트: Vitest
- 보안 헤더: vercel.json (CSP, X-Frame-Options, Permissions-Policy 등)

## 아키텍처

Feature-Sliced Design(FSD) 구조를 따릅니다.

```text
src/
├─ app/          # 라우트 엔트리
├─ views/        # 페이지 단위 화면 조합
├─ widgets/      # 복합 UI 블록 (SessionCard, SettlementResult)
├─ features/     # 사용자 액션/비즈니스 기능 (calculate, share, export-import, inline-onboarding)
├─ entities/     # 도메인 상태 및 모델 (member, session, account, history, preset, theme, transfer-completion, onboarding)
└─ shared/       # 공용 UI/유틸/타입/상수
    ├─ ui/       # Button, Input, Modal, Card, Chip, Switch, StickyBottomBar, Skeleton, CelebrationBanner 등
    ├─ lib/      # settlement-engine, validators, serializer, constants, toast, undo, hooks 등
    └─ types/    # TypeScript 인터페이스
```

주요 라우트:

- `/` 메인 입력 화면
- `/settlement` 정산 결과
- `/history` 정산 기록
- `/settings` 설정(테마/계좌/초기화)
- `/detail?id=...` 공유 상세 화면 (Supabase), `/detail?d=...` (lz-string 하위 호환)

## 데이터 저장 및 보안

- Zustand persist로 로컬 기기에 데이터 저장 (참여자, 세션, 계좌, 프리셋, 히스토리, 송금 완료 상태)
- 공유 데이터는 Supabase에 저장, 짧은 ID로 접근 (`/detail?id=xxx`)
- 환경변수 미설정 시 Supabase/Kakao 기능이 안전하게 비활성화
- 공유 URL에는 계좌 정보 미포함 (카카오톡 카드 description에만 표시)

<details>
<summary>보안 정책 상세</summary>

- Supabase 저장 전 `validateShareableData()` 검증 수행 (DB 오염 방지)
- Service Worker에서 Supabase/Kakao 등 외부 API 응답은 캐싱하지 않음
- 공유 링크 복원 시 구조/타입/논리 일관성 검증 수행
  - 배열 길이 제한 (DoS 방지, 최대 100개)
  - 금액 범위 검증 (세션 1억, 단가 1천만, 수량 999, 정산 합산 10억)
  - 세션 논리 검증 (결제자∈참여자, 음주자⊆참여자, 중복 ID, 주류 총액 ≤ 세션 총액)
  - transfers 필드 포함 검증
- 복원 데이터에 계좌 정보 필드(`accountNumber`, `bankName`, `ownerName`)가 포함되면 차단
- 문자열 sanitize (제어 문자 + HTML 태그 제거, 200자 제한, XSS 방어는 React JSX 자동 이스케이핑에 위임)
- Supabase 공유 데이터 100KB 크기 제한 + ID 형식 검증
- 검증 상수 일원화 (`shared/lib/constants.ts` — validators와 serializer가 동일 상수 참조)
- 보안 헤더 적용 (`vercel.json`):
  - Content-Security-Policy (script/style/connect/img/font/worker/frame-ancestors/base-uri/form-action/object-src)
  - X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

</details>

## 테스트

정산 엔진, 스토어 무결성, UI 컴포넌트, 접근성, E2E 유저 저니 등 주요 영역을 커버하는 단위/통합/E2E 테스트를 포함합니다.

```bash
npm run test
```

주요 테스트 영역:
- **정산 엔진**: 기본 정산, 술값 분리, 절사 보정, 엣지 케이스 (56 tests)
- **스토어**: 멤버/세션/히스토리/프리셋/온보딩/송금완료/Undo (70+ tests)
- **UI 컴포넌트**: Button, Input, Modal, Chip, Toast, CelebrationBanner 등 (80+ tests)
- **뷰 통합**: MainPage, SettlementPage, HistoryPage, SettingsPage, DetailPage (160+ tests)
- **E2E 유저 저니**: 2인 정산, 5인 MT, 프리셋 플로우, 멤버 삭제 Undo, 세션 Undo, 송금 전체 완료 (33 tests)
- **공유/직렬화**: 카카오 공유, 텍스트 공유, Supabase 지연 로딩 (40+ tests)
- **접근성/유효성**: ARIA 속성, 포커스 트랩, 유효성 검증 (70+ tests)

## 동작 특성

- 계좌 예금주가 참여자 목록에 없으면 메인 화면 진입 시 자동 추가됩니다.
- 정산 페이지 진입 시 결과가 히스토리에 자동 저장됩니다 (중복 저장 방지 처리 포함).
- 히스토리는 최대 50개까지 보관됩니다.
- 토스트 알림은 메시지 길이에 따라 자동 Duration이 조절됩니다 (2~5초, 에러 시 +1.5초). 타이머는 수동 제거 시 자동 클린업됩니다.
- 모달 상태는 `useModalManager` 훅으로 통합 관리됩니다 (MainPage 6개 모달).
- 참여자/세션 삭제 시 5초간 Undo(실행취소) 가능합니다. 삭제 전 세션 전체 스냅샷을 저장하여 cascade 복원을 보장합니다.
- Supabase SDK는 공유 기능 사용 시에만 지연 로딩됩니다 (`getSupabase()` — dynamic import + 싱글턴 캐시).
- Zustand 스토어에서 `useShallow`와 개별 selector로 불필요한 리렌더를 방지합니다.

## 기여 가이드

- FSD 레이어 의존성: `app → views → widgets → features → entities → shared` (상위→하위만 참조)
- 커밋 메시지: 한국어 가능, conventional commits 권장
- 새 기능에는 테스트 동반 필수
- 문서 개선 제안이나 기능 요구사항은 이슈/PR로 남겨주세요

## 라이선스

MIT License
