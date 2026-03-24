# 끼니끼리 (GGINI GGIRI)

다회차(N차) 모임에서 인원과 조건이 계속 바뀌어도 공정하게 정산할 수 있도록 돕는 PWA입니다.
Next.js 기반의 정적 사이트로, 브라우저에서 바로 사용하거나 홈 화면에 추가하여 앱처럼 사용할 수 있습니다.

## 1) 사용자 관점: 이 앱으로 할 수 있는 것

- 참여자 추가/삭제 및 그룹(프리셋) 저장/불러오기
- 참여자 일괄 추가 (쉼표/줄바꿈 구분 — "철수,영희,민수" 입력 시 한번에 추가)
- 참여자 이름 탭으로 인라인 수정, ✕ 버튼으로 삭제
- N차별로 결제자, 참여자, 금액 입력
- 빠른 금액 버튼 (+1천/+5천/+1만/+5만) 으로 간편 입력
- 참여자/음주자 전체 선택/해제 토글
- 세션 합계 실시간 표시
- 술값 별도 정산(주류 단가/수량/음주자 지정, 시각적으로 구분된 주류 섹션)
- 자동 정산 결과 확인(보내야 할 금액 / 받을 금액 양방향 표시 + 송금 요약)
- 정산 근거 투명 공개(세션별 계산식 펼쳐보기: 기본 부담, 주류 부담, 10원 절사 설명)
- 송금 완료 체크 (송금 건별 완료 표시, 완료 카운트, 초기화)
- 계좌 정보 저장 후 원클릭 복사
- 계좌 미설정 시 설정 페이지 유도 CTA 배너
- 입력 유효성 검증 (금액, 주류 단가/수량 인라인 피드백)
- 정산 결과 공유
  - 카카오톡 공유 (Kakao JS SDK Feed 템플릿 — 송금 요약 + 계좌 정보 + 상세 링크)
  - 텍스트 공유/클립보드 복사 (세션별 내역 + 개인별 부담액 + 송금 요약 포함)
- 다크모드 지원 (라이트/다크/시스템 자동 감지)
- 정산 기록 자동 저장 및 기록 상세 조회
- 공유 링크(`detail`)로 정산 상세 확인
- 정산 기록 JSON Export/Import (데이터 백업 및 복원, 계좌 정보 자동 제외)
- 접근성 지원 (WCAG AA 색상 대비, 44px 터치 타겟, ARIA 속성, 키보드 네비게이션, 모달 포커스 트랩 + X 닫기 버튼)
- Sticky 정산하기 버튼 (스크롤해도 항상 하단 고정, safe-area 대응)
- Skeleton 로딩 화면 (하이드레이션 중 레이아웃 보존)
- 금액 입력 시 자동 전체선택 (수정 편의성)
- 0원 세션 경고 (시각적 강조 + 정산 시 toast 알림)
- 결제자 참여 해제 방어 (결제자는 참여자에서 토글 해제 불가)

## 2) 핵심 정산 규칙

- 세션 기본 부담액: `(총액 - 술값) / 참여인원`
- 술값 부담액: `(주류 단가 x 수량) / 음주자 수` (술값이 총액을 초과하면 총액으로 상한 제한)

- 각 개인 부담액은 10원 단위 절사(`floor`)
- 절사로 생긴 차액은 해당 세션 결제자에게 보정 (`adjustRemainder`)
- 정산 상세(`settle()`)와 송금 계산(`calculateBalance()`)이 동일한 절사·보정 로직을 공유하여 금액 정합성 보장
- 전체 합계(받을 돈/보낼 돈) 일치 보장
- 송금 경로는 Greedy 방식으로 최소 동선에 가깝게 최적화

정밀 연산은 `big.js`를 사용해 부동소수점 오차를 줄입니다.

## 3) 실행 방법 (개발자)

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

## 4) 빌드 및 배포

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

## 5) 기술 스택

- 프레임워크: Next.js 16 (App Router), React 19, TypeScript (strict mode)
- 상태관리: Zustand + persist
- 정산 연산: big.js
- 공유 데이터 압축: lz-string
- 공유 데이터 저장: Supabase (PostgreSQL)
- 카카오톡 공유: Kakao JS SDK
- 식별자 생성: nanoid
- 스타일: Tailwind CSS v4
- UI: LinkButton, Modal (useId, X 닫기, dvh 스크롤), Chip (role 분리), StickyBottomBar, Skeleton
- PWA: manifest.json + Service Worker
- 테스트: Vitest (789 tests, 58 files)
- 보안 헤더: vercel.json (CSP, X-Frame-Options, Permissions-Policy 등)

## 6) 아키텍처

Feature-Sliced Design(FSD) 구조를 따릅니다.

```text
src/
├─ app/          # 라우트 엔트리
├─ views/        # 페이지 단위 화면 조합
├─ widgets/      # 복합 UI 블록 (SessionCard, SettlementResult)
├─ features/     # 사용자 액션/비즈니스 기능 (calculate, share, export-import)
├─ entities/     # 도메인 상태 및 모델 (member, session, account, history, preset, theme, transfer-completion)
└─ shared/       # 공용 UI/유틸/타입/상수
    ├─ ui/       # Button, Input, Modal, Card, Chip, Switch, StickyBottomBar, Skeleton 등
    ├─ lib/      # settlement-engine, validators, serializer, constants, toast, hooks 등
    └─ types/    # TypeScript 인터페이스
```

