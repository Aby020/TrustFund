import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] text-[var(--color-primary)] mb-16">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--color-secondary)] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-md">1</div>
            <h3 className="text-xl font-bold font-['Outfit'] mb-4 text-[var(--color-foreground)]">Choose a Cause</h3>
            <p className="text-gray-600 font-['Work_Sans']">Browse verified campaigns and organizations that align with your values.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--color-secondary)] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-md">2</div>
            <h3 className="text-xl font-bold font-['Outfit'] mb-4 text-[var(--color-foreground)]">Contribute Securely</h3>
            <p className="text-gray-600 font-['Work_Sans']">Donate using encrypted, seamless payment processing.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--color-secondary)] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-md">3</div>
            <h3 className="text-xl font-bold font-['Outfit'] mb-4 text-[var(--color-foreground)]">Track Impact</h3>
            <p className="text-gray-600 font-['Work_Sans']">Receive real-time updates and see exactly where your donation went.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
