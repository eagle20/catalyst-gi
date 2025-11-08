import { Checkbox, Select, Style, TextInput } from '@makeswift/runtime/controls';
import { useEffect, useState } from 'react';

import { ResultOf } from '~/client/graphql';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { runtime } from '~/lib/makeswift/runtime';

import { FlashSale } from './index';

interface Props {
  title?: string;
  description?: string;
  endDate: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  timerSize?: 'small' | 'medium' | 'large';
  showCompare?: boolean;
  compareLabel?: string;
  compareParamName?: string;
  expiredMessage?: string;
}

type Product = ResultOf<typeof ProductCardFragment>;

runtime.registerComponent(
  function MakeswiftFlashSale({
    title = 'Flash Sale',
    description,
    endDate,
    ctaLabel,
    ctaHref,
    className,
    timerSize = 'large',
    showCompare = false,
    compareLabel,
    compareParamName,
    expiredMessage = 'Sale Ended - Check back soon!',
  }: Props) {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
      const fetchProducts = async () => {
        const response = await fetch('/api/flash-sale/products');
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const data = (await response.json()) as Product[];

        setProducts(data);
      };

      void fetchProducts();
    }, []);

    return (
      <FlashSale
        className={className}
        compareLabel={compareLabel}
        compareParamName={compareParamName}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        description={description}
        endDate={endDate}
        expiredMessage={expiredMessage}
        imagePriority={false}
        products={products}
        showCompare={showCompare}
        timerSize={timerSize}
        title={title}
      />
    );
  },
  {
    type: 'soul-flash-sale',
    label: 'Soul / Flash Sale',
    props: {
      className: Style(),
      title: TextInput({
        label: 'Title',
        defaultValue: 'Flash Sale',
        placeholder: 'Section title',
      }),
      description: TextInput({
        label: 'Description',
        defaultValue: 'Limited time deals on our best products',
        placeholder: 'Section description (optional)',
      }),
      endDate: TextInput({
        label: 'End Date',
        defaultValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        placeholder: 'ISO date string (e.g., 2025-12-31T23:59:59Z)',
      }),
      ctaLabel: TextInput({
        label: 'CTA Label',
        defaultValue: 'View All Deals',
        placeholder: 'Button text (optional)',
      }),
      ctaHref: TextInput({
        label: 'CTA Link',
        defaultValue: '/promotions',
        placeholder: 'Button link (optional)',
      }),
      timerSize: Select({
        label: 'Timer Size',
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
        defaultValue: 'large',
      }),
      showCompare: Checkbox({
        label: 'Show Compare',
        defaultValue: false,
      }),
      compareLabel: TextInput({
        label: 'Compare Label',
        defaultValue: 'Compare',
        placeholder: 'Compare checkbox label',
      }),
      compareParamName: TextInput({
        label: 'Compare Param Name',
        defaultValue: 'compare',
        placeholder: 'URL parameter name',
      }),
      expiredMessage: TextInput({
        label: 'Expired Message',
        defaultValue: 'Sale Ended - Check back soon!',
        placeholder: 'Message when countdown expires',
      }),
    },
  },
);
