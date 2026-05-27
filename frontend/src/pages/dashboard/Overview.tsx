import React from 'react';
import HeroSection from './components/HeroSection';
import TrustedBy from './components/TrustedBy';
import CategoriesSidebar from './components/CategoriesSidebar';
import PromoBanner from './components/PromoBanner';
import MarketStats from './components/MarketStats';
import TopJobs from './components/TopJobs';
import HowItWorks from './components/HowItWorks';

const Overview: React.FC = () => {
  return (
    <>
      {/* 1. Khu vực Hero & Đối tác */}
      <HeroSection />
      <TrustedBy />

      {/* 2. Khu vực Nội dung chính (Layout Grid) */}
      <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Sidebar bên trái */}
        <CategoriesSidebar />

        {/* Khối nội dung bên phải */}
        <div className="lg:col-span-9 space-y-md">
          <PromoBanner />
          <MarketStats />
        </div>
      </main>

      {/* 3. Danh sách công việc */}
      <TopJobs />

      {/* 4. Khối hướng dẫn quy trình */}
      <HowItWorks />

      {/* 5. Nhóm nút chức năng nổi (Floating Buttons) */}
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

export default Overview;
