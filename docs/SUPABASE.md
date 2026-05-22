# Supabase 연동 가이드

## 아키텍처 요약

| 영역 | 저장소 | 시점 |
|------|--------|------|
| 은퇴 시뮬레이터·보유 종목 | `localStorage` (Zustand) | 지금 (MVP) |
| 커뮤니티 피드·단톡 | Supabase Postgres + Realtime | 커뮤니티 오픈 전 |
| 배당 일정 메타 | Supabase `dividend_events` (+ 로컬 fallback) | 운영 중 점진 이전 |

`.env` 없으면 앱은 **자동으로 로컬 모드**로 동작합니다.

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → New Project (Free tier)
2. **Authentication → Providers**
   - **Email** 활성화 (Confirm email은 개발 중 OFF 가능)
   - **Google** 활성화 (Client ID/Secret 설정)
   - **Anonymous sign-ins** → **비활성화** (실제 계정 구분용)
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
4. **Project Settings → API** 에서 URL, `anon` key 복사

## 2. 스키마 적용

Dashboard → **SQL Editor** → 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_real_auth_profiles.sql` ← **실제 로그인용 (필수)**
3. `supabase/migrations/003_profiles_insert_policy.sql` ← **profiles 406 오류 방지**
4. `supabase/migrations/004_posts_delete.sql` ← **본인 글 삭제**
5. `supabase/seed.sql`

또는 CLI:

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

## 3. 환경 변수

프로젝트 루트에 `.env` 생성 (`.env.example` 참고):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

```bash
npm run dev
```

**로그인 화면 위치**: 하단 탭 **「비밀 방」** (커뮤니티). 다른 탭에서는 상단 **「로그인 · 커뮤니티 입장」** 버튼으로 이동.

커뮤니티 탭에서 **이메일/Google 로그인** 후 상단에 **☁️ (표시명)** 이 보이면 성공입니다.

### profiles 406 오류

로그인은 됐는데 `profiles` 406이 반복되면 → SQL Editor에서 `003_profiles_insert_policy.sql` 실행 후 새로고침. (프로필 행이 없을 때 `.single()` 실패)

## 4. 테이블 설계

```
profiles          ← auth.users 1:1, 익명 라벨만
posts             ← 피드 (badge_tier·비율 스냅샷, 자산 금액 미저장)
post_likes        ← 중복 좋아요 방지 + likes_count 트리거
chat_messages     ← Realtime 단톡
stocks            ← 종목 마스터
dividend_events   ← 배당락/지급일 (연도별)
```

## 5. 비용·보안

- **Free tier**: Auth + DB + Realtime 소규모 MAU에 충분
- RLS로 본인 글쓰기·좋아요만 허용, **총 자산 원화 금액은 서버에 안 올림** (뱃지·비율만 스냅샷)
- 배당 데이터는 Admin만 insert (현재 seed + 추후 Edge Function/cron)

## 6. 다음 단계 (선택)

- [ ] `user_portfolios` — 기기 간 동기화 원할 때 (암호화 필드 고려)
- [ ] 배당 API cron → `dividend_events` upsert
- [ ] Capacitor + Supabase Auth 딥링크 (앱스토어)
