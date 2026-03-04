'use client';

import { clsx } from 'clsx';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Image } from '~/components/image';

type MediaItem =
  | { type: 'image'; src: string; alt: string }
  | { type: 'video'; url: string; title: string };

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }

    if (parsed.hostname.includes('youtube.com')) {
      // Handle /watch?v=ID
      const v = parsed.searchParams.get('v');

      if (v) return v;

      // Handle /embed/ID
      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);

      if (embedMatch) return embedMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

interface Props {
  images: Array<{ alt: string; src: string }>;
  videos?: Array<{ title: string; url: string }>;
  className?: string;
  thumbnailLabel?: string;
  productName: string;
}

export function ProductGallery({
  images,
  videos = [],
  className,
  thumbnailLabel = 'View image number',
  productName,
}: Props) {
  const [previewImage, setPreviewImage] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = images.map((img) => ({
      type: 'image' as const,
      src: img.src,
      alt: img.alt,
    }));

    for (const video of videos) {
      if (getYouTubeVideoId(video.url)) {
        items.push({ type: 'video' as const, url: video.url, title: video.title });
      }
    }

    return items;
  }, [images, videos]);

  const activeItem = mediaItems[previewImage];
  const isVideoActive = activeItem?.type === 'video';

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setPreviewImage(emblaApi.selectedScrollSnap());
      setPlayingVideoIndex(null);
    };

    emblaApi.on('select', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const selectImage = (index: number) => {
    setPreviewImage(index);
    setPlayingVideoIndex(null);
    if (emblaApi) emblaApi.scrollTo(index);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMousePosition({ x, y });
  }, []);

  return (
    <div className={clsx('sticky top-4 flex flex-col gap-2 @2xl:flex-row', className)}>
      <div
        className="w-full overflow-hidden rounded-xl @xl:rounded-2xl @2xl:order-2"
        ref={emblaRef}
      >
        <div className="flex">
          {mediaItems.map((item, idx) => {
            if (item.type === 'video') {
              const videoId = getYouTubeVideoId(item.url);
              const isPlaying = playingVideoIndex === idx;

              return (
                <div
                  aria-label={item.title || `${productName} video`}
                  className="relative aspect-square w-full shrink-0 grow-0 basis-full bg-black"
                  key={idx}
                >
                  {isPlaying ? (
                    <iframe
                      allow="accelerometer; autoplay; encrypted-media; gyroscope"
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`}
                      title={item.title || `${productName} video`}
                    />
                  ) : (
                    <button
                      className="group absolute inset-0 flex cursor-pointer items-center justify-center"
                      onClick={() => setPlayingVideoIndex(idx)}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={item.title || `${productName} video`}
                        className="absolute inset-0 h-full w-full object-contain"
                        src={`https://img.youtube.com/vi/${videoId}/sddefault.jpg`}
                      />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black/70 transition-transform group-hover:scale-110">
                        <svg
                          className="ml-1 h-8 w-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                aria-label={`${item.alt || `${productName} image ${idx + 1}`} - Hover to zoom`}
                className="relative aspect-square w-full shrink-0 grow-0 basis-full cursor-zoom-in"
                key={idx}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                ref={idx === previewImage ? imageContainerRef : null}
                role="img"
              >
                <Image
                  alt={item.alt || `${productName} image ${idx + 1}`}
                  className={clsx(
                    'object-contain transition-transform duration-200',
                    isZoomed && idx === previewImage && !isVideoActive ? 'scale-150' : 'scale-100',
                  )}
                  fill
                  priority={idx === 0}
                  sizes="(min-width: 42rem) 50vw, 100vw"
                  src={item.src}
                  style={
                    isZoomed && idx === previewImage && !isVideoActive
                      ? {
                          transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex max-w-full shrink-0 flex-row gap-2 overflow-x-auto @2xl:order-1 @2xl:flex-col">
        {mediaItems.map((item, index) => {
          if (item.type === 'video') {
            const videoId = getYouTubeVideoId(item.url);

            return (
              <button
                aria-label={`View video: ${item.title || `${productName} video`}`}
                className={clsx(
                  'relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition-all duration-300 hover:opacity-100 @md:h-16 @md:w-16',
                  index === previewImage
                    ? 'border-foreground opacity-100'
                    : 'border-transparent opacity-50',
                )}
                key={index}
                onClick={() => selectImage(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.title || `${productName} video`}
                  className="absolute inset-0 h-full w-full bg-contrast-100 object-cover"
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                    <svg
                      className="ml-0.5 h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          }

          return (
            <button
              aria-label={`${thumbnailLabel} ${index + 1}`}
              className={clsx(
                'relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition-all duration-300 hover:opacity-100 @md:h-16 @md:w-16',
                index === previewImage
                  ? 'border-foreground opacity-100'
                  : 'border-transparent opacity-50',
              )}
              key={index}
              onClick={() => selectImage(index)}
            >
              <Image
                alt={item.alt || `${productName} image ${index + 1}`}
                className="bg-contrast-100 object-contain"
                fill
                priority={index === 0}
                sizes="(min-width: 28rem) 4rem, 3rem"
                src={item.src}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
