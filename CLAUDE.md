# 끼니끼리 (GGINI GGIRI)

## Project Overview
다회차(N차) 모임의 복잡한 가변 인원 정산을 자동화하는 PWA.
주류 미음용자 등 특정 항목 제외를 통한 정산의 정당성 확보.

## Tech Stack
- **Framework**: Next.js 16+ (App Router), TypeScript (Strict Mode)
- **Architecture**: Feature-Sliced Design (FSD)
- **PWA**: manifest.json + Service Worker (Cache First)
- **State**: Zustand + persist (localStorage)
- **Styling**: Tailwind CSS v4
- **Utilities**: big.js (정밀 연산), lz-string (URL 압축), nanoid (ID 생성)
- **Share**: Kakao JS SDK (카카오톡 공유), Supabase (공유 데이터 저장)

## Core Data Schema
```typescript
interface Member { id: string; name: string; }
interface AlcoholDetail { unitPrice: number; quantity: number; drinkerIds: string[]; }
interface Session { id: string; title: string; totalAmount: number; payerId: string; participantIds: string[]; alcohol?: AlcoholDetail; }
interface UserAccount { bankName: string; accountNumber: string; ownerName: string; }
```

## FSD Architecture
```
src/
├── app/           # Next.js App Router (pages, layouts)
├── views/         # Page-level compositions (MainPage, SettlementPage, etc.)
├── widgets/       # Complex UI blocks (SessionCard, SettlementResult)
├── features/      # User interactions (add-session, toggle-participant, calculate, share)
├── entities/      # Business entities (member, session, account, history, preset, theme, transfer-completion)
├── shared/        # Reusable: ui/, lib/, types/
```

## Product Principles
1. **Logical Fairness**: 모든 금액은 데이터 기반 산출, 수신자 납득 가능한 근거 제공
2. **Zero-Friction UX**: 최소 터치(Binary Toggle)로 모든 입력 완료
3. **Security by Design**: 계좌 정보는 공유 URL 미포함, 카카오 카드/텍스트 메시지에만 표시
4. **Local-First**: localStorage 로컬 저장, Supabase는 공유 링크 생성 목적으로만 사용

## Settlement Algorithm
- 세션 단가 = (총액 - 술값) / 참여인원
- 술값 = 단가 × 수량 → 음주자에게만 균등 배분
- 10원 단위 절사(Floor), 차액은 Payer 잔액에서 가감 → 합계 0 유지
- big.js로 정밀 연산 수행

## Conventions
- 한국어 커밋 메시지 가능
- FSD 레이어 의존성: app → pages → widgets → features → entities → shared (상위→하위만 참조)
- barrel export (index.ts) 사용
