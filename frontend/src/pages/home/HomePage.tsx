import React from 'react';
import CategoriesSidebar from '@/widgets/home/CategoriesSidebar';
import HeroSection from '@/widgets/home/HeroSection';
import HowItWorks from '@/widgets/home/HowItWorks';
import MarketStats from '@/widgets/home/MarketStats';
import PromoBanner from '@/widgets/home/PromoBanner';
import TopExperts from '@/widgets/home/TopExperts';
import TopJobs from '@/widgets/home/TopJobs';
import TrustedBy from '@/widgets/home/TrustedBy';

const HomePage: React.FC = () => {
  return (
    <>
      <HeroSection />
      <TrustedBy />

      <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <CategoriesSidebar />
        <div className="lg:col-span-9 space-y-md">
          <PromoBanner />
          <MarketStats />
        </div>
      </main>

      <TopJobs />
      <TopExperts />
      <HowItWorks />

      <div className="fixed right-4 bottom-24 flex flex-col gap-3 z-40">
        <button className="w-12 h-12 bg-surface rounded-full shadow-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low hover:-translate-y-1 transition-all">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
        </button>
        <button className="w-12 h-12 bg-surface rounded-full shadow-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low hover:-translate-y-1 transition-all relative">
          <span className="material-symbols-outlined">person_add</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-on-error rounded-full text-[10px] flex items-center justify-center font-bold">
            3
          </span>
        </button>
        <button className="w-12 h-12 bg-surface rounded-full shadow-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low hover:-translate-y-1 transition-all">
          <span className="material-symbols-outlined">verified</span>
        </button>
        <button className="w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:bg-on-primary-fixed-variant hover:-translate-y-1 transition-all tactile-btn mt-2">
          <span className="material-symbols-outlined">chat</span>
        </button>
      </div>
    </>
  );
};

export default HomePage;