주요 라우트:

- `/` 메인 입력 화면
- `/settlement` 정산 결과
- `/history` 정산 기록
- `/settings` 설정(테마/계좌/초기화)
- `/detail?id=...` 공유 상세 화면 (Supabase), `/detail?d=...` (lz-string 하위 호환)

## 7) 데이터 저장 및 보안 정책

- Zustand persist로 로컬 기기에 데이터 저장
  - 참여자, 세션, 계좌, 프리셋, 히스토리, 송금 완료 상태
- 공유 데이터는 Supabase에 저장, 짧은 ID로 접근 (`/detail?id=xxx`)
- Supabase 저장 전 `validateShareableData()` 검증 수행 (DB 오염 방지)
- 환경변수 미설정 시 Supabase/Kakao 기능이 안전하게 비활성화 (런타임 크래시 방지)
- Service Worker에서 Supabase/Kakao 등 외부 API 응답은 캐싱하지 않음
- 공유 URL에는 계좌 정보 미포함
- 카카오톡 카드의 description에 계좌 정보 표시 (URL에는 미포함)
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

## 8) 테스트 범위

현재 다음 영역에 대한 단위/통합/E2E 테스트가 포함되어 있습니다. (총 789개 테스트, 58개 파일)

- 정산 엔진 (`settlement-engine`, edge cases, settle/calculateBalance 정합성)
- 공유/직렬화 (`text-share` 세션별 내역 포함, `serializer`)
- 스토어 무결성 (`store-integrity`, `history-store`, `preset-store`)
- 세션 복제 동작 (`session-duplication`)
- UI 상태 동기화 (`alcohol-sync`)
- UI 컴포넌트 (`Button`, `Input`, `Card`, `Chip`, `Switch`, `Modal`, `ErrorBoundary`, `FormField`, `AnimatedAmount`, `CheckAnimation`, `ToastContainer`, `StickyBottomBar`, `Skeleton`, `LinkButton`)
- Export/Import (`validate`, `export`, `import`, `ExportImportButtons` — 스키마 검증, 보안 필터링, UI)
- 접근성 (`accessibility` — ARIA 속성, 포커스 트랩, 키보드 네비게이션, label 연결)
- 유효성 검증 (`validators` — 계좌번호, 금액, 멤버명, 주류 수량/단가, 세션 논리 일관성)
- 에러 처리 (`error-handler` — AppError 타입, 사용자 취소 감지, 한국어 메시지)
- 뷰 레이어 통합 테스트
  - `MainPage` — 참여자 CRUD, 프리셋 관리, 세션 관리, 합계/정산 버튼, 계좌 예금주 자동 추가
  - `SettlementPage` — 송금 요약/완료 토글, 계좌 안내 CTA, 히스토리 자동 저장, 술값 정산
  - `SettingsPage` — 테마 전환, 계좌 CRUD/유효성 검증, 전체 초기화, 백업/복원
  - `HistoryPage` — 목록 렌더링, expand/collapse, 삭제 플로우, 포맷터
- 위젯 테스트 (`SessionCard` — 렌더링, 결제자/참여자 토글, 전체 선택/해제, 술값 스위치, 음주자 관리, 빠른 금액 버튼)
- E2E 유저 저니 (`e2e-journey` — 2인 정산, 5인 MT 술값 분리, 프리셋→정산→히스토리, 멤버 삭제 연쇄, 전체 초기화, 직장인 회식, 세션 복제, 엣지 케이스)
- 송금 완료 스토어 (`transfer-completion` — toggle, reset, persist, 키 생성)
- 애니메이션 훅 (`use-reduced-motion`, `use-animated-number`, `use-animate-list` — 모션 감지, rAF 보간, 리스트 추가 감지)
- 토스트 시스템 (`toast-store`, `use-toast`, `ToastContainer` — 추가/제거/자동만료, 접근성, Portal 렌더링)
- 네비게이션 (`view-transition` — 페이지 depth, slide-back, API fallback)
- 공유 상세 페이지 (`DetailPage` — URL 압축 해제, Supabase ID 로딩, 에러 상태, 멤버 매핑)
- 포매터 (`formatters` — 금액 포맷, 날짜 포맷, 로케일 처리)

## 9) 개발 메모

- 계좌 예금주가 참여자 목록에 없으면 메인 화면 진입 시 자동 추가됩니다.
- 정산 페이지 진입 시 결과가 히스토리에 자동 저장됩니다(중복 저장 방지 처리 포함).
- 히스토리는 최대 50개까지 보관됩니다.
- 토스트 알림은 메시지 길이에 따라 자동 Duration이 조절됩니다 (2~5초, 에러 시 +1.5초).
- 모달 상태는 `useModalManager` 훅으로 통합 관리됩니다 (MainPage 6개 모달).

---

문서 개선 제안이나 기능 요구사항은 이슈/PR로 남겨주세요.
