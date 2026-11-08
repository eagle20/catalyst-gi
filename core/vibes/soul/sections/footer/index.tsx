import { clsx } from 'clsx';
import { ReactNode } from 'react';

import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { Logo } from '@/vibes/soul/primitives/logo';
import * as Skeleton from '@/vibes/soul/primitives/skeleton';
import { Link } from '~/components/link';

interface Image {
  src: string;
  alt: string;
}

interface Link {
  href: string;
  label: string;
  target?: string;
}

export interface Section {
  title?: string;
  links: Link[];
}

interface SocialMediaLink {
  href: string;
  icon: ReactNode;
}

interface ContactInformation {
  address?: string;
  phone?: string;
}

// GI: trust badges set in Makeswift
interface TrustBadge {
  src: string;
  alt: string;
  href?: string;
}

export interface FooterProps {
  logo: Streamable<string | Image | null>;
  sections: Streamable<Section[]>;
  copyright?: Streamable<string>;
  contactInformation?: Streamable<ContactInformation>;
  paymentIcons?: Streamable<ReactNode[]>;
  socialMediaLinks?: Streamable<SocialMediaLink[]>;
  trustBadges?: TrustBadge[];
  trustBadgesLabel?: string;
  contactTitle?: string;
  className?: string;
  logoHref?: string;
  logoLabel?: string;
  logoWidth?: number;
  logoHeight?: number;
}

// eslint-disable-next-line valid-jsdoc
/**
 * This component supports various CSS variables for theming. Here's a comprehensive list, along
 * with their default values:
 *
 * ```css
 * :root {
 *   --footer-focus: hsl(var(--primary));
 *   --footer-background: hsl(var(--background));
 *   --footer-border-top: hsl(var(--contrast-100));
 *   --footer-border-bottom: hsl(var(--primary));
 *   --footer-contact-title: hsl(var(--contrast-500));
 *   --footer-contact-text: hsl(var(--foreground));
 *   --footer-social-icon: hsl(var(--contrast-400));
 *   --footer-social-icon-hover: hsl(var(--foreground));
 *   --footer-section-title: hsl(var(--foreground));
 *   --footer-link: hsl(var(--contrast-500));
 *   --footer-link-hover: hsl(var(--foreground));
 *   --footer-copyright: hsl(var(--contrast-500));
 * }
 * ```
 */
