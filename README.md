# FIREFIGHTER

파이어족(FIRE)을 위한 은퇴 시뮬레이터 · 배당 캘린더 · 익명 자산 커뮤니티 통합 대시보드.

## 기능

- **탈출 D-Day**: 4% 법칙 카운트다운, 절약 시뮬레이션, FIRE 달성 축하
- **통합 대시보드**: 등급·FIRE%·월 배당 한눈에 (탭 간 실시간 연동)
- **배당 캘린더**: 생활비 커버 바, 연간 예상, 날짜별 상세
- **비밀 방**: 이메일/Google 로그인, 포트폴리오 인증 피드, 실시간 단톡
- **설정**: JSON 백업/복원, 표시명, 앱스토어 출시 가이드

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 (모바일 뷰 권장).

## 기술 스택

- React 19 + Vite + TypeScript
- Zustand (탭 간 실시간 상태 연동, localStorage 영속화)
- **Supabase** (선택): 익명 Auth + Postgres + Realtime — `docs/SUPABASE.md` 참고

## 데이터 모드

| `.env` 설정 | 동작 |
|-------------|------|
| 없음 | 로컬 MVP (localStorage) |
| `VITE_SUPABASE_*` 있음 | 커뮤니티·배당 메타 클라우드 연동 |

## 앱스토어 / PWA

```bash
npm run build
npm run cap:sync   # iOS (Capacitor)
```

자세한 출시 절차: [docs/APP_STORE.md](docs/APP_STORE.md) · Supabase: [docs/SUPABASE.md](docs/SUPABASE.md)

**Supabase SQL** (순서): `001` → `002` → `003` → `004` → `seed.sql`
