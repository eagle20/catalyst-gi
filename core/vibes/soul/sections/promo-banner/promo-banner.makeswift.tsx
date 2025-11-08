import { Select, Style, TextInput } from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';

import { PromoBanner } from './index';

runtime.registerComponent(PromoBanner, {
  type: 'soul-promo-banner',
  label: 'Soul / Promo Banner',
  props: {
    className: Style(),
    title: TextInput({
      label: 'Title',
      defaultValue: 'Special Offer',
      placeholder: 'Banner title',
    }),
    description: TextInput({
      label: 'Description',
      defaultValue: 'Limited time offer - Save up to 50% on select items',
      placeholder: 'Banner description (optional)',
    }),
    ctaLabel: TextInput({
      label: 'CTA Label',
      defaultValue: 'Shop Now',
      placeholder: 'Button text (optional)',
    }),
    ctaHref: TextInput({
      label: 'CTA Link',
      defaultValue: '/search',
      placeholder: 'Button link (optional)',
    }),
    backgroundImage: TextInput({
      label: 'Background Image URL',
      defaultValue: '',
      placeholder: 'Image URL (optional)',
    }),
    backgroundColor: TextInput({
      label: 'Background Color',
      defaultValue: 'bg-primary',
      placeholder: 'Tailwind class (e.g., bg-primary)',
    }),
    textColor: Select({
      label: 'Text Color',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
      defaultValue: 'light',
    }),
    size: Select({
      label: 'Size',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
      defaultValue: 'medium',
    }),
  },
});
