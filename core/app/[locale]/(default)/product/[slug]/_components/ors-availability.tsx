'use client';

import { useEffect, useState } from 'react';

interface ORSProduct {
  orsProduct: string;
  price: number;
  uom: string;
  totalAvailability?: number; // Summary endpoint
  warehouseAvailability?: number; // Warehouse endpoint
  warehouseLocation?: string; // Warehouse endpoint
}

interface Props {
  orsProductId: string | null;
}

export function ORSAvailability({ orsProductId }: Props) {
  const [data, setData] = useState<ORSProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orsProductId) {
      setLoading(false);
      return;
    }

    const fetchORSData = async () => {
      try {
        const response = await fetch(
          `/api/ors-availability?orsProductIds=${encodeURIComponent(orsProductId)}`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch ORS data');
        }

        const result = await response.json();

        if (result.products && result.products.length > 0) {
          // If warehouse data, sum up all warehouses for the same product
          const products = result.products;
          if (products[0].warehouseAvailability !== undefined) {
            // Warehouse endpoint - aggregate data
            const totalAvailability = products.reduce(
              (sum: number, p: ORSProduct) => sum + (p.warehouseAvailability || 0),
              0,
            );
            setData({
              orsProduct: products[0].orsProduct,
              price: products[0].price,
              uom: products[0].uom,
              totalAvailability,
            });
          } else {
            // Summary endpoint
            setData(result.products[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching ORS data:', err);
        setError('Unable to load wholesaler pricing');
      } finally {
        setLoading(false);
      }
    };

    void fetchORSData();
  }, [orsProductId]);

  if (!orsProductId || error) {
    return null;
  }

  if (loading) {
    return (
      <div className="my-4 animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="h-4 w-32 rounded bg-gray-200"></div>
        <div className="mt-2 h-3 w-48 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isInStock = (data.totalAvailability || 0) > 0;

  return (
    <div className={`my-4 rounded-lg border p-4 ${isInStock ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="space-y-1 text-sm">
        <p className={`font-semibold ${isInStock ? 'text-green-900' : 'text-red-900'}`}>
          {isInStock ? '✓ In Stock' : '✗ Out of Stock'}
        </p>
        {isInStock && (
          <p className="text-xs text-green-700">
            Available from supplier warehouse
          </p>
        )}
      </div>
    </div>
  );
}
