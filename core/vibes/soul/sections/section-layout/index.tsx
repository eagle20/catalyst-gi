import { clsx } from 'clsx';
import { ReactNode } from 'react';

export interface SectionLayoutProps {
  className?: string;
  children: ReactNode;
  containerSize?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  // GI: per-breakpoint padding set in Makeswift (see lib/makeswift/components/section). Sections
  // that don't pass these get no vertical padding, as before the upgrade.
  paddingOptionsLargeDesktop?: string;
  paddingOptionsDesktop?: string;
  paddingOptionsTablet?: string;
  paddingOptionsMobile?: string;
  hideOverflow?: boolean;
}

// eslint-disable-next-line valid-jsdoc
/**
 * This component supports various CSS variables for theming. Here's a comprehensive list, along
 * with their default values:
 *
 * ```css
 * :root {
 *   --section-max-width-medium: 768px;
 *   --section-max-width-lg: 1024px;
 *   --section-max-width-xl: 1280px;
 *   --section-max-width-2xl: 1536px;
 * }
 * ```
 */
export function SectionLayout({
  className,
  children,
  containerSize = '2xl',
  paddingOptionsLargeDesktop,
  paddingOptionsDesktop,
  paddingOptionsTablet,
  paddingOptionsMobile,
  hideOverflow = false,
}: SectionLayoutProps) {
  return (
    <section className={clsx('@container', hideOverflow && 'overflow-x-clip', className)}>
      <div
        className={clsx(
          'mx-auto px-4 @xl:px-6 @4xl:px-8',
          paddingOptionsMobile && `py-${paddingOptionsMobile}`,
          paddingOptionsTablet && `@md:py-${paddingOptionsTablet}`,
          paddingOptionsDesktop && `@xl:py-${paddingOptionsDesktop}`,
          paddingOptionsLargeDesktop && `@4xl:py-${paddingOptionsLargeDesktop}`,
          {
            md: 'max-w-[var(--section-max-width-md,768px)]',
            lg: 'max-w-[var(--section-max-width-lg,1024px)]',
            xl: 'max-w-[var(--section-max-width-xl,1280px)]',
            '2xl': 'max-w-[var(--section-max-width-2xl,1536px)]',
            full: 'max-w-none',
          }[containerSize],
        )}
      >
        {children}
      </div>
    </section>
  );
}
