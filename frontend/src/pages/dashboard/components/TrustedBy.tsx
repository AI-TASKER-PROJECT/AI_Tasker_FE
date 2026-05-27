import React from 'react';

const TrustedBy: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8 border-b border-outline-variant">
      <p className="text-center font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-6">
        Trusted by leading tech companies
      </p>
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
        <div className="flex items-center gap-2 font-headline-md font-bold text-on-surface">
          <span className="material-symbols-outlined text-3xl">language</span>{' '}
          GlobalTech
        </div>
        <div className="flex items-center gap-2 font-headline-md font-bold text-on-surface">
          <span className="material-symbols-outlined text-3xl">hub</span>{' '}
          NexusAI
        </div>
        <div className="flex items-center gap-2 font-headline-md font-bold text-on-surface">
          <span className="material-symbols-outlined text-3xl">
            rocket_launch
          </span>{' '}
          StartupX
        </div>
        <div className="flex items-center gap-2 font-headline-md font-bold text-on-surface">
          <span className="material-symbols-outlined text-3xl">insights</span>{' '}
          DataFlow
        </div>
        <div className="flex items-center gap-2 font-headline-md font-bold text-on-surface">
          <span className="material-symbols-outlined text-3xl">memory</span>{' '}
          QuantumSys
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
