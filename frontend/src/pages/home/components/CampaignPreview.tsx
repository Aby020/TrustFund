import React from 'react';

const CampaignPreview: React.FC = () => {
  const mockCampaigns = [
    { id: 1, title: "Water for All", org: "Global Wells", progress: 75, image: "/images/placeholder-campaign.jpg" },
    { id: 2, title: "Literacy First", org: "Books4Kids", progress: 40, image: "/images/placeholder-campaign.jpg" },
    { id: 3, title: "Green Future", org: "EcoRestore", progress: 90, image: "/images/placeholder-campaign.jpg" },
  ];

  return (
    <section className="bg-gray-50 py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] text-[var(--color-primary)] mb-4">Featured Campaigns</h2>
          <p className="text-lg text-gray-600 font-['Work_Sans']">Discover high-impact initiatives needing your support.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mockCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-gray-100 group">
              <div className="h-48 bg-gray-200 overflow-hidden relative">
                <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold font-['Outfit'] text-[var(--color-primary)] mb-2">{campaign.title}</h3>
                <p className="text-gray-500 text-sm mb-4 font-['Work_Sans']">{campaign.org}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="bg-[var(--color-accent)] h-2 rounded-full" style={{ width: `${campaign.progress}%` }}></div>
                </div>
                <div className="text-xs font-semibold text-[var(--color-accent)] text-right">{campaign.progress}% funded</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <button className="px-6 py-3 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium cursor-pointer">
            View All Campaigns
          </button>
        </div>
      </div>
    </section>
  );
};

export default CampaignPreview;