export const Footer = ({
  logo,
  sections: streamableSections,
  contactTitle = 'Contact Us',
  contactInformation: streamableContactInformation,
  paymentIcons: streamablePaymentIcons,
  socialMediaLinks: streamableSocialMediaLinks,
  trustBadges,
  trustBadgesLabel,
  copyright: streamableCopyright,
  className,
  logoHref = '#',
  logoLabel = 'Home',
  logoWidth = 200,
  logoHeight = 40,
}: FooterProps) => {
  return (
    <footer
      className={clsx(
        // GI: light grey footer background
        'group/footer border-b-4 border-t border-b-[var(--footer-border-bottom,hsl(var(--primary)))] border-t-[var(--footer-border-top,hsl(var(--contrast-100)))] bg-[#F4F4F5] @container',
        className,
      )}
    >
      <div className="mx-auto max-w-screen-2xl px-4 py-6 @xl:px-6 @xl:py-10 @4xl:px-8 @4xl:py-12">
        <div className="flex flex-col justify-between gap-x-16 gap-y-12 @3xl:flex-row">
          <div className="flex flex-col gap-2 @3xl:w-1/3 @3xl:gap-2">
            {/* Logo Information */}
            <div className="flex items-center justify-start self-stretch">
              <Logo
                className="flex"
                height={logoHeight}
                href={logoHref}
                label={logoLabel}
                logo={logo}
                width={logoWidth}
              />
            </div>

            {/* GI: no contact information block in the footer */}

            {/* Social Media Links */}
            <Stream fallback={<SocialMediaLinksSkeleton />} value={streamableSocialMediaLinks}>
              {(socialMediaLinks) => {
                if (socialMediaLinks != null) {
                  return (
                    <div className="flex items-center gap-3">
                      {socialMediaLinks.map(({ href, icon }, i) => {
                        return (
                          <Link
                            className="flex items-center justify-center rounded-lg fill-[var(--footer-social-icon,hsl(var(--contrast-400)))] p-1 ring-[var(--footer-focus,hsl(var(--primary)))] transition-colors duration-300 ease-out hover:fill-[var(--footer-social-icon-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2"
                            href={href}
                            key={i}
                            target="_blank"
                          >
                            {icon}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
              }}
            </Stream>

            {/* GI: trust badges */}
            {trustBadges && trustBadges.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                {trustBadgesLabel && (
                  <p className="mb-3 font-semibold text-[var(--footer-copyright,hsl(var(--contrast-400)))]">
                    {trustBadgesLabel}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {trustBadges.map(({ src, alt, href }, i) =>
                    href ? (
                      <Link href={href} key={i} target="_blank">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={alt}
                          className="h-14 w-auto object-contain grayscale transition-all duration-300 hover:grayscale-0"
                          src={src}
                        />
                      </Link>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={alt} className="h-14 w-auto object-contain" key={i} src={src} />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Columns of Links */}
          <Stream fallback={<FooterColumnsSkeleton />} value={streamableSections}>
            {(sections) => {
              if (sections.length > 0) {
                return (
                  <div
                    className={clsx(
                      'grid max-w-5xl grid-cols-1 gap-y-8 @sm:grid-cols-2 @xl:gap-y-10 @2xl:grid-cols-3 @6xl:[grid-template-columns:_repeat(auto-fill,_minmax(220px,_1fr))]',
                    )}
                  >
                    {sections.map(({ title, links }, i) => (
                      <div className="pr-8" key={i}>
                        {title != null && (
                          <span className="mb-3 block font-semibold text-[var(--footer-section-title,hsl(var(--foreground)))]">
                            {title}
                          </span>
                        )}

                        <ul>
                          {links.map((link, idx) => {
                            return (
                              <li key={idx}>
                                <Link
                                  className="block rounded-lg py-2 text-sm font-medium text-[var(--footer-link,hsl(var(--contrast-500)))] ring-[var(--footer-focus,hsl(var(--primary)))] transition-colors duration-300 hover:text-[var(--footer-link-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2"
                                  href={link.href}
                                  rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                  target={link.target}
                                >
                                  {link.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              }
            }}
          </Stream>
        </div>

        {/* GI: footer bottom with centred copyright and payment icons underneath */}
        <div className="mt-12 border-t border-[var(--footer-border-top,hsl(var(--contrast-100)))] pt-6 text-center">
          <Stream fallback={<CopyrightSkeleton />} value={streamableCopyright}>
            {(copyright) => {
              if (copyright != null) {
                return (
                  <p className="text-sm text-[var(--footer-copyright,hsl(var(--contrast-400)))]">
                    {copyright}
                  </p>
                );
              }
            }}
          </Stream>
          <Stream fallback={null} value={streamablePaymentIcons}>
            {(paymentIcons) => {
              if (paymentIcons != null && paymentIcons.length > 0) {
                return (
                  <div className="mt-4 flex items-center justify-center gap-3">{paymentIcons}</div>
                );
              }
            }}
          </Stream>
        </div>

      </div>
    </footer>
  );
};

function FooterContactSkeleton() {
  return (
    <Skeleton.Root
      className="mb-4 text-lg group-has-[[data-pending]]/footer:animate-pulse @lg:text-xl"
      pending
    >
      <Skeleton.Text characterCount={10} className="rounded" data-pending />
      <Skeleton.Text characterCount={15} className="rounded" data-pending />
      <Skeleton.Text characterCount={12} className="rounded" data-pending />
    </Skeleton.Root>
  );
}

function SocialMediaLinksSkeleton() {
  return (
    <Skeleton.Root className="group-has-[[data-pending]]/footer:animate-pulse" pending>
      <div className="flex items-center gap-3" data-pending>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton.Box className="h-8 w-8 rounded-full" key={idx} />
        ))}
      </div>
    </Skeleton.Root>
  );
}

function FooterColumnsSkeleton() {
  return (
    <Skeleton.Root
      className="grid max-w-5xl grid-cols-1 gap-y-8 @container-normal group-has-[[data-pending]]/footer:animate-pulse @sm:grid-cols-2 @xl:gap-y-10 @2xl:grid-cols-3 @6xl:[grid-template-columns:_repeat(auto-fill,_minmax(220px,_1fr))]"
      pending
    >
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="pr-8" data-pending key={idx}>
          <div className="mb-3 flex items-center">
            <Skeleton.Text characterCount={10} className="rounded" />
          </div>
          <FooterColumnSkeleton />
        </div>
      ))}
    </Skeleton.Root>
  );
}

function FooterColumnSkeleton() {
  return (
    <ul>
      {Array.from({ length: 4 }).map((_, idx) => (
        <li className="py-2 text-sm" key={idx}>
          <Skeleton.Text characterCount={10} className="rounded" />
        </li>
      ))}
    </ul>
  );
}

function CopyrightSkeleton() {
  return (
    <Skeleton.Root
      className="flex-1 text-sm @container-normal group-has-[[data-pending]]/footer:animate-pulse"
      pending
    >
      <Skeleton.Text characterCount={40} className="rounded" data-pending />
    </Skeleton.Root>
  );
}

function PaymentIconsSkeleton() {
  return (
    <Skeleton.Root
      className="flex flex-wrap gap-2 @container-normal group-has-[[data-pending]]/footer:animate-pulse"
      pending
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton.Box className="h-6 w-[2.1875rem] rounded" data-pending key={idx} />
      ))}
    </Skeleton.Root>
  );
}
