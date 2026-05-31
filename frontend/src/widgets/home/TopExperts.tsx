import React from 'react';

const TopExperts: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg pb-xl border-t border-outline-variant">
      <div className="flex justify-between items-end mb-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary flex items-center gap-2">
            Top AI Experts
            <span className="text-secondary font-body-md text-body-md font-normal bg-surface-container-low px-2 py-1 rounded-lg text-sm ml-2">
              Recommended by AI
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <select className="bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none tactile-btn cursor-pointer">
            <option>Filter: Location</option>
            <option>Remote</option>
          </select>
          <button className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container-low text-secondary tactile-btn">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg tactile-btn hover:bg-on-primary-fixed-variant">
            Random
          </button>
          <button className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors tactile-btn">
            New York
          </button>
          <button className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors tactile-btn">
            San Francisco
          </button>
        </div>
      </div>

      <div className="bg-primary-fixed-dim text-on-primary-fixed p-3 rounded-lg mb-lg flex items-center gap-2 border border-primary-fixed shadow-sm">
        <span className="material-symbols-outlined text-primary">
          lightbulb
        </span>
        <span className="font-body-md text-body-md">
          <strong>Hint:</strong> Hover over the job title to see more detailed
          information.
        </span>
        <button className="ml-auto text-primary hover:text-on-primary-fixed">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 tactile-card flex flex-col h-full relative group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary font-bold text-xl border border-outline-variant group-hover:border-primary transition-colors">
              AI
            </div>
            <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded-lg text-xs font-medium">
              New
            </span>
          </div>
          <h4 className="font-headline-md text-headline-md mb-1 group-hover:text-primary transition-colors cursor-pointer">
            Senior Prompt Engineer
          </h4>
          <p className="font-body-md text-body-md text-secondary mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">business</span>{' '}
            TechCorp Solutions
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              LLMs
            </span>
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              Python
            </span>
          </div>
          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  location_on
                </span>{' '}
                Remote
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  payments
                </span>{' '}
                $120k - $150k
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  schedule
                </span>{' '}
                6+ Months
              </span>
            </div>
            <button className="w-full bg-surface text-primary border border-primary font-label-md text-label-md py-2 rounded-lg hover:bg-primary-fixed transition-colors tactile-btn">
              Apply Now
            </button>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 tactile-card flex flex-col h-full relative group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary font-bold text-xl border border-outline-variant group-hover:border-primary transition-colors">
              DS
            </div>
          </div>
          <h4 className="font-headline-md text-headline-md mb-1 group-hover:text-primary transition-colors cursor-pointer">
            Data Scientist, GenAI
          </h4>
          <p className="font-body-md text-body-md text-secondary mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">business</span>{' '}
            Innovate AI
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              PyTorch
            </span>
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              NLP
            </span>
          </div>
          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  location_on
                </span>{' '}
                New York, NY
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">work</span>{' '}
                Full-time
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  schedule
                </span>{' '}
                Permanent
              </span>
            </div>
            <button className="w-full bg-surface text-primary border border-primary font-label-md text-label-md py-2 rounded-lg hover:bg-primary-fixed transition-colors tactile-btn">
              Apply Now
            </button>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 tactile-card flex flex-col h-full relative group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary font-bold text-xl border border-outline-variant group-hover:border-primary transition-colors">
              ML
            </div>
            <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded-lg text-xs font-medium">
              Hot
            </span>
          </div>
          <h4 className="font-headline-md text-headline-md mb-1 group-hover:text-primary transition-colors cursor-pointer">
            Lead Machine Learning Eng.
          </h4>
          <p className="font-body-md text-body-md text-secondary mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">business</span>{' '}
            Quantum Robotics
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              TensorFlow
            </span>
            <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md font-label-sm text-label-sm border border-outline-variant">
              AWS
            </span>
          </div>
          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  location_on
                </span>{' '}
                San Francisco, CA
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  payments
                </span>{' '}
                Competitive
              </span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  schedule
                </span>{' '}
                12+ Months
              </span>
            </div>
            <button className="w-full bg-surface text-primary border border-primary font-label-md text-label-md py-2 rounded-lg hover:bg-primary-fixed transition-colors tactile-btn">
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopExperts;
