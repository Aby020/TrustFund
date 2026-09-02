import React from 'react';

const TrustStrip: React.FC = () => {
  return (
    <section className="bg-[var(--color-muted)] py-8 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-[var(--color-foreground)] opacity-80">
        <div className="flex items-center gap-2 font-medium text-lg">
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]"></span>
          100% Transparent
        </div>
        <div className="flex items-center gap-2 font-medium text-lg">
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]"></span>
          Secure Payments
        </div>
        <div className="flex items-center gap-2 font-medium text-lg">
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]"></span>
          Verified Charities
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
