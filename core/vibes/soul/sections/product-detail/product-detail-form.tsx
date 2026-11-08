'use client';

import {
  FieldMetadata,
  FormProvider,
  FormStateInput,
  getFormProps,
  SubmissionResult,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { createSerializer, parseAsString, useQueryStates } from 'nuqs';
import {
  ReactNode,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useFormStatus } from 'react-dom';
import { z } from 'zod';

import { ButtonRadioGroup } from '@/vibes/soul/form/button-radio-group';
import { CardRadioGroup } from '@/vibes/soul/form/card-radio-group';
import { Checkbox } from '@/vibes/soul/form/checkbox';
import { DatePicker } from '@/vibes/soul/form/date-picker';
import { FormStatus } from '@/vibes/soul/form/form-status';
import { Input } from '@/vibes/soul/form/input';
import { NumberInput } from '@/vibes/soul/form/number-input';
import { RadioGroup } from '@/vibes/soul/form/radio-group';
import { Select } from '@/vibes/soul/form/select';
import { SwatchRadioGroup } from '@/vibes/soul/form/swatch-radio-group';
import { Textarea } from '@/vibes/soul/form/textarea';
import { Button } from '@/vibes/soul/primitives/button';
import { toast } from '@/vibes/soul/primitives/toaster';
import { useEvents } from '~/components/analytics/events';
import { usePathname, useRouter } from '~/i18n/routing';
import { getDisabledDates } from '~/lib/date-field-limits';

import { revalidateCart } from './actions/revalidate-cart';
import { FreeToolSelector } from './free-tool-selector';
import { Field, schema, SchemaRawShape } from './schema';

type Action<S, P> = (state: Awaited<S>, payload: P) => S | Promise<S>;

interface State<F extends Field> {
  fields: F[];
  lastResult: SubmissionResult | null;
  successMessage?: ReactNode;
}

export type ProductDetailFormAction<F extends Field> = Action<State<F>, FormData>;

export interface StockDisplayData {
  stockLevelMessage?: string | null;
  backorderAvailabilityPrompt?: string | null;
}

export interface BackorderDisplayData {
  availableOnHand: number;
  availableForBackorder: number;
  unlimitedBackorder: boolean;
  showQuantityOnBackorder: boolean;
  backorderMessage: string | null;
}

export interface ProductDetailFormProps<F extends Field> {
  fields: F[];
  action: ProductDetailFormAction<F>;
  productId: string;
  ctaLabel?: string;
  quantityLabel?: string;
  incrementLabel?: string;
  decrementLabel?: string;
  emptySelectPlaceholder?: string;
  ctaDisabled?: boolean;
  prefetch?: boolean;
  additionalActions?: ReactNode;
  minQuantity?: number;
  maxQuantity?: number;
  stockDisplayData?: StockDisplayData;
  backorderDisplayData?: BackorderDisplayData;
  // GI: REST inventory level (over-stock warning) and free-tool gift promotions.
  inventoryLevel?: { value: number } | null;
  promotions?: any;
  giftProducts?: any;
}

export function ProductDetailForm<F extends Field>({
  action,
  fields,
  productId,
  ctaLabel = 'Add to cart',
  quantityLabel = 'Quantity',
  incrementLabel = 'Increase quantity',
  decrementLabel = 'Decrease quantity',
  emptySelectPlaceholder = 'Select an option',
  ctaDisabled = false,
  prefetch = false,
  additionalActions,
  minQuantity,
  maxQuantity,
  stockDisplayData,
  backorderDisplayData,
  inventoryLevel,
  promotions,
  giftProducts,
}: ProductDetailFormProps<F>) {
  const router = useRouter();
  const pathname = usePathname();
  const events = useEvents();
  const t = useTranslations('Product.ProductDetails');

  const searchParams = fields.reduce<Record<string, typeof parseAsString>>((acc, field) => {
    return field.persist === true ? { ...acc, [field.name]: parseAsString } : acc;
  }, {});

  const [params] = useQueryStates(searchParams, { shallow: false });

  const onPrefetch = (fieldName: string, value: string) => {
    if (prefetch) {
      const serialize = createSerializer(searchParams);

      const newUrl = serialize(pathname, { ...params, [fieldName]: value });

      router.prefetch(newUrl);
    }
  };

  const defaultValue = fields.reduce<{
    [Key in keyof SchemaRawShape]?: z.infer<SchemaRawShape[Key]>;
  }>(
    (acc, field) => {
      // Checkbox field has to be handled separately because we want to convert checked or unchecked value to true or undefined respectively.
      // This is because the form expects a boolean value, but we want to store the checked or unchecked value in the query params.
      if (field.type === 'checkbox') {
        if (params[field.name] === field.checkedValue) {
          return {
            ...acc,
            [field.name]: 'true',
          };
        }

        if (params[field.name] === field.uncheckedValue) {
          return {
            ...acc,
            [field.name]: undefined,
          };
        }

        return {
          ...acc,
          [field.name]: field.defaultValue, // Default value is either 'true' or undefined
        };
      }

      return {
        ...acc,
        [field.name]: params[field.name] ?? field.defaultValue,
      };
    },
    { quantity: minQuantity ?? 1 },
  );

  const [{ lastResult }, formAction] = useActionState(action, {
    fields,
    lastResult: null,
  });

  useEffect(() => {
    if (lastResult?.status === 'success') {
      // GI: the success toast is shown on submit (see onSubmit below).
      startTransition(async () => {
        // This is needed to refresh the Data Cache after the product has been added to the cart.
        // The cart id is not picked up after the first time the cart is created/updated.
        await revalidateCart();
      });
    }
  }, [lastResult, router]);

  const [form, formFields] = useForm({
    lastResult,
    constraint: getZodConstraint(schema(fields, minQuantity, maxQuantity)),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: schema(fields, minQuantity, maxQuantity) });
    },
    onSubmit(event, { formData }) {
      event.preventDefault();

      // Use the product from props, not the hidden field, so editing the form can't add a different product.
      formData.set('id', productId);

      // GI: shown immediately because this form is rendered through an async Server Component
      // wrapper (Makeswift) that remounts on the post-action revalidation, so the client doesn't
      // reliably observe the success state transition.
      toast.success('Product added to cart successfully!');

      startTransition(() => {
        formAction(formData);

        events.onAddToCart?.(formData);
      });
    },
    // @ts-expect-error: `defaultValue` types are conflicting with `onValidate`.
    defaultValue,
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onInput',
  });

  const backorderMessages = useMemo(() => {
    const {
      availableForBackorder,
      availableOnHand,
      backorderMessage,
      showQuantityOnBackorder,
      unlimitedBackorder,
    } = backorderDisplayData || {
      availableForBackorder: 0,
      availableOnHand: 0,
      backorderMessage: null,
      showQuantityOnBackorder: false,
      unlimitedBackorder: false,
    };

    if (!showQuantityOnBackorder && !backorderMessage) {
      return undefined;
    }

    const orderQuantity = Number(formFields.quantity.value);

    if (orderQuantity > availableForBackorder + availableOnHand) {
      return {
        backOrderErrorMessage: t('maxPurchasableQuantity', {
          quantity: availableForBackorder + availableOnHand,
        }),
        backorderQuantityMessage: t('backorderQuantity', {
          quantity: unlimitedBackorder
            ? orderQuantity - availableOnHand
            : Math.min(orderQuantity - availableOnHand, availableForBackorder),
        }),
        backorderInfoMessage: undefined,
      };
    }

    if (Number.isNaN(orderQuantity) || orderQuantity <= availableOnHand) {
      return {
        backOrderErrorMessage: undefined,
        backorderQuantityMessage: undefined,
        backorderInfoMessage: undefined,
      };
    }

    if (!showQuantityOnBackorder) {
      return {
        backOrderErrorMessage: undefined,
        backorderQuantityMessage: undefined,
        backorderInfoMessage: backorderMessage ?? undefined,
      };
    }

    return {
      backOrderErrorMessage: undefined,
      backorderQuantityMessage: t('backorderQuantity', {
        quantity: unlimitedBackorder
          ? orderQuantity - availableOnHand
          : Math.min(orderQuantity - availableOnHand, availableForBackorder),
      }),
      backorderInfoMessage: backorderMessage ?? undefined,
    };
  }, [backorderDisplayData, formFields.quantity.value, t]);

  const quantityControl = useInputControl(formFields.quantity);

  // GI: free tool (gift) promotions
  const [selectedFreeToolId, setSelectedFreeToolId] = useState<number | undefined>();
  const [selectedFreeToolVariantId, setSelectedFreeToolVariantId] = useState<number | undefined>();
  const [selectedPromoCode, setSelectedPromoCode] = useState<string | undefined>();
  const [selectedPromotion, setSelectedPromotion] = useState<any | undefined>();
  const [freeToolError, setFreeToolError] = useState<string | undefined>();

  const currentQuantity = Number(quantityControl.value) || 1;

  // Promotions the current quantity qualifies for
  const eligiblePromotions =
    promotions?.filter((promo: any) => currentQuantity >= promo.minimumQuantity) || [];

  // Free tool options from eligible promotions only
  const freeToolOptions =
    eligiblePromotions && giftProducts && eligiblePromotions.length > 0
      ? eligiblePromotions.flatMap((promo: any) =>
          promo.giftItems
            .map((giftItem: any) => {
              const giftProduct = giftProducts.find((p: any) => p.entityId === giftItem.productId);

              if (!giftProduct) return null;

              // Variant-specific gift
              if (giftItem.variantId && giftProduct.variants) {
                const variant = giftProduct.variants.find(
                  (v: any) => v.entityId === giftItem.variantId,
                );

                return {
                  productId: giftProduct.entityId,
                  variantId: giftItem.variantId,
                  name: `${giftProduct.name}${variant?.optionLabel ? ` - ${variant.optionLabel}` : ''}`,
                  imageUrl: variant?.imageUrl || giftProduct.imageUrl,
                  promoCode: promo.promoCode,
                };
              }

              // Product-level gift
              return {
                productId: giftProduct.entityId,
                name: giftProduct.name,
                imageUrl: giftProduct.imageUrl,
                promoCode: promo.promoCode,
              };
            })
            .filter(Boolean),
        )
      : [];

  const handleFreeToolSelect = (toolProductId: number, variantId?: number) => {
    setSelectedFreeToolId(toolProductId);
    setSelectedFreeToolVariantId(variantId);

    const selectedTool = freeToolOptions.find(
      (tool: any) =>
        tool.productId === toolProductId && (variantId === undefined || tool.variantId === variantId),
    );

    if (selectedTool?.promoCode) {
      setSelectedPromoCode(selectedTool.promoCode);
    }

    const promo = eligiblePromotions.find((p: any) =>
      p.giftItems.some(
        (item: any) =>
          item.productId === toolProductId && (!item.variantId || item.variantId === variantId),
      ),
    );

    setSelectedPromotion(promo);
    setFreeToolError(undefined);
  };

  // Free tool quantity from the promotion rules and current quantity
  const freeToolQuantity = selectedPromotion
    ? selectedPromotion.applyOnce
      ? 1
      : Math.floor(currentQuantity / selectedPromotion.minimumQuantity)
    : 0;

  // Reset the free tool if the quantity no longer qualifies
  useEffect(() => {
    if (selectedFreeToolId && freeToolOptions.length === 0) {
      setSelectedFreeToolId(undefined);
      setSelectedFreeToolVariantId(undefined);
      setSelectedPromoCode(undefined);
      setSelectedPromotion(undefined);
      toast.info('Free gift removed - increase quantity to qualify');
    }
  }, [freeToolOptions.length, selectedFreeToolId]);

  const hasFreeToolPromotion = freeToolOptions.length > 0;

  return (
    <FormProvider context={form.context}>
      <FormStateInput />
      <form {...getFormProps(form)} action={formAction}>
        <input name="id" type="hidden" value={productId} />
        <input name="action" type="hidden" value="add" />
        {selectedFreeToolId && (
          <input name="freeToolProductId" type="hidden" value={selectedFreeToolId} />
        )}
        {selectedFreeToolVariantId && (
          <input name="freeToolVariantId" type="hidden" value={selectedFreeToolVariantId} />
        )}
        {freeToolQuantity > 0 && (
          <input name="freeToolQuantity" type="hidden" value={freeToolQuantity} />
        )}
        {selectedPromoCode && <input name="promoCode" type="hidden" value={selectedPromoCode} />}
        <div className="space-y-6 pb-8">
          {hasFreeToolPromotion && (
            <FreeToolSelector
              error={freeToolError}
              onSelect={handleFreeToolSelect}
              promotionName={eligiblePromotions[0]?.displayName}
              selectedToolId={selectedFreeToolId}
              tools={freeToolOptions}
            />
          )}
          {fields.map((field) => {
            return (
              <FormField
                emptySelectPlaceholder={emptySelectPlaceholder}
                field={field}
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                formField={formFields[field.name]!}
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                key={formFields[field.name]!.id}
                onPrefetch={onPrefetch}
              />
            );
          })}
          {form.errors?.map((error, index) => (
            <FormStatus className="pt-3" key={index} type="error">
              {error}
            </FormStatus>
          ))}

          <div className="h-[3.2rem] sm:h-[2.6rem]">
            {!!stockDisplayData?.stockLevelMessage && (
              <div
                className={clsx(
                  'flex flex-wrap justify-start gap-x-2.5 gap-y-2 text-sm text-[var(--product-detail-secondary-text,hsl(var(--contrast-500)))]',
                  'transition-transform duration-200 ease-in-out',
                  backorderMessages?.backorderQuantityMessage ||
                    backorderMessages?.backorderInfoMessage
                    ? 'translate-y-0'
                    : 'translate-y-[calc(100%+4px)]',
                )}
              >
                <div className="flex-none whitespace-nowrap font-semibold text-black">
                  {stockDisplayData.stockLevelMessage}
                </div>
                {!!stockDisplayData.backorderAvailabilityPrompt && (
                  <div className="flex-none whitespace-nowrap border-s border-gray-300 pl-2.5">
                    {stockDisplayData.backorderAvailabilityPrompt}
                  </div>
                )}
              </div>
            )}
            {!!backorderMessages && (
              <div
                className={clsx(
                  'mt-1 flex flex-wrap justify-start gap-x-2.5 gap-y-2 text-sm text-[var(--product-detail-secondary-text,hsl(var(--contrast-500)))]',
                  'ease-initial transition-opacity',
                  backorderMessages.backorderQuantityMessage ||
                    backorderMessages.backorderInfoMessage
                    ? 'duration-400 opacity-100'
                    : 'opacity-0 delay-0 duration-100',
                )}
              >
                <div className="flex-none whitespace-nowrap font-semibold text-black">
                  {backorderMessages.backorderQuantityMessage}
                </div>
                {!!backorderMessages.backorderInfoMessage && (
                  <div className="flex-none whitespace-nowrap border-s border-gray-300 pl-2.5">
                    {backorderMessages.backorderInfoMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-8 sm:gap-3">
            {/* GI: quantity full width on mobile, 2/8 on desktop */}
            <div className="col-span-1 w-full sm:col-span-2">
              <NumberInput
                aria-label={quantityLabel}
                buttonClassName="w-full"
                className="w-full"
                decrementLabel={decrementLabel}
                incrementLabel={incrementLabel}
                max={maxQuantity ?? 9999}
                min={minQuantity ?? 1}
                name={formFields.quantity.name}
                onBlur={quantityControl.blur}
                onChange={(e) => {
                  const valueToChangeTo = e.currentTarget.value;
                  const currentInventory = inventoryLevel?.value ?? 0;
                  const requestedQty = Number(valueToChangeTo);

                  // GI: warn when asking for more than is in stock; backorders are still allowed.
                  if (currentInventory > 0 && currentInventory < requestedQty) {
                    toast.error(
                      `Only ${currentInventory} units available in stock. You can order more for backorder.`,
                    );
                  }

                  quantityControl.change(valueToChangeTo);
                }}
                onFocus={quantityControl.focus}
                required
                value={quantityControl.value}
              />
            </div>
            {/* GI: buttons stacked on mobile, side by side on desktop */}
            <div className="col-span-1 flex w-full flex-col gap-3 sm:col-span-6 sm:flex-row">
              <SubmitButton disabled={ctaDisabled || !!backorderMessages?.backOrderErrorMessage}>
                {ctaLabel}
              </SubmitButton>
              <BuyNowButton productId={productId} quantity={quantityControl.value} />
              {additionalActions}
            </div>
          </div>

          {!!backorderMessages?.backOrderErrorMessage && (
            <FormStatus
              className="ease-initial duration-400 opacity-100 transition-opacity"
              type="error"
            >
              {backorderMessages.backOrderErrorMessage}
            </FormStatus>
          )}
          <p className="pt-2 text-sm text-gray-500">
            Buying in bulk?{' '}
            <a className="underline hover:text-gray-700" href="/contact">
              Contact us for a quote
            </a>
          </p>
        </div>
      </form>
    </FormProvider>
  );
}

function SubmitButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-auto @xl:w-56"
      disabled={disabled}
      loading={pending}
      size="medium"
      type="submit"
      variant="secondary"
    >
      {children}
    </Button>
  );
}

// GI: Buy Now goes straight to checkout via /api/buy-now.
function BuyNowButton({ productId, quantity }: { productId: string; quantity?: string }) {
  const [loading, setLoading] = useState(false);

  const handleBuyNow = () => {
    setLoading(true);

    const qty = Math.max(1, Number(quantity ?? '1'));

    window.location.href = `/api/buy-now?product_id=${encodeURIComponent(productId)}&quantity=${qty}`;
  };

  return (
    <Button
      className="w-auto @xl:w-56"
      loading={loading}
      onClick={handleBuyNow}
      size="medium"
      type="button"
      variant="primary"
    >
      Buy Now
    </Button>
  );
}


// eslint-disable-next-line complexity
function FormField({
  field,
  formField,
  onPrefetch,
  emptySelectPlaceholder,
}: {
  field: Field;
  formField: FieldMetadata<string | number | boolean | Date | undefined>;
  onPrefetch: (fieldName: string, value: string) => void;
  emptySelectPlaceholder?: string;
}) {
  const controls = useInputControl(formField);

  const [, setParams] = useQueryStates(
    field.persist === true ? { [field.name]: parseAsString.withOptions({ shallow: false }) } : {},
  );

  const handleChange = useCallback(
    (value: string) => {
      // Checkbox field has to be handled separately because we want to convert 'true' or '' to the checked or unchecked value respectively.
      if (field.type === 'checkbox') {
        void setParams({ [field.name]: value ? field.checkedValue : field.uncheckedValue });
      } else {
        void setParams({ [field.name]: value || null }); // Passing `null` to remove the value from the query params if fieldValue is falsey
      }

      controls.change(value || ''); // If fieldValue is falsey, we set it to an empty string
    },
    [setParams, field, controls],
  );

  const handleOnOptionMouseEnter = (value: string) => {
    if (field.persist === true) {
      onPrefetch(field.name, value);
    }
  };

  switch (field.type) {
    case 'number':
      return (
        <NumberInput
          decrementLabel={field.decrementLabel}
          errors={formField.errors}
          incrementLabel={field.incrementLabel}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onFocus={controls.focus}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'text':
      return (
        <Input
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onFocus={controls.focus}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'date':
      return (
        <DatePicker
          defaultValue={controls.value}
          disabledDays={getDisabledDates({ minDate: field.minDate, maxDate: field.maxDate })}
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onFocus={controls.focus}
          required={formField.required}
        />
      );

    case 'textarea':
      return (
        <Textarea
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          maxLength={field.maxLength}
          minLength={field.minLength}
          name={formField.name}
          onBlur={controls.blur}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onFocus={controls.focus}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          checked={controls.value === 'true'}
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onCheckedChange={(value) => handleChange(value ? 'true' : '')}
          onFocus={controls.focus}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'select':
      return (
        <Select
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onFocus={controls.focus}
          onOptionMouseEnter={handleOnOptionMouseEnter}
          onValueChange={handleChange}
          options={field.options}
          placeholder={emptySelectPlaceholder}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'radio-group':
      return (
        <RadioGroup
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onFocus={controls.focus}
          onOptionMouseEnter={handleOnOptionMouseEnter}
          onValueChange={handleChange}
          options={field.options}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'swatch-radio-group':
      return (
        <SwatchRadioGroup
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onFocus={controls.focus}
          onOptionMouseEnter={handleOnOptionMouseEnter}
          onValueChange={handleChange}
          options={field.options}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'card-radio-group':
      return (
        <CardRadioGroup
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onFocus={controls.focus}
          onOptionMouseEnter={handleOnOptionMouseEnter}
          onValueChange={handleChange}
          options={field.options}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );

    case 'button-radio-group':
      return (
        <ButtonRadioGroup
          errors={formField.errors}
          key={formField.id}
          label={field.label}
          name={formField.name}
          onBlur={controls.blur}
          onFocus={controls.focus}
          onOptionMouseEnter={handleOnOptionMouseEnter}
          onValueChange={handleChange}
          options={field.options}
          required={formField.required}
          value={controls.value ?? ''}
        />
      );
  }
}
