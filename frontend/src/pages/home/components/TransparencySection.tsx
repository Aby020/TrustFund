import React from 'react';

const TransparencySection: React.FC = () => {
  return (
    <section className="bg-[var(--color-primary)] text-white py-24 px-4">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] mb-8">Radical Transparency</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center w-full mt-12">
          <div className="p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
            <div className="text-4xl font-bold font-['Outfit'] mb-2 text-[var(--color-accent)]">100%</div>
            <div className="text-sm uppercase tracking-wider font-medium text-gray-200">To Charity</div>
          </div>
          <div className="p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
            <div className="text-4xl font-bold font-['Outfit'] mb-2 text-[var(--color-accent)]">$2.4M</div>
            <div className="text-sm uppercase tracking-wider font-medium text-gray-200">Funds Tracked</div>
          </div>
          <div className="p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
            <div className="text-4xl font-bold font-['Outfit'] mb-2 text-[var(--color-accent)]">5,000+</div>
            <div className="text-sm uppercase tracking-wider font-medium text-gray-200">Verified Outcomes</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransparencySection;
