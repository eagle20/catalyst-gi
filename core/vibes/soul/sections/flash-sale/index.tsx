import { clsx } from 'clsx';

import { CountdownTimer } from '@/vibes/soul/primitives/countdown-timer';
import { ProductCard, Product } from '@/vibes/soul/primitives/product-card';
import { Streamable, Stream } from '@/vibes/soul/lib/streamable';
import { Button } from '@/vibes/soul/primitives/button';
import { Link } from '~/components/link';

interface FlashSaleProps {
  title?: string;
  description?: string;
  endDate: Date | string;
  products: Streamable<Product[]>;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  timerSize?: 'small' | 'medium' | 'large';
  showCompare?: boolean;
  compareLabel?: string;
  compareParamName?: string;
  imagePriority?: boolean;
  expiredMessage?: string;
}

export function FlashSale({
  title = 'Flash Sale',
  description,
  endDate,
  products,
  ctaLabel,
  ctaHref,
  className,
  timerSize = 'large',
  showCompare = false,
  compareLabel,
  compareParamName,
  imagePriority = false,
  expiredMessage = 'Sale Ended - Check back soon!',
}: FlashSaleProps) {
  return (
    <section className={clsx('@container', className)}>
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-10 @xl:px-6 @xl:py-14 @4xl:px-8 @4xl:py-20">
        {/* Header Section */}
        <div className="mb-8 text-center @xl:mb-12">
          <h2 className="mb-4 font-heading text-3xl font-bold text-foreground @xl:text-4xl @4xl:text-5xl">
            {title}
          </h2>
          {description && (
            <p className="mx-auto mb-6 max-w-2xl text-lg text-foreground/70 @xl:text-xl">
              {description}
            </p>
          )}

          {/* Countdown Timer */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-contrast-100 p-6 @xl:p-8">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/70">
                Sale Ends In
              </p>
              <CountdownTimer
                targetDate={endDate}
                size={timerSize}
                expiredMessage={expiredMessage}
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <Stream fallback={<FlashSaleProductsSkeleton />} value={products}>
          {(productList) => {
            if (productList.length === 0) {
              return (
                <div className="py-12 text-center">
                  <p className="text-lg text-foreground/70">
                    No sale products available at this time.
                  </p>
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 gap-6 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
                  {productList.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      showCompare={showCompare}
                      compareLabel={compareLabel}
                      compareParamName={compareParamName}
                      imagePriority={imagePriority && index < 4}
                    />
                  ))}
                </div>

                {/* CTA Button */}
                {ctaLabel && ctaHref && (
                  <div className="mt-8 flex justify-center @xl:mt-12">
                    <Button asChild size="large">
                      <Link href={ctaHref}>{ctaLabel}</Link>
                    </Button>
                  </div>
                )}
              </>
            );
          }}
        </Stream>
      </div>
    </section>
  );
}

function FlashSaleProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/6] rounded-xl bg-contrast-100" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-contrast-100" />
            <div className="h-4 w-1/2 rounded bg-contrast-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
