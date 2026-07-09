// oz-next-app/src/components/ui/carousel.tsx
"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];
type CarouselOrientation = "horizontal" | "vertical";

type CarouselProps = Readonly<{
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: CarouselOrientation;
  setApi?: (api: CarouselApi) => void;
}>;

type CarouselContextProps = Readonly<{
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  orientation: CarouselOrientation;
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  setApi?: (api: CarouselApi) => void;
}>;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel(): CarouselContextProps {
  const context = React.useContext(CarouselContext);

  if (context === null) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps): React.ReactElement {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback(
    (emblaApi: NonNullable<CarouselApi>): void => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    },
    [],
  );

  const scrollPrev = React.useCallback((): void => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback((): void => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      const previousKey =
        orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

      if (event.key === previousKey) {
        event.preventDefault();
        scrollPrev();
        return;
      }

      if (event.key === nextKey) {
        event.preventDefault();
        scrollNext();
      }
    },
    [orientation, scrollNext, scrollPrev],
  );

  React.useEffect(() => {
    if (setApi === undefined) {
      return;
    }

    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (api === undefined) {
      return undefined;
    }

    let active = true;
    queueMicrotask(() => {
      if (active) {
        onSelect(api);
      }
    });
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      active = false;
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  const contextValue = React.useMemo<CarouselContextProps>(
    () => ({
      carouselRef,
      api,
      orientation,
      scrollPrev,
      scrollNext,
      canScrollPrev,
      canScrollNext,
      ...(opts !== undefined ? { opts } : {}),
      ...(plugins !== undefined ? { plugins } : {}),
      ...(setApi !== undefined ? { setApi } : {}),
    }),
    [
      api,
      canScrollNext,
      canScrollPrev,
      carouselRef,
      opts,
      orientation,
      plugins,
      scrollNext,
      scrollPrev,
      setApi,
    ],
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        scrollPrev();
      }
    },
    [onClick, scrollPrev],
  );

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      disabled={!canScrollPrev}
      onClick={handleClick}
      {...props}
    >
      <ChevronLeftIcon aria-hidden="true" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        scrollNext();
      }
    },
    [onClick, scrollNext],
  );

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      disabled={!canScrollNext}
      onClick={handleClick}
      {...props}
    >
      <ChevronRightIcon aria-hidden="true" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};
