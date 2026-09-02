import React from 'react';

const ImpactStory: React.FC = () => {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="w-full md:w-1/2">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img src="/images/impact-story.jpg" alt="Impact Story" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-[var(--color-primary)] opacity-20"></div>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <div className="w-12 h-1 bg-[var(--color-accent)] mb-6"></div>
          <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] text-[var(--color-primary)] mb-6 leading-tight">
            "Because of you, 500 families have access to clean water this year."
          </h2>
          <p className="text-lg text-gray-600 mb-8 font-['Work_Sans'] italic">
            A personal story from the ground, proving the real-world change you're making possible.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
              <img src="/images/avatar.jpg" alt="Sarah Jenkins" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-[var(--color-foreground)]">Sarah Jenkins</div>
              <div className="text-sm text-gray-500">Director, Global Wells</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactStory;
