import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchParams } from 'nuqs/server';

import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { type Breadcrumb } from '@/vibes/soul/sections/breadcrumbs';
import { FeaturedProductCarousel } from '@/vibes/soul/sections/featured-product-carousel';
import { ProductVideos } from '@/vibes/soul/sections/product-detail/product-videos';
import { SectionLayout } from '@/vibes/soul/sections/section-layout';
import { auth, getSessionCustomerAccessToken } from '~/auth';
import { B2BProductWidget } from '~/components/b2b/product-widget';
import { B2BOnly } from '~/components/b2b/visibility';
import { rewriteWysiwygContentUrls } from '~/data-transformers/html-content-transformer';
import { pricesTransformer } from '~/data-transformers/prices-transformer';
import { productCardTransformer } from '~/data-transformers/product-card-transformer';
import { productOptionsTransformer } from '~/data-transformers/product-options-transformer';
import { generateSSOUrl } from '~/lib/b2b/sso';
import { getPreferredCurrencyCode } from '~/lib/currency';
import { getMakeswiftPageMetadata } from '~/lib/makeswift';
import { ProductDetail } from '~/lib/makeswift/components/product-detail';
import { getProductPromotionBadges } from '~/lib/promotion-badges';
import { getRecaptchaSiteKey } from '~/lib/recaptcha';
import { DEFAULT_SITE_NAME } from '~/lib/seo';

import { addToCart } from './_actions/add-to-cart';
import { getMoreProductImages } from './_actions/get-more-images';
import { submitReview } from './_actions/submit-review';
import { ProductAnalyticsProvider } from './_components/product-analytics-provider';
import { ProductSchema } from './_components/product-schema';
import { ProductViewed } from './_components/product-viewed';
import { QnAList } from './_components/qna-list';
import { Reviews } from './_components/reviews';
import { WishlistButton } from './_components/wishlist-button';
import { WishlistButtonForm } from './_components/wishlist-button/form';
import {
  getProduct,
  getProductDataRest,
  getProductPageMetadata,
  getProductPricingAndRelatedProducts,
  getProductPromotionData,
  getStreamableProduct,
  getStreamableProductInventory,
} from './page-data';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}

// GI: JSON stored in a product metafield, or [] when missing or invalid.
function parseMetafield<T>(metafields: Array<{ key: string; value: string }>, key: string): T[] {
  const field = metafields.find((f) => f.key === key);

  if (!field) return [];

  try {
    const parsed: unknown = JSON.parse(field.value);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;

  setRequestLocale(locale);

  const customerAccessToken = await getSessionCustomerAccessToken();

  const productId = Number(slug);

  const product = await getProductPageMetadata(productId, customerAccessToken);

  if (!product) {
    return notFound();
  }

  const makeswiftMetadata = await getMakeswiftPageMetadata({ path: product.path, locale });

  const { pageTitle, metaDescription, metaKeywords } = product.seo;
  const { url, altText: alt } = product.defaultImage || {};

  // GI: SEO-length title/description fallbacks, our canonical and Open Graph tags; Makeswift
  // overrides (upstream) win when set.
  const title =
    makeswiftMetadata?.title ||
    (pageTitle && pageTitle.length >= 10 && pageTitle.length <= 60
      ? pageTitle
      : `${product.name} | Buy Online - Quality & Value`);
  const description =
    makeswiftMetadata?.description ||
    (metaDescription && metaDescription.length <= 160
      ? metaDescription
      : `${product.plainTextDescription.replaceAll(/\s+/g, ' ').trim().slice(0, 150)}...`);
  const siteName = process.env.NEXT_PUBLIC_STORE_NAME || DEFAULT_SITE_NAME;
  const pageUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}${product.path}`
    : `https://gitool.com${product.path}`;

  return {
    title,
    description,
    ...(metaKeywords && { keywords: metaKeywords.split(',') }),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName,
      images: url
        ? [{ url, alt }]
        : [
            {
              url: process.env.NEXT_PUBLIC_OG_IMAGE || '/favicon.ico',
              alt: `${siteName} Logo`,
            },
          ],
    },
  };
}

