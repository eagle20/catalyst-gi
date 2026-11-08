'use client';

import {
  Checkbox,
  Combobox,
  Group,
  List,
  Number,
  Select,
  Style,
  TextInput,
} from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';
import { priceToStrings } from '~/lib/makeswift/utils/price-strings';
import { ProductCardSkeleton } from '~/vibes/soul/primitives/product-card';

import { searchProducts } from '../../utils/search-products';
import { useProductsByIds } from '../../utils/fetch-products';
import clsx from 'clsx';
import { FeaturedProductCard } from '@/vibes/soul/primitives/featured-product-card-git';
import { searchCategories } from '../../utils/search-categories';
import { useCategoriesByIds } from '../../utils/fetch-categories';
import { CategoryGridCard } from '../category-grid-git/category-grid-git.makeswift';

interface CategoryInterface {
  entityId?: string;
}

interface Props {
  className?: string;
  additionalProducts: ProductInterface[];
  categoryItem?: CategoryInterface;
  itemsPerRowSuperDesktop: string;
  itemsPerRowDesktop: string;
  itemsPerRowTablet: string;
  itemsPerRowMobile: string;
  aspectRatio?: '1:1' | '5:6' | '3:4';
  titleExcerptLength: number;
  descriptionExcerptLength: number;
}

interface ProductInterface {
  entityId?: string;
}

const DEFAULT_PRODUCT_IMAGE_URL =
  'https://betterineraction.nyc3.cdn.digitaloceanspaces.com/product-placeholder.svg';

function MakeswiftFeaturedProductsGridGIT({
  className,
  additionalProducts,
  itemsPerRowDesktop,
  itemsPerRowSuperDesktop,
  itemsPerRowTablet,
  itemsPerRowMobile,
  aspectRatio,
  titleExcerptLength,
  descriptionExcerptLength,
  ...props
}: Props) {
  const additionalProductIds = additionalProducts.map(({ entityId }) => entityId ?? '');
  const categoryId = props.categoryItem?.entityId;

  // Hooks run before any early return, so adding the first product or removing the last one in
  // the editor doesn't change the hook order.
  const { products, isLoading: isLoadingProducts } = useProductsByIds({
    productIds: additionalProductIds,
  });
  const { categories, isLoading: isLoadingCategories } = useCategoriesByIds({
    categoryIds: categoryId ? [categoryId] : [],
  });
  const category = categories && categories.length > 0 ? categories[0] : null;

  if (additionalProductIds.length === 0) {
    return (
      <div className={className}>
        <div className="my-5 py-10 text-center text-lg text-gray-500">
          <p>Please Start Adding Products</p>
        </div>
      </div>
    );
  }

  if (isLoadingProducts || isLoadingCategories) {
    return (
      <div
        className={clsx(
          'grid gap-5',
          `grid-cols-${itemsPerRowMobile}`, // mobile: 2 columns
          `sm:grid-cols-${itemsPerRowTablet}`, // tablet: 4 columns
          `lg:grid-cols-${itemsPerRowDesktop}`, // desktop: 6 columns
          `xl:grid-cols-${itemsPerRowSuperDesktop}`, // super desktop: 8 columns
          className,
        )}
      >
        {Array.from({ length: additionalProducts.length }).map((_, index) => (
          <ProductCardSkeleton key={index} className={className} />
        ))}
      </div>
    );
  }

  if (products == null || products.length === 0) {
    return (
      <div
        className={clsx(
          'grid gap-5',
          `grid-cols-${itemsPerRowMobile}`, // mobile: 2 columns
          `sm:grid-cols-${itemsPerRowTablet}`, // tablet: 4 columns
          `lg:grid-cols-${itemsPerRowDesktop}`, // desktop: 6 columns
          `xl:grid-cols-${itemsPerRowSuperDesktop}`, // super desktop: 8 columns
          className,
        )}
      >
        {Array.from({ length: additionalProducts.length }).map((_, index) => (
          <ProductCardSkeleton key={index} className={className} />
        ))}
      </div>
    );
  }

  const hasCategory = props.categoryItem && props.categoryItem.entityId;

  return (
    <div className="grid gap-5 xl:grid-cols-5">
      {hasCategory && category ? (
        <div className="col-span-5 sm:col-span-5 md:col-span-5 lg:col-span-1 xl:col-span-1">
          {/* Category Card */}
          <div className="h-full w-full">
            <CategoryGridCard
              key={category.id}
              id={category.id.toString()}
              name={category.name}
              href={category.path}
              imageAlt={category.name}
              imageUrl={category.image}
              productCount={category.productCount}
              fullHeight={true}
            />
          </div>
        </div>
      ) : null}
      <div
        className={clsx(
          hasCategory
            ? 'col-span-5 sm:col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-4'
            : 'col-span-5',
          'grid gap-5',
          `grid-cols-${itemsPerRowMobile}`, // mobile: 2 columns
          `sm:grid-cols-${itemsPerRowTablet}`, // tablet: 4 columns
          `lg:grid-cols-${itemsPerRowDesktop}`, // desktop: 6 columns
          `xl:grid-cols-${itemsPerRowSuperDesktop}`, // super desktop: 8 columns
          className,
        )}
      >
        {products.map((product, index) => {
          const { price, salePrice } = priceToStrings(product.price);

          return (
            <FeaturedProductCard
              key={product.id}
              className={className}
              image={product.image}
              name={product.title}
              // @ts-ignore
              rating={product.rating as number}
              // @ts-ignore
              reviewCount={product.reviewCount as number}
              description={typeof product.description === 'string' ? product.description : undefined}
              price={price}
              categories={product.categories ?? []}
              salePrice={salePrice}
              titleExcerptLength={titleExcerptLength}
              descriptionExcerptLength={descriptionExcerptLength}
              aspectRatio={aspectRatio}
              href={product.href}
              id={product.id}
              {...props}
            />
          );
        })}
      </div>
    </div>
  );
}

