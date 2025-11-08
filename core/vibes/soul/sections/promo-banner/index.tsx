import { clsx } from 'clsx';
import { Link } from '~/components/link';
import { Button } from '@/vibes/soul/primitives/button';

interface PromoBannerProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: 'light' | 'dark';
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function PromoBanner({
  title,
  description,
  ctaLabel,
  ctaHref,
  backgroundImage,
  backgroundColor = 'bg-primary',
  textColor = 'light',
  className,
  size = 'medium',
}: PromoBannerProps) {
  const sizeClasses = {
    small: 'py-8 @xl:py-12',
    medium: 'py-12 @xl:py-16 @4xl:py-20',
    large: 'py-16 @xl:py-24 @4xl:py-32',
  };

  const textColorClasses = {
    light: 'text-background',
    dark: 'text-foreground',
  };

  return (
    <section className={clsx('@container', className)}>
      <div
        className={clsx(
          'relative overflow-hidden',
          backgroundColor,
          sizeClasses[size],
          textColorClasses[textColor],
        )}
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Overlay for better text readability */}
        {backgroundImage && (
          <div className="absolute inset-0 bg-foreground/40" aria-hidden="true" />
        )}

        <div className="relative mx-auto max-w-screen-2xl px-4 text-center @xl:px-6 @4xl:px-8">
          <h2
            className={clsx(
              'mb-4 font-heading font-bold',
              size === 'large'
                ? 'text-4xl @xl:text-5xl @4xl:text-6xl'
                : size === 'medium'
                  ? 'text-3xl @xl:text-4xl @4xl:text-5xl'
                  : 'text-2xl @xl:text-3xl',
            )}
          >
            {title}
          </h2>

          {description && (
            <p
              className={clsx(
                'mx-auto mb-6 max-w-2xl',
                size === 'large' ? 'text-xl @xl:text-2xl' : 'text-lg @xl:text-xl',
                textColor === 'light' ? 'text-background/90' : 'text-foreground/80',
              )}
            >
              {description}
            </p>
          )}

          {ctaLabel && ctaHref && (
            <Button
              asChild
              size={size === 'large' ? 'large' : 'medium'}
              variant={textColor === 'light' ? 'secondary' : 'primary'}
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