export default async function Product({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const options = await searchParams;

  const optionValueIds = Object.keys(options)
    .map((option) => ({
      optionEntityId: Number(option),
      valueEntityId: Number(options[option]),
    }))
    .filter(
      (option) => !Number.isNaN(option.optionEntityId) && !Number.isNaN(option.valueEntityId),
    );

  const customerAccessToken = await getSessionCustomerAccessToken();
  const detachedWishlistFormId = 'product-add-to-wishlist-form';

  setRequestLocale(locale);

  const t = await getTranslations('Product');
  const format = await getFormatter();

  const productId = Number(slug);

  const [{ product: baseProduct, settings }, recaptchaSiteKey] = await Promise.all([
    getProduct(productId, customerAccessToken),
    getRecaptchaSiteKey(),
  ]);

  // GI: reviews and ratings stay hidden until reviews are collected.
  const reviewsEnabled = false;
  const showRating = false;
  const taxDisplay = settings?.tax?.pdp;

  if (!baseProduct) {
    return notFound();
  }

  const streamableProduct = Streamable.from(async () => {
    const variables = {
      entityId: Number(productId),
      optionValueIds,
      useDefaultOptionSelections: true,
    };

    const product = await getStreamableProduct(variables, customerAccessToken);

    if (!product) {
      return notFound();
    }

    return product;
  });

  const streamableProductSku = Streamable.from(async () => (await streamableProduct).sku);

  const streamableProductInventory = Streamable.from(async () => {
    const variables = {
      entityId: Number(productId),
      optionValueIds,
      useDefaultOptionSelections: true,
    };

    const product = await getStreamableProductInventory(variables, customerAccessToken);

    if (!product) {
      return notFound();
    }

    return product;
  });

  const streamableProductPricingAndRelatedProducts = Streamable.from(async () => {
    const currencyCode = await getPreferredCurrencyCode();

    const variables = {
      entityId: Number(productId),
      optionValueIds,
      useDefaultOptionSelections: true,
      currencyCode,
    };

    return await getProductPricingAndRelatedProducts(variables, customerAccessToken);
  });

  const streamablePrices = Streamable.from(async () => {
    const product = await streamableProductPricingAndRelatedProducts;

    if (!product) {
      return null;
    }

    return pricesTransformer(product, format, taxDisplay) ?? null;
  });

  const streamableImages = Streamable.from(async () => {
    const product = await streamableProduct;

    const images = removeEdgesAndNodes(product.images)
      .filter((image) => image.url !== product.defaultImage?.url)
      .map((image) => ({
        src: image.url,
        alt: image.altText,
      }));

    return {
      images: product.defaultImage
        ? [{ src: product.defaultImage.url, alt: product.defaultImage.altText }, ...images]
        : images,
      pageInfo: product.images.pageInfo,
    };
  });

  // Product videos render in their own section below the primary content, so
  // they're streamed independently of the gallery images. The Storefront
  // GraphQL API returns each video as { title, url } (a YouTube watch URL).
  const streamableVideos = Streamable.from(async () => {
    const product = await streamableProduct;

    return removeEdgesAndNodes(product.videos).map((video) => ({
      url: video.url,
      title: video.title,
    }));
  });

  // GI: out-of-stock items can still be added to the cart (backorder from factory stock), so only
  // an unavailable product disables the button.
  const streameableCtaLabel = Streamable.from(async () => {
    const product = await streamableProductInventory;

    if (product.availabilityV2.status === 'Unavailable') {
      return t('ProductDetails.Submit.unavailable');
    }

    if (product.availabilityV2.status === 'Preorder') {
      return t('ProductDetails.Submit.preorder');
    }

    return t('ProductDetails.Submit.addToCart');
  });

  const streameableCtaDisabled = Streamable.from(async () => {
    const product = await streamableProductInventory;

    return product.availabilityV2.status === 'Unavailable';
  });

  // GI: inventory tracking and level from the REST catalog drive our stock message.
  const streamableProductRest = Streamable.from(async () =>
    getProductDataRest((await streamableProduct).sku),
  );

  const streamableInventoryTracking = Streamable.from(async () => {
    const productRest = await streamableProductRest;

    return productRest ? String(productRest.inventory_tracking) : null;
  });

  const streamableInventoryLevel = Streamable.from(async () => {
    const productRest = await streamableProductRest;

    return productRest && typeof productRest.inventory_level === 'number'
      ? { value: productRest.inventory_level }
      : null;
  });

  // GI: gift (free tool) promotions
  const streamablePromotionData = Streamable.from(() => getProductPromotionData(productId));
  const streamablePromotions = Streamable.from(
    async () => (await streamablePromotionData).promotions,
  );
  const streamableGiftProducts = Streamable.from(
    async () => (await streamablePromotionData).giftProducts,
  );

  // GI: downloadable documents and Q&A from product metafields
  const streamableDocuments = Streamable.from(async () =>
    parseMetafield<{ label: string; url: string }>(
      removeEdgesAndNodes((await streamableProduct).documentsMetafields),
      'documents',
    ),
  );

  const streamableQnA = Streamable.from(async () =>
    parseMetafield<{ question: string; answer: string }>(
      removeEdgesAndNodes((await streamableProduct).qnaMetafields),
      'qa_data',
    ),
  );

  // GI: breadcrumbs from the product's first category
  const streamableBreadcrumbs = Streamable.from(async (): Promise<Breadcrumb[]> => {
    const category = removeEdgesAndNodes((await streamableProduct).categories)[0];

    if (!category) {
      return [];
    }

    return removeEdgesAndNodes(category.breadcrumbs).map(({ name, path }) => ({
      label: name,
      href: path ?? '#',
    }));
  });

  const streameableAccordions = Streamable.from(async () => {
    const product = await streamableProduct;

    const customFields = removeEdgesAndNodes(product.customFields);

    // GI: SKU is shown under the title, so it's not repeated here.
    const specifications = [
      {
        name: t('ProductDetails.Accordions.weight'),
        value: `${product.weight?.value} ${product.weight?.unit}`,
      },
      {
        name: t('ProductDetails.Accordions.condition'),
        value: product.condition,
      },
      ...customFields.map((field) => ({
        name: field.name,
        value: field.value,
      })),
    ];

    return [
      ...(specifications.length
        ? [
            {
              title: t('ProductDetails.Accordions.specifications'),
              content: (
                <div className="@container">
                  <dl className="flex flex-col gap-2">
                    {specifications.map((field, index) => (
                      <div className="grid grid-cols-1 gap-0 @lg:grid-cols-2" key={index}>
                        <dt>
                          <strong>{field.name}</strong>
                        </dt>
                        <dd className="pl-0">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            },
          ]
        : []),
      ...(product.warranty
        ? [
            {
              title: t('ProductDetails.Accordions.warranty'),
              content: (
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{
                    __html: rewriteWysiwygContentUrls(product.warranty),
                  }}
                />
              ),
            },
          ]
        : []),
    ];
  });

  // GI: fall back to products from the same category when there are no related products, and
  // badge products that have a gift promotion.
  const streameableRelatedProducts = Streamable.from(async () => {
    const product = await streamableProductPricingAndRelatedProducts;

    if (!product) {
      return [];
    }

    const relatedProducts = removeEdgesAndNodes(product.relatedProducts);
    const firstCategory = removeEdgesAndNodes(product.categories)[0];
    const categoryProducts = firstCategory ? removeEdgesAndNodes(firstCategory.products) : [];

    const productBadges = await getProductPromotionBadges();

    return productCardTransformer(
      relatedProducts.length > 0 ? relatedProducts : categoryProducts,
      format,
      undefined,
      undefined,
      taxDisplay,
      productBadges,
    );
  });

  const streamableMinQuantity = Streamable.from(async () => {
    const product = await streamableProduct;

    return product.minPurchaseQuantity;
  });

  const streamableMaxQuantity = Streamable.from(async () => {
    const product = await streamableProduct;

    return product.maxPurchaseQuantity;
  });

  const streamableAnalyticsData = Streamable.from(async () => {
    const [extendedProduct, pricingProduct] = await Streamable.all([
      streamableProduct,
      streamableProductPricingAndRelatedProducts,
    ]);

    return {
      id: extendedProduct.entityId,
      name: extendedProduct.name,
      sku: extendedProduct.sku,
      brand: extendedProduct.brand?.name ?? '',
      price: pricingProduct?.pricesIncludingTax?.price.value ?? 0,
      currency: pricingProduct?.pricesIncludingTax?.price.currencyCode ?? '',
    };
  });

  const promotionCallouts = removeEdgesAndNodes(baseProduct.featuredPromotions).map((p) => ({
    id: p.entityId.toString(),
    text: p.text,
  }));

  const streamableUser = Streamable.from(async () => {
    const session = await auth();
    const firstName = session?.user?.firstName ?? '';
    const lastName = session?.user?.lastName ?? '';

    if (!firstName || !lastName) {
      return { email: session?.user?.email ?? '', name: '' };
    }

    const lastInitial = lastName.charAt(0).toUpperCase();
    const obfuscatedName = `${firstName} ${lastInitial}.`;

    return { email: session?.user?.email ?? '', name: obfuscatedName };
  });

  // GI: B2B customers order through the portal widget (with SSO) instead of the retail form.
  const streamableB2BWidgetData = Streamable.from(async () => {
    const [product, pricingProduct, session] = await Promise.all([
      streamableProduct,
      streamableProductPricingAndRelatedProducts,
      auth(),
    ]);
    const portalBase = process.env.B2B_PORTAL_URL ?? '';
    const email = session?.user?.email;

    return {
      sku: product.sku,
      bcPrice: pricingProduct?.pricesExcludingTax?.price.value ?? null,
      ssoUrl: email && portalBase ? generateSSOUrl(email, portalBase) : portalBase,
    };
  });

  return (
    <SectionLayout hideOverflow={true}>
      <ProductAnalyticsProvider data={streamableAnalyticsData}>
        <ProductDetail
          action={addToCart}
          additionalActions={
            <WishlistButton
              formId={detachedWishlistFormId}
              productId={productId}
              productSku={streamableProductSku}
            />
          }
          additionalInformationTitle={t('ProductDetails.additionalInformation')}
          breadcrumbs={streamableBreadcrumbs}
          ctaDisabled={streameableCtaDisabled}
          ctaLabel={streameableCtaLabel}
          decrementLabel={t('ProductDetails.decreaseQuantity')}
          documents={streamableDocuments}
          emptySelectPlaceholder={t('ProductDetails.emptySelectPlaceholder')}
          fields={productOptionsTransformer(baseProduct.productOptions)}
          formSlot={
            <B2BOnly>
              <Stream
                fallback={<div className="h-48 animate-pulse rounded-xl bg-contrast-100" />}
                value={streamableB2BWidgetData}
              >
                {(b2b) => (
                  <B2BProductWidget
                    bcPrice={b2b.bcPrice}
                    bcProductId={productId}
                    portalUrl={b2b.ssoUrl}
                    productName={baseProduct.name}
                    productUrl={baseProduct.path}
                    sku={b2b.sku}
                  />
                )}
              </Stream>
            </B2BOnly>
          }
          giftProducts={streamableGiftProducts}
          incrementLabel={t('ProductDetails.increaseQuantity')}
          inventoryLevel={streamableInventoryLevel}
          inventoryTracking={streamableInventoryTracking}
          loadMoreImagesAction={getMoreProductImages}
          prefetch={true}
          product={{
            id: baseProduct.entityId.toString(),
            title: baseProduct.name,
            description: (
              <div
                dangerouslySetInnerHTML={{
                  __html: rewriteWysiwygContentUrls(baseProduct.description),
                }}
              />
            ),
            href: baseProduct.path,
            images: streamableImages,
            price: streamablePrices,
            reviewsEnabled,
            showRating,
            numberOfReviews: baseProduct.reviewSummary.numberOfReviews,
            subtitle: baseProduct.brand?.name,
            subtitleHref: baseProduct.brand?.path,
            rating: baseProduct.reviewSummary.averageRating,
            accordions: streameableAccordions,
            minQuantity: streamableMinQuantity,
            maxQuantity: streamableMaxQuantity,
            // GI: no BigCommerce stock/backorder display data; our own stock message is shown.
          }}
          productId={baseProduct.entityId}
          promotionCallouts={promotionCallouts}
          promotions={streamablePromotions}
          quantityLabel={t('ProductDetails.quantity')}
          recaptchaSiteKey={recaptchaSiteKey}
          reviewFormAction={submitReview}
          sku={streamableProductSku}
          thumbnailLabel={t('ProductDetails.thumbnail')}
          user={streamableUser}
        />
      </ProductAnalyticsProvider>

      <Stream fallback={null} value={streamableQnA}>
        {(items) =>
          items.length > 0 && (
            <div className="mx-auto max-w-screen-2xl px-4 pb-20 @xl:px-6 @4xl:px-8">
              <h2 className="mb-8 font-heading text-2xl font-medium">Questions & Answers</h2>
              <QnAList items={items} />
            </div>
          )
        }
      </Stream>

      <Stream fallback={null} value={streamableVideos}>
        {(videos) => videos.length > 0 && <ProductVideos videos={videos} />}
      </Stream>

      <div className="mb-20">
        <FeaturedProductCarousel
          cta={{ label: t('RelatedProducts.cta'), href: '/shop' }}
          emptyStateSubtitle={t('RelatedProducts.browseCatalog')}
          emptyStateTitle={t('RelatedProducts.noRelatedProducts')}
          nextLabel={t('RelatedProducts.nextProducts')}
          previousLabel={t('RelatedProducts.previousProducts')}
          products={streameableRelatedProducts}
          scrollbarLabel={t('RelatedProducts.scrollbar')}
          title={t('RelatedProducts.title')}
        />
      </div>

      {showRating && (
        <div id="reviews">
          <Reviews
            productId={productId}
            recaptchaSiteKey={recaptchaSiteKey}
            searchParams={searchParams}
            streamableImages={streamableImages}
            streamableProduct={streamableProduct}
          />
        </div>
      )}

      <Stream
        fallback={null}
        value={Streamable.from(async () =>
          Streamable.all([streamableProduct, streamableProductPricingAndRelatedProducts]),
        )}
      >
        {([extendedProduct, pricingProduct]) => (
          <>
            <ProductSchema
              product={{
                ...extendedProduct,
                pricesIncludingTax: pricingProduct?.pricesIncludingTax ?? null,
                pricesExcludingTax: pricingProduct?.pricesExcludingTax ?? null,
              }}
              taxDisplay={taxDisplay}
            />
            <ProductViewed
              product={{
                ...extendedProduct,
                pricesIncludingTax: pricingProduct?.pricesIncludingTax ?? null,
                pricesExcludingTax: pricingProduct?.pricesExcludingTax ?? null,
              }}
              taxDisplay={taxDisplay}
            />
          </>
        )}
      </Stream>

      <WishlistButtonForm
        formId={detachedWishlistFormId}
        productId={productId}
        productSku={streamableProductSku}
        searchParams={searchParams}
      />
    </SectionLayout>
  );
}
