'use client';

import { Group, List, Slot, Style, TextInput } from '@makeswift/runtime/controls';

import { Link } from '~/components/link';
import { runtime } from '~/lib/makeswift/runtime';

interface SubcategoryLink {
  label: string;
  href: string;
}

interface BrandBannerProps {
  className?: string;
  bodyCopy: React.ReactNode;
  subcategoryLinks: SubcategoryLink[];
}

function BrandBanner({ className, bodyCopy, subcategoryLinks }: BrandBannerProps) {
  const hasLinks = subcategoryLinks.length > 0;

  return (
    <div className={className}>
      <div className="mx-auto max-w-screen-2xl px-4 pb-8 pt-10 @xl:px-6 @4xl:px-8">
        <div className="prose max-w-3xl">{bodyCopy}</div>

        {hasLinks && (
          <div className="mt-6 flex flex-wrap gap-3">
            {subcategoryLinks.map(({ label, href }, index) => (
              <Link
                className="rounded-full border border-[hsl(var(--contrast-200))] px-4 py-1.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--contrast-100))]"
                href={href || '#'}
                key={index}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

runtime.registerComponent(BrandBanner, {
  type: 'git-brand-banner',
  label: 'GIT / Brand Banner',
  props: {
    className: Style(),
    bodyCopy: Slot(),
    subcategoryLinks: List({
      label: 'Subcategory Links',
      type: Group({
        label: 'Link',
        props: {
          label: TextInput({ label: 'Label', defaultValue: 'Subcategory' }),
          href: TextInput({ label: 'URL', defaultValue: '/shop' }),
        },
      }),
      getItemLabel(link) {
        return link?.label || 'Link';
      },
    }),
  },
});
