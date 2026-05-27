import React from 'react';

const MarketStats: React.FC = () => {
  return (
    <div className="bg-tertiary-container text-on-tertiary-container rounded-xl p-md flex flex-col md:flex-row items-center justify-between border-l-4 border-tertiary shadow-sm tactile-card">
      <div className="flex items-center gap-3 mb-4 md:mb-0">
        <span className="material-symbols-outlined text-3xl">work_history</span>
        <div>
          <h3 className="font-headline-md text-headline-md">
            Job Market Today
          </h3>
          <p className="font-body-md text-body-md opacity-80">26/05/2026</p>
        </div>
      </div>
      <div className="flex items-center gap-lg">
        <div className="text-center">
          <span className="block font-label-md text-label-md opacity-80 uppercase tracking-wider mb-1">
            Active Jobs
          </span>
          <span className="font-headline-lg text-headline-lg">54,325</span>
        </div>
        <div className="w-px h-12 bg-on-tertiary-container opacity-20"></div>
        <div className="text-center">
          <span className="block font-label-md text-label-md opacity-80 uppercase tracking-wider mb-1">
            New Today
          </span>
          <span className="font-headline-lg text-headline-lg">3,905</span>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
