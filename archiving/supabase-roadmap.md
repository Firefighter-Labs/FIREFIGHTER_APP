# FIREFIGHTER 데이터 로드맵

## Phase 1 — 지금 (MVP)

- 은퇴 시뮬레이터·보유 종목: **localStorage**
- 커뮤니티·채팅: **localStorage** (시드 데이터 포함)
- 배당 일정: **앱 내장 catalog**

→ DB 비용 0원, 디자인·UX 검증

## Phase 2 — 커뮤니티 오픈 전

- Supabase **Anonymous Auth**
- `posts`, `post_likes`, `chat_messages`, `profiles`
- Realtime 구독

→ `.env` 설정 시 자동 전환 (`docs/SUPABASE.md`)

## Phase 3 — 배당·동기화

- `stocks`, `dividend_events` (seed.sql)
- 외부 API/cron으로 배당 메타 갱신
- (선택) `user_portfolios` — 기기 간 동기화

## 원칙

- **총 자산 원화 금액은 서버에 저장하지 않음** (뱃지·비율 스냅샷만)
- `.env` 없으면 로컬, 있으면 클라우드 — 코드 분기 최소화
