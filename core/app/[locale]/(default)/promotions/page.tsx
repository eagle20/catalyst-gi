import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Promotions');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PromotionsPage() {
  const t = await getTranslations('Promotions');

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-10">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">{t('heroDescription')}</p>
      </div>

      {/* Coming Soon Message */}
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">{t('flashSaleTitle')}</h2>
        <p className="mb-8 text-lg text-gray-600">{t('flashSaleDescription')}</p>
        <p className="text-gray-500">Check back soon for amazing deals and promotions!</p>
      </div>
    </div>
  );
}

export const runtime = 'edge';
