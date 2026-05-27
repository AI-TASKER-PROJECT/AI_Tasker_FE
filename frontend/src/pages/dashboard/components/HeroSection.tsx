import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="hero-gradient pt-xl pb-lg px-margin-mobile md:px-margin-desktop text-on-primary relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-center mb-sm">
          AIFlow Connect - Connect with elite AI experts
        </h1>
        <p className="text-center font-body-lg text-body-lg opacity-90 mb-xl max-w-2xl mx-auto">
          Find the perfect AI talent or your next breakthrough role in the
          rapidly evolving world of artificial intelligence.
        </p>

        {/* Search Bar */}
        <div className="bg-surface text-on-surface rounded-xl p-2 flex flex-col md:flex-row shadow-lg max-w-4xl mx-auto items-center gap-2 border border-outline-variant">
          <div className="flex-1 flex items-center px-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-outline-variant pb-2 md:pb-0">
            <span className="material-symbols-outlined text-secondary mr-2">
              search
            </span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md outline-none text-on-surface placeholder-secondary"
              placeholder="business analyst, machine learning..."
              type="text"
            />
            <button className="text-secondary hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div className="flex-1 flex items-center px-4 w-full md:w-auto py-2 md:py-0">
            <span className="material-symbols-outlined text-secondary mr-2">
              location_on
            </span>
            <select className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md outline-none text-on-surface cursor-pointer appearance-none">
              <option>Location</option>
              <option>Remote</option>
              <option>New York</option>
              <option>San Francisco</option>
            </select>
            <span className="material-symbols-outlined text-secondary pointer-events-none">
              expand_more
            </span>
          </div>
          <button className="w-full md:w-auto bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg flex items-center justify-center gap-2 tactile-btn hover:bg-on-primary-fixed-variant whitespace-nowrap">
            <span className="material-symbols-outlined">search</span>
            Search
          </button>
        </div>
      </div>

      {/* Decorative bg elements */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary-fixed rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-80 h-80 bg-tertiary-fixed rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
    </section>
  );
};

export default HeroSection;
