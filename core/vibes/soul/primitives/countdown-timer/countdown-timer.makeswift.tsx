import { Number as NumberControl, Select, Style, TextInput } from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';

import { CountdownTimer } from './index';

runtime.registerComponent(CountdownTimer, {
  type: 'soul-countdown-timer',
  label: 'Soul / Countdown Timer',
  props: {
    className: Style(),
    targetDate: TextInput({
      label: 'Target Date',
      defaultValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      placeholder: 'ISO date string (e.g., 2025-12-31T23:59:59Z)',
    }),
    expiredMessage: TextInput({
      label: 'Expired Message',
      defaultValue: 'Sale Ended',
      placeholder: 'Message to show when timer expires',
    }),
    showLabels: Select({
      label: 'Show Labels',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      defaultValue: true,
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
