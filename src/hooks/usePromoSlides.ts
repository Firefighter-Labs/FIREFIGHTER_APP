import { useMemo } from 'react';
import { useCoverage } from './useCoverage';
import { useAppStore } from '../store/useAppStore';
import { buildYearMonthlyTotals, sumYearTotal } from '../utils/dividendSeries';
import { formatWon } from '../utils/format';

export type PromoSlide = {
  id: string;
  tag: string;
  title: string;
  sub: string;
  imageUrl?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
};

export const BLOG_URL = 'https://kimmusk.tistory.com';
export const BLOG_IMG_URL =
  'https://tistory1.daumcdn.net/tistory/8702424/attach/c79b5d34b0a541899ab03160e2fcaba8';

export function usePromoSlides(): PromoSlide[] {
  const setTab = useAppStore((s) => s.setTab);
  const setHomeView = useAppStore((s) => s.setHomeView);
  const holdings = useAppStore((s) => s.holdings);
  const c = useCoverage();

  const yearDividendTotal = useMemo(() => {
    const monthly = buildYearMonthlyTotals(holdings, c.usdKrw);
    return sumYearTotal(monthly);
  }, [holdings, c.usdKrw]);

  return useMemo(() => {
    const coveragePct = Math.round(c.coveragePct);
    const hasCoverage = coveragePct > 0;
    const hasDividend = yearDividendTotal > 0;

    return [
      {
        id: 'blog',
        tag: '실패작 소년',
        title: '실패작에서 성공작으로 가는 과정',
        sub: '천천히 가도, 무너지지 않는 방향',
        imageUrl: BLOG_IMG_URL,
        href: BLOG_URL,
        ariaLabel: '실패작 소년 블로그로 이동',
      },
      {
        id: 'coverage',
        tag: '오늘의 FIRE',
        title: hasCoverage
          ? `생활비의 ${coveragePct}%를 배당이 커버해요`
          : '커버율, 지금부터 채워보세요',
        sub: hasCoverage
          ? '목표 생활비는 설정에서 바꿀 수 있어요'
          : '설정에서 월 생활비 목표를 먼저 정해보세요',
        onClick: () => setTab('settings'),
        ariaLabel: '설정에서 생활비·커버율 목표 관리',
      },
      {
        id: 'dividend',
        tag: '배당 현황',
        title: hasDividend
          ? `올해 예상 배당 ${formatWon(yearDividendTotal)}`
          : '월별 배당, 한눈에 보기',
        sub: hasDividend
          ? '홈에서 월별 배당 차트를 확인하세요'
          : '종목을 등록하면 12개월 예상이 채워져요',
        onClick: () => {
          setTab('home');
          setHomeView('dividend');
        },
        ariaLabel: '홈 배당 현황 차트 보기',
      },
      {
        id: 'portfolio',
        tag: '시작하기',
        title: '종목 하나만 등록해보세요',
        sub: '티커 검색 시 배당·시세가 자동으로 채워집니다',
        onClick: () => setTab('portfolio'),
        ariaLabel: '포트폴리오에서 종목 추가',
      },
    ];
  }, [c.coveragePct, yearDividendTotal, setTab, setHomeView]);
}
