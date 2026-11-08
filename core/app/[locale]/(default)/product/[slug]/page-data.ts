import axios from 'axios';
import { cache } from 'react';

import { client } from '~/client';
import { getProductPromotions } from '~/client/management/get-product-promotions';
import { getGiftProducts } from '~/client/queries/get-gift-products';
import { PricingFragment } from '~/client/fragments/pricing';
import { graphql, VariablesOf } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { FeaturedProductsCarouselFragment } from '~/components/featured-products-carousel/fragment';
import { ProductVariantsInventoryFragment } from '~/components/product-variants-inventory/fragment';

import { ProductSchemaFragment } from './_components/product-schema/fragment';
import { ProductViewedFragment } from './_components/product-viewed/fragment';

const MultipleChoiceFieldFragment = graphql(`
  fragment MultipleChoiceFieldFragment on MultipleChoiceOption {
    entityId
    displayName
    displayStyle
    isRequired
    values(first: 50) {
      edges {
        node {
          entityId
          label
          isDefault
          isSelected
          ... on SwatchOptionValue {
            __typename
            hexColors
            imageUrl(lossy: true, width: 40)
          }
          ... on ProductPickListOptionValue {
            __typename
            defaultImage {
              altText
              url: urlTemplate(lossy: true)
            }
          }
        }
      }
    }
  }
`);

const CheckboxFieldFragment = graphql(`
  fragment CheckboxFieldFragment on CheckboxOption {
    entityId
    isRequired
    displayName
    checkedByDefault
    label
    checkedOptionValueEntityId
    uncheckedOptionValueEntityId
  }
`);

const NumberFieldFragment = graphql(`
  fragment NumberFieldFragment on NumberFieldOption {
    entityId
    displayName
    isRequired
    defaultNumber: defaultValue
    highest
    isIntegerOnly
    limitNumberBy
    lowest
  }
`);

const TextFieldFragment = graphql(`
  fragment TextFieldFragment on TextFieldOption {
    entityId
    displayName
    isRequired
    defaultText: defaultValue
    maxLength
    minLength
  }
`);

const MultiLineTextFieldFragment = graphql(`
  fragment MultiLineTextFieldFragment on MultiLineTextFieldOption {
    entityId
    displayName
    isRequired
    defaultText: defaultValue
    maxLength
    minLength
    maxLines
  }
`);

const DateFieldFragment = graphql(`
  fragment DateFieldFragment on DateFieldOption {
    entityId
    displayName
    isRequired
    defaultDate: defaultValue
    earliest
    latest
    limitDateBy
  }
`);

export const ProductOptionsFragment = graphql(
  `
    fragment ProductOptionsFragment on Product {
      entityId
      productOptions(first: 50) {
        edges {
          node {
            __typename
            entityId
            displayName
            isRequired
            ...MultipleChoiceFieldFragment
            ...CheckboxFieldFragment
            ...NumberFieldFragment
            ...TextFieldFragment
            ...MultiLineTextFieldFragment
            ...DateFieldFragment
          }
        }
      }
    }
  `,
  [
    MultipleChoiceFieldFragment,
    CheckboxFieldFragment,
    NumberFieldFragment,
    TextFieldFragment,
    MultiLineTextFieldFragment,
    DateFieldFragment,
  ],
);

const ProductPageMetadataQuery = graphql(`
  query ProductPageMetadataQuery($entityId: Int!) {
    site {
      product(entityId: $entityId) {
        name
        path
        defaultImage {
          altText
          url(width: 1200, lossy: true)
        }
        seo {
          pageTitle
          metaDescription
          metaKeywords
        }
        path
        plainTextDescription(characterLimit: 1200)
      }
    }
  }
`);

export const getProductPageMetadata = cache(
  async (entityId: number, customerAccessToken?: string) => {
    const { data } = await client.fetch({
      document: ProductPageMetadataQuery,
      variables: { entityId },
      customerAccessToken,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
    });

    return data.site.product;
  },
);

