# 끼니끼리 (GGINI GGIRI)

다회차(N차) 모임에서 인원과 조건이 계속 바뀌어도 공정하게 정산할 수 있도록 돕는 하이브리드 앱입니다.  
웹(Next.js) 기반으로 동작하며, Capacitor를 통해 iOS/Android 앱으로 패키징할 수 있습니다.

## 1) 사용자 관점: 이 앱으로 할 수 있는 것

- 참여자 추가/삭제 및 그룹(프리셋) 저장/불러오기
- N차별로 결제자, 참여자, 금액 입력
- 술값 별도 정산(주류 단가/수량/음주자 지정)
- 자동 정산 결과 확인(개인별 부담 + 송금 요약)
- 계좌 정보 저장 후 원클릭 복사
- 정산 결과 공유
  - 카카오톡 공유(앱 플러그인 사용)
  - 텍스트 공유/클립보드 복사 (세션별 내역 + 개인별 부담액 + 송금 요약 포함)
- 정산 기록 자동 저장 및 기록 상세 조회
- 공유 링크(`detail`)로 정산 상세 확인

## 2) 핵심 정산 규칙

- 세션 기본 부담액: `(총액 - 술값) / 참여인원`
- 술값 부담액: `(주류 단가 x 수량) / 음주자 수`
- 각 개인 부담액은 100원 단위 절사(`floor`)
- 절사로 생긴 차액은 해당 세션 결제자에게 보정 (`adjustRemainder`)
- 정산 상세(`settle()`)와 송금 계산(`calculateBalance()`)이 동일한 절사·보정 로직을 공유하여 금액 정합성 보장
- 전체 합계(받을 돈/보낼 돈) 일치 보장
- 송금 경로는 Greedy 방식으로 최소 동선에 가깝게 최적화

정밀 연산은 `big.js`를 사용해 부동소수점 오차를 줄입니다.

## 3) 실행 방법 (개발자)

### 요구사항

- Node.js: `22.14.0` (`.tool-versions` 기준)
- npm
- (모바일 빌드 시) Java 21, Android Studio, Xcode

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

## 4) 빌드 및 배포

### 웹 빌드

```bash
npm run build
```

이 프로젝트는 `next.config.ts`에서 `output: "export"`를 사용하므로, 정적 산출물이 `out/`에 생성됩니다.

### 프로덕션 서버 실행(Next 서버 모드)

```bash
npm run start
```

## 5) 모바일 앱 패키징 (Capacitor)

Capacitor 설정(`capacitor.config.ts`)에서 `webDir: "out"`을 사용합니다.  
따라서 아래 순서로 진행합니다.

1. 웹 정적 빌드 생성
2. Capacitor 플랫폼 동기화
3. 네이티브 IDE에서 실행/아카이브

```bash
npm run build
npx cap sync
```

플랫폼 열기:

```bash
npx cap open android
npx cap open ios
```

## 6) 기술 스택

- 프레임워크: Next.js 16 (App Router), React 19, TypeScript
- 상태관리: Zustand + persist
- 정산 연산: big.js
- 공유 데이터 압축: lz-string
- 식별자 생성: nanoid
- 스타일: Tailwind CSS v4
- 모바일 브릿지: Capacitor (iOS/Android)
- 테스트: Vitest

## 7) 아키텍처

Feature-Sliced Design(FSD) 구조를 따릅니다.

```text
src/
├─ app/          # 라우트 엔트리
├─ views/        # 페이지 단위 화면 조합
├─ widgets/      # 복합 UI 블록
├─ features/     # 사용자 액션/비즈니스 기능
├─ entities/     # 도메인 상태 및 모델
└─ shared/       # 공용 UI/유틸/타입
```

주요 라우트:

- `/` 메인 입력 화면
- `/settlement` 정산 결과
- `/history` 정산 기록
- `/settings` 설정(계좌/초기화)
- `/detail?d=...` 공유 상세 화면

## 8) 데이터 저장 및 보안 정책

- Zustand persist로 로컬 기기에 데이터 저장
  - 참여자, 세션, 계좌, 프리셋, 히스토리
- 공유 URL에는 계좌 정보 미포함
- 공유 링크 복원 시 구조/타입 검증 수행
- 복원 데이터에 계좌 정보 필드가 포함되면 차단
- 문자열 sanitize로 기본적인 인젝션 위험 완화

## 9) 테스트 범위

현재 다음 영역에 대한 단위 테스트가 포함되어 있습니다.

- 정산 엔진 (`settlement-engine`, edge cases, settle/calculateBalance 정합성)
- 공유/직렬화 (`text-share` 세션별 내역 포함, `serializer`)
- 스토어 무결성 (`store-integrity`, `history-store`, `preset-store`)
- 세션 복제 동작 (`session-duplication`)
- UI 상태 동기화 (`alcohol-sync`)

## 10) 개발 메모

- 계좌 예금주가 참여자 목록에 없으면 메인 화면 진입 시 자동 추가됩니다.
- 정산 페이지 진입 시 결과가 히스토리에 자동 저장됩니다(중복 저장 방지 처리 포함).
- 히스토리는 최대 50개까지 보관됩니다.

---

문서 개선 제안이나 기능 요구사항은 이슈/PR로 남겨주세요.
