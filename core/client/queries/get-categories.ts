import axios from 'axios';
import { cache } from 'react';

interface GetCategoriesByIdsResponse {
  status: 'success' | 'error';
  categories?: {
    category_id: number;
    name: string;
    description: string;
    image_url?: string;
    url: {
      path: string;
    };
  }[];
  error?: string;
}

const getCategoriesByIds = cache(
  async (entityIds: number[]): Promise<GetCategoriesByIdsResponse> => {
    const ids = entityIds.join(','); // Convert array to comma-separated string

    try {
      const response = await axios.get(
        `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v3/catalog/trees/categories?category_id:in=${ids}`,
        {
          headers: {
            'X-Auth-Token': process.env.BIGCOMMERCE_API_ACCESS_TOKEN ?? '',
            'Content-Type': 'application/json',
          },
        },
      );

      const { data } = response.data;

      return {
        status: 'success',
        categories: data,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { status: 'error', error: error.message };
      }

      return { status: 'error', error: 'Something went wrong. Please try again.' };
    }
  },
);

export { getCategoriesByIds };