const ProductQuery = graphql(
  `
    query ProductQuery($entityId: Int!) {
      site {
        settings {
          reviews {
            enabled
          }
          display {
            showProductRating
          }
          tax {
            pdp
          }
        }
        product(entityId: $entityId) {
          entityId
          name
          description
          path
          brand {
            name
            # GI: brand page link on the product title
            path
          }
          reviewSummary {
            averageRating
            numberOfReviews
          }
          description
          featuredPromotions {
            edges {
              node {
                entityId
                text
              }
            }
          }
          ...ProductOptionsFragment
        }
      }
    }
  `,
  [ProductOptionsFragment],
);

export const getProduct = cache(async (entityId: number, customerAccessToken?: string) => {
  const { data } = await client.fetch({
    document: ProductQuery,
    variables: { entityId },
    customerAccessToken,
    fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
  });

  return data.site;
});

const StreamableProductVariantInventoryBySkuQuery = graphql(`
  query ProductVariantBySkuQuery($productId: Int!, $sku: String!) {
    site {
      product(entityId: $productId) {
        variants(skus: [$sku]) {
          edges {
            node {
              id
              entityId
              sku
              inventory {
                aggregated {
                  availableToSell
                  warningLevel
                  availableOnHand
                  availableForBackorder
                  unlimitedBackorder
                }
                byLocation {
                  edges {
                    node {
                      locationEntityId
                      backorderMessage
                    }
                  }
                }
                isInStock
              }
            }
          }
        }
      }
    }
  }
`);

type VariantInventoryVariables = VariablesOf<typeof StreamableProductVariantInventoryBySkuQuery>;

export const getStreamableProductVariantInventory = cache(
  async (variables: VariantInventoryVariables, customerAccessToken?: string) => {
    const { data } = await client.fetch({
      document: StreamableProductVariantInventoryBySkuQuery,
      variables,
      customerAccessToken,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate: 60 } },
    });

    return data.site.product?.variants;
  },
);

const StreamableProductQuery = graphql(
  `
    query StreamableProductQuery(
      $entityId: Int!
      $optionValueIds: [OptionValueId!]
      $useDefaultOptionSelections: Boolean
    ) {
      site {
        product(
          entityId: $entityId
          optionValueIds: $optionValueIds
          useDefaultOptionSelections: $useDefaultOptionSelections
        ) {
          entityId
          images(first: 12) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                altText
                url: urlTemplate(lossy: true)
                isDefault
              }
            }
          }
          defaultImage {
            altText
            url: urlTemplate(lossy: true)
          }
          # Product videos. The Storefront GraphQL API only returns the video
          # title and url (a YouTube watch URL); the dedicated PDP Videos section
          # renders them via lite-youtube-embed. 25 covers realistic product
          # video counts without needing pagination.
          videos(first: 25) {
            edges {
              node {
                title
                url
              }
            }
          }
          sku
          weight {
            value
            unit
          }
          condition
          customFields {
            edges {
              node {
                entityId
                name
                value
              }
            }
          }
          minPurchaseQuantity
          maxPurchaseQuantity
          warranty
          # GI: product Q&A and downloadable documents (metafields), and category breadcrumbs
          qnaMetafields: metafields(namespace: "seo_qa", keys: ["qa_data"]) {
            edges {
              node {
                key
                value
              }
            }
          }
          documentsMetafields: metafields(namespace: "product_content", keys: ["documents"]) {
            edges {
              node {
                key
                value
              }
            }
          }
          categories {
            edges {
              node {
                breadcrumbs(depth: 5) {
                  edges {
                    node {
                      name
                      path
                      entityId
                    }
                  }
                }
              }
            }
          }
          ...ProductViewedFragment
          ...ProductSchemaFragment
        }
      }
    }
  `,
  [ProductViewedFragment, ProductSchemaFragment],
);

type Variables = VariablesOf<typeof StreamableProductQuery>;

export const getStreamableProduct = cache(
  async (variables: Variables, customerAccessToken?: string) => {
    const { data } = await client.fetch({
      document: StreamableProductQuery,
      variables,
      customerAccessToken,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
    });

    return data.site.product;
  },
);

