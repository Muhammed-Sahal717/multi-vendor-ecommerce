import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HERO_SLIDES = [
  { id: 1, src: '/hero1.png', alt: 'Marketplace Banner 1' },
  { id: 2, src: '/hero2.png', alt: 'Marketplace Banner 2' },
  { id: 3, src: '/hero3.png', alt: 'Marketplace Banner 3' },
  { id: 4, src: '/hero4.png', alt: 'Marketplace Banner 4' },
  { id: 5, src: '/hero5.png', alt: 'Marketplace Banner 5' },
];

const AUTOPLAY_INTERVAL = 4500;

export const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const totalSlides = HERO_SLIDES.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Autoplay
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(interval);
  }, [goToNext, isHovered]);

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Image Carousel"
    >
      {/* Slides Track */}
      <div
        className="flex w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className="w-full shrink-0 aspect-[2.72/1] relative select-none"
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover select-none pointer-events-none"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={goToPrev}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 cursor-pointer"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} className="stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={goToNext}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 cursor-pointer"
        aria-label="Next slide"
      >
        <ChevronRight size={20} className="stroke-[2.5]" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-border/40">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToSlide(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentIndex === idx
                ? 'w-6 sm:w-7 h-2 bg-primary'
                : 'w-2 h-2 bg-foreground/40 hover:bg-foreground/70'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
