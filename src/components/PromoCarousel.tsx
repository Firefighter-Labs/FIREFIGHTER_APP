import { useCallback, useEffect, useState } from 'react';
import type { PromoSlide } from '../hooks/usePromoSlides';

export type { PromoSlide };

const AUTO_MS = 6000;

function SlideContent({ slide }: { slide: PromoSlide }) {
  return (
    <>
      <div className="promo-banner__text">
        <p className="promo-banner__tag">{slide.tag}</p>
        <p className="promo-banner__title">{slide.title}</p>
        <p className="promo-banner__sub">{slide.sub}</p>
      </div>
      {slide.imageUrl && (
        <div className="promo-banner__right" aria-hidden>
          <img className="promo-banner__img" src={slide.imageUrl} alt="" loading="lazy" />
        </div>
      )}
    </>
  );
}

interface PromoCarouselProps {
  slides: PromoSlide[];
}

export function PromoCarousel({ slides }: PromoCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (count <= 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => go(index + 1), AUTO_MS);
    return () => window.clearInterval(timer);
  }, [count, go, index]);

  if (count === 0) return null;

  return (
    <div className="promo-carousel">
      <div className="promo-carousel__viewport">
        <div
          className="promo-carousel__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => (
            <div key={s.id} className="promo-carousel__slide">
              {s.href ? (
                <a
                  className="promo-banner"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.ariaLabel}
                >
                  <SlideContent slide={s} />
                </a>
              ) : (
                <button
                  type="button"
                  className="promo-banner promo-banner--btn"
                  aria-label={s.ariaLabel}
                  onClick={s.onClick}
                >
                  <SlideContent slide={s} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="promo-dots" role="tablist" aria-label="프로모션 배너">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${i + 1}번째: ${s.tag}`}
            className={i === index ? 'active' : ''}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
