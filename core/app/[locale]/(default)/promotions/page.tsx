import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Promotions & Deals',
  description: 'Discover amazing deals and limited-time offers on our best products',
};

export default function PromotionsPage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-10">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">Exclusive Deals & Promotions</h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">
          Save big on our best products with limited-time offers and special promotions
        </p>
      </div>

      {/* Coming Soon Message */}
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Flash Sale</h2>
        <p className="mb-8 text-lg text-gray-600">
          Limited time deals on our best products - don&apos;t miss out!
        </p>
        <p className="text-gray-500">Check back soon for amazing deals and promotions!</p>
      </div>
    </div>
  );
}
