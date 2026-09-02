import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="bg-[var(--color-background)] text-[var(--color-foreground)] py-24 px-4 md:py-32 lg:py-48 flex flex-col items-center justify-center text-center min-h-[70vh]">
      <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold font-['Outfit'] tracking-tight mb-6 text-[var(--color-primary)]">
        Trust Fund Reimagined
      </h1>
      <p className="text-lg md:text-xl lg:text-2xl max-w-3xl mb-10 font-['Work_Sans'] text-[var(--color-muted)]">
        Transparent, secure, and impactful. See exactly where your generosity goes.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button className="px-8 py-4 bg-[var(--color-secondary)] text-white rounded-md hover:bg-opacity-90 transition-colors font-medium text-lg shadow-lg hover:shadow-xl cursor-pointer">
          Start a Campaign
        </button>
        <button className="px-8 py-4 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium text-lg cursor-pointer">
          Explore Causes
        </button>
      </div>
    </section>
  );
};

export default Hero;
