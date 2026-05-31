import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <section className="bg-surface-container-lowest py-xl px-margin-mobile md:px-margin-desktop border-t border-outline-variant">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-lg">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-4">
            How AIFlow Connect Works
          </h2>
          <p className="font-body-lg text-body-lg text-secondary max-w-2xl mx-auto">
            A seamless experience designed specifically for the unique needs of
            AI talent and the companies that hire them.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          {/* For Experts */}
          <div className="bg-surface rounded-xl p-8 border border-outline-variant tactile-card relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary-fixed rounded-full opacity-20 filter blur-2xl"></div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined">engineering</span>
              </div>
              <h3 className="font-headline-md text-headline-md">
                For AI Experts
              </h3>
            </div>
            <ul className="space-y-6 relative z-10">
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Create your profile
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Highlight your specific AI skills, models you've worked
                    with, and past projects.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold flex-shrink-0">
                  2
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Get matched automatically
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Our AI matches your unique skillset to perfectly suited
                    roles and projects.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold flex-shrink-0">
                  3
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Connect and collaborate
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Interview directly with decision-makers and start your next
                    big AI initiative.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div className="bg-surface rounded-xl p-8 border border-outline-variant tactile-card relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-tertiary-fixed rounded-full opacity-20 filter blur-2xl"></div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined">domain</span>
              </div>
              <h3 className="font-headline-md text-headline-md">
                For Businesses
              </h3>
            </div>
            <ul className="space-y-6 relative z-10">
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Post your requirements
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Define the exact AI capabilities, tech stack, and experience
                    level you need.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold flex-shrink-0">
                  2
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Review vetted talent
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Receive a curated list of top-tier AI professionals who
                    perfectly match your criteria.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold flex-shrink-0">
                  3
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold mb-1">
                    Hire and scale
                  </h4>
                  <p className="font-body-md text-body-md text-secondary">
                    Onboard talent quickly and efficiently to accelerate your AI
                    roadmap.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
