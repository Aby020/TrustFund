import React from 'react';

const FinalCta: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white py-32 px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold font-['Outfit'] mb-6 tracking-tight">
          Ready to Make a Difference?
        </h2>
        <p className="text-xl md:text-2xl mb-10 opacity-90 font-['Work_Sans'] max-w-2xl mx-auto">
          Join thousands of transparent givers building a better world, one donation at a time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-10 py-5 bg-white text-[var(--color-primary)] rounded-md hover:bg-gray-100 transition-colors font-bold text-lg shadow-xl cursor-pointer">
            Start Giving Now
          </button>
          <button className="px-10 py-5 border-2 border-white text-white rounded-md hover:bg-white hover:text-[var(--color-primary)] transition-colors font-bold text-lg cursor-pointer">
            Learn How It Works
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCta;
