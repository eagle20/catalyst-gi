import { Checkbox, Group, Image, Link, List, Number, Style, TextInput } from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';
import './logo-carousel.css';

interface LogoInterface {
  imageSrc?: string;
  imageAlt?: string;
  link?: { href?: string; target?: string };
}

type MSLogoCarouselProps = {
  itemsPerRowSuperDesktop: number;
  itemsPerRowDesktop: number;
  itemsPerRowTablet: number;
  itemsPerRowMobile: number;
  className: string;
  logos: LogoInterface[];
  infinite?: boolean;
  playSpeed: number;
};

runtime.registerComponent(
  function MSLogoCarousel({
    itemsPerRowSuperDesktop,
    itemsPerRowDesktop,
    itemsPerRowTablet,
    itemsPerRowMobile,
    logos,
    infinite = true,
    playSpeed,
    className,
  }: MSLogoCarouselProps) {
    if (!logos || logos.length === 0) {
      return (
        <div className={`${className} w-full px-6 py-6 text-center`}>
          <p className="text-gray-500">Please Start Adding Logos To See The Carousel</p>
        </div>
      );
    }

    // Duplicate logos for seamless infinite loop
    const displayLogos = infinite ? [...logos, ...logos] : logos;
    const animationDuration = `${playSpeed * logos.length}s`;

    return (
      <div
        className={`${className} overflow-hidden`}
        style={
          {
            '--items-mobile': itemsPerRowMobile,
            '--items-tablet': itemsPerRowTablet,
            '--items-desktop': itemsPerRowDesktop,
            '--items-super': itemsPerRowSuperDesktop,
            '--marquee-duration': animationDuration,
          } as React.CSSProperties
        }
      >
        <div className={`flex${infinite ? ' logo-marquee-animate' : ''}`}>
          {displayLogos.map((logo: LogoInterface, index: number) => (
            <div key={index} className="logo-marquee-item shrink-0 flex items-center justify-center px-6 py-6">
              <a
                href={logo.link?.href ?? '#'}
                target={logo.link?.target}
                rel={logo.link?.target === '_blank' ? 'noopener noreferrer' : undefined}
                className="flex h-full w-full items-center justify-center"
              >
                <img
                  src={logo.imageSrc ?? ''}
                  alt={logo.imageAlt ?? ''}
                  className="mx-auto max-h-full max-w-full object-contain"
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  },
  {
    type: 'primitive-logo-carousel',
    label: 'GIT / Logo Carousel (GIT)',
    icon: 'carousel',
    props: {
      className: Style(),
      logos: List({
        label: 'Logos',
        type: Group({
          label: 'Logo',
          props: {
            imageSrc: Image({ label: 'Image' }),
            imageAlt: TextInput({ label: 'Image Alt', defaultValue: 'Logo image' }),
            link: Link({ label: 'Link' }),
          },
        }),
        getItemLabel(logo) {
          return logo?.imageAlt || 'Logo';
        },
      }),
      itemsPerRowSuperDesktop: Number({
        label: 'Items Per Row (Super Large Desktop)',
        defaultValue: 8,
        min: 1,
      }),
      itemsPerRowDesktop: Number({ label: 'Items Per Row (Desktop)', defaultValue: 6, min: 1 }),
      itemsPerRowTablet: Number({ label: 'Items Per Row (Tablet)', defaultValue: 4, min: 1 }),
      itemsPerRowMobile: Number({ label: 'Items Per Row (Mobile)', defaultValue: 2, min: 1 }),
      infinite: Checkbox({ label: 'Infinite Loop', defaultValue: true }),
      playSpeed: Number({ label: 'Slide Play Speed (In Seconds)', defaultValue: 1 }),
    },
  },
);
