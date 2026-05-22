# App Store 출시 체크리스트

## 1. 사전 준비

- [ ] Apple Developer Program ($99/년)
- [ ] 앱 아이콘 1024×1024 PNG (`public/icon-512.png` 확대)
- [ ] 스크린샷 6.7", 6.5" (탈출 D-Day / 배당 / 비밀방)
- [ ] 개인정보처리방침 URL (Notion/GitHub Pages)
- [ ] Supabase 프로덕션 URL·Redirect 설정

## 2. iOS 빌드 (Capacitor)

```bash
npm install
npm run build
npx cap add ios          # 최초 1회
npm run cap:sync
npm run cap:open         # Xcode 실행
```

Xcode에서:

1. **Signing & Capabilities** → Team 선택
2. **Bundle Identifier** → `com.firefighter.app` (고유값으로 변경 권장)
3. Product → **Archive** → App Store Connect 업로드

## 3. Supabase 프로덕션

**Authentication → URL Configuration**

- Site URL: `https://your-domain.com` 또는 `capacitor://localhost`
- Redirect URLs: 앱 스킴 + 웹 도메인

**Google OAuth**: 프로덕션 Redirect URI 추가

## 4. App Store Connect 메타데이터 (초안)

- **이름**: FIREFIGHTER - 파이어족 탈출
- **부제**: 은퇴 D-Day · 배당 캘린더 · 자산 인증 커뮤니티
- **키워드**: 파이어, FIRE, 배당, 은퇴, 재테크, ETF
- **카테고리**: 금융
- **연령**: 4+

## 5. 심사 시 유의

- 금융 앱이지만 **투자 권유/종목 추천 없음** → 시뮬레이터·기록 도구로 설명
- 커뮤니티 **UGC** → 신고/삭제 기능 추후 추가 권장
- 로그인: Google + 이메일 OTP

## 6. 출시 후 1인 운영

- Supabase Free tier 모니터링
- 배당 데이터: `dividend_events` 분기별 수동 seed 또는 cron
- 버그픽스: Sentry (선택) 무료 티어
