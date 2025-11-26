import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: string;
  imageUrl: string;
  fileName: string;
  bucket: string;
  position: number;
}

interface HeroBannerData {
  slides: HeroSlide[];
}

export function Hero() {
  const { data: banner, isLoading } = useQuery<HeroBannerData | null>({
    queryKey: ["/api/hero-banner"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading) {
    return <Skeleton className="h-[70vh] md:h-[70vh] min-h-[500px] w-full" />;
  }

  const slides = banner?.slides || [];
  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];
  const totalSlides = slides.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  return (
    <section className="relative h-[70vh] md:h-[70vh] min-h-[500px] overflow-hidden" data-testid="section-hero">
      {/* Hero Image */}
      <div className="absolute inset-0">
        <img
          src={currentSlide.imageUrl}
          alt="LUSERY Collection"
          className="h-full w-full object-cover transition-opacity duration-500"
        />
      </div>

      {/* Navigation Controls */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
            data-testid="button-hero-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
            data-testid="button-hero-next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/40 text-white text-sm backdrop-blur-sm" data-testid="text-hero-counter">
            {currentIndex + 1} / {totalSlides}
          </div>
        </>
      )}
    </section>
  );
}