const StreamableProductInventoryQuery = graphql(
  `
    query StreamableProductInventoryQuery(
      $entityId: Int!
      $optionValueIds: [OptionValueId!]
      $useDefaultOptionSelections: Boolean
    ) {
      site {
        product(
          entityId: $entityId
          optionValueIds: $optionValueIds
          useDefaultOptionSelections: $useDefaultOptionSelections
        ) {
          sku
          inventory {
            hasVariantInventory
            isInStock
            aggregated {
              availableToSell
              warningLevel
              availableOnHand
              availableForBackorder
              unlimitedBackorder
            }
          }
          availabilityV2 {
            status
          }
          ...ProductVariantsInventoryFragment
        }
      }
    }
  `,
  [ProductVariantsInventoryFragment],
);

type ProductInventoryVariables = VariablesOf<typeof StreamableProductInventoryQuery>;

export const getStreamableProductInventory = cache(
  async (variables: ProductInventoryVariables, customerAccessToken?: string) => {
    const { data } = await client.fetch({
      document: StreamableProductInventoryQuery,
      variables,
      customerAccessToken,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate: 60 } },
    });

    return data.site.product;
  },
);

// Fields that require currencyCode as a query variable
// Separated from the rest to cache separately
const ProductPricingAndRelatedProductsQuery = graphql(
  `
    query ProductPricingAndRelatedProductsQuery(
      $entityId: Int!
      $optionValueIds: [OptionValueId!]
      $useDefaultOptionSelections: Boolean
      $currencyCode: currencyCode
    ) {
      site {
        product(
          entityId: $entityId
          optionValueIds: $optionValueIds
          useDefaultOptionSelections: $useDefaultOptionSelections
        ) {
          ...PricingFragment
          relatedProducts(first: 8) {
            edges {
              node {
                ...FeaturedProductsCarouselFragment
              }
            }
          }
          # GI: products from the first category, used when there are no related products
          categories {
            edges {
              node {
                products(first: 8) {
                  edges {
                    node {
                      ...FeaturedProductsCarouselFragment
                    }
                  }
                }
              }
            }
          }

        }
      }
    }
  `,
  [PricingFragment, FeaturedProductsCarouselFragment],
);

export const getProductPricingAndRelatedProducts = cache(
  async (variables: Variables, customerAccessToken?: string) => {
    const { data } = await client.fetch({
      document: ProductPricingAndRelatedProductsQuery,
      variables,
      customerAccessToken,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
    });

    return data.site.product;
  },
);

const InventorySettingsQuery = graphql(`
  query InventorySettingsQuery {
    site {
      settings {
        inventory {
          defaultOutOfStockMessage
          showOutOfStockMessage
          stockLevelDisplay
          showBackorderAvailabilityPrompt
          backorderAvailabilityPrompt
          showQuantityOnBackorder
          showBackorderMessage
        }
      }
    }
  }
`);

export const getStreamableInventorySettingsQuery = cache(async (customerAccessToken?: string) => {
  const { data } = await client.fetch({
    document: InventorySettingsQuery,
    customerAccessToken,
    fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
  });

  return data.site.settings?.inventory;
});

// GI: inventory tracking and level come from the BigCommerce REST catalog (the Storefront API
// doesn't expose inventory_tracking).
export const getProductDataRest = cache(async (sku: string) => {
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v3/catalog/products?sku=${encodeURIComponent(sku)}`,
      {
        headers: {
          'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN,
        },
      },
    );

    const product = response.data.data[0];

    if (!product) {
      return null;
    }

    return product;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching product data from BigCommerce API:', error);

    return null;
  }
});

// GI: gift (free tool) promotions for a product and the gift products they offer.
export const getProductPromotionData = cache(async (entityId: number) => {
  try {
    const promotions = await getProductPromotions(entityId);

    if (!promotions || promotions.length === 0) {
      return { promotions, giftProducts: null };
    }

    const giftProductIds = promotions.flatMap((promo) =>
      promo.giftItems.filter((item) => item.productId).map((item) => item.productId as number),
    );

    const giftProducts = giftProductIds.length > 0 ? await getGiftProducts(giftProductIds) : null;

    return { promotions, giftProducts };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[page-data] Error loading promotions:', error);

    return { promotions: null, giftProducts: null };
  }
});