runtime.registerComponent(MakeswiftFeaturedProductsGridGIT, {
  type: 'catalog-product-featured-git',
  label: 'GIT / Featured Products (GIT)',
  props: {
    className: Style(),
    categoryItem: Group({
      label: 'Category',
      props: {
        entityId: Combobox({
          label: 'Category',
          async getOptions(query) {
            const categories = await searchCategories(query);

            return categories.map((category) => ({
              id: category.category_id.toString(),
              label: category.name,
              value: category.category_id.toString(),
            }));
          },
        }),
      },
    }),
    additionalProducts: List({
      label: 'Products',
      type: Group({
        label: 'Product',
        props: {
          entityId: Combobox({
            label: 'Product',
            async getOptions(query) {
              const products = await searchProducts(query);

              return products.map((product) => ({
                id: product.entityId.toString(),
                label: product.name,
                value: product.entityId.toString(),
              }));
            },
          }),
        },
      }),
      getItemLabel(product) {
        return 'Product';
      },
    }),
    aspectRatio: Select({
      label: 'Product Image aspect ratio',
      options: [
        { value: '1:1', label: 'Square' },
        { value: '5:6', label: '5:6' },
        { value: '3:4', label: '3:4' },
      ],
      defaultValue: '1:1',
    }),
    titleExcerptLength: Number({
      label: 'Title Excerpt Length',
      defaultValue: 35,
      min: 0,
      max: 100,
      step: 1,
    }),
    descriptionExcerptLength: Number({
      label: 'Description Excerpt Length',
      defaultValue: 50,
      min: 0,
      max: 500,
      step: 1,
    }),
    itemsPerRowSuperDesktop: Select({
      label: 'Items Per Row (Super Desktop)',
      defaultValue: '8',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
      ],
    }),
    itemsPerRowDesktop: Select({
      label: 'Items Per Row (Desktop)',
      defaultValue: '8',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
      ],
    }),
    itemsPerRowTablet: Select({
      label: 'Items Per Row (Tablet)',
      defaultValue: '4',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
      ],
    }),
    itemsPerRowMobile: Select({
      label: 'Items Per Row (Mobile)',
      defaultValue: '2',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
      ],
    }),
  },
});
