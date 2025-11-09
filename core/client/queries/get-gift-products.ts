import { cache } from 'react';

import { client } from '..';
import { graphql } from '../graphql';

const GetGiftProductsQuery = graphql(`
  query GetGiftProductsQuery($productIds: [Int!]!) {
    site {
      products(entityIds: $productIds, first: 50) {
        edges {
          node {
            entityId
            name
            defaultImage {
              urlOriginal
              altText
            }
            variants(first: 50) {
              edges {
                node {
                  entityId
                  defaultImage {
                    urlOriginal
                    altText
                  }
                  productOptions {
                    edges {
                      node {
                        displayName
                        ... on MultipleChoiceOption {
                          values {
                            edges {
                              node {
                                label
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export interface GiftProduct {
  entityId: number;
  name: string;
  imageUrl?: string;
  variants?: Array<{
    entityId: number;
    imageUrl?: string;
    optionLabel?: string;
  }>;
}

export const getGiftProducts = cache(async (productIds: number[]): Promise<GiftProduct[]> => {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  try {
    const { data } = await client.fetch({
      document: GetGiftProductsQuery,
      variables: { productIds },
      fetchOptions: {
        next: {
          revalidate: 3600, // Cache for 1 hour
        },
      },
    });

    return data.site.products.edges.map((edge) => {
      const product = edge.node;
      const variants = product.variants.edges.map((variantEdge) => {
        const variant = variantEdge.node;
        const optionLabel = variant.productOptions.edges
          .map((optionEdge) => {
            const option = optionEdge.node;

            if (option.__typename === 'MultipleChoiceOption') {
              return option.values?.edges.map((valueEdge) => valueEdge.node.label).join(', ');
            }

            return null;
          })
          .filter(Boolean)
          .join(' - ');

        return {
          entityId: variant.entityId,
          imageUrl: variant.defaultImage?.urlOriginal,
          optionLabel,
        };
      });

      return {
        entityId: product.entityId,
        name: product.name,
        imageUrl: product.defaultImage?.urlOriginal,
        variants: variants.length > 0 ? variants : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching gift products:', error);

    return [];
  }
});
