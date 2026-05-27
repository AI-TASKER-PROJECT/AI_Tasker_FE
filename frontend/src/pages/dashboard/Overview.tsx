import React from 'react';

const Overview: React.FC = () => {
  return (
    <>
      {/* ================= INLINE IMAGE 1: HERO & TRUSTED BY ================= */}
      {/* Hero Section */}
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

      {/* Trusted By Section */}
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

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Sidebar Categories */}
        <aside className="lg:col-span-3">
          <div className="bg-surface rounded-xl border border-outline-variant p-4 tactile-card sticky top-24">
            <h3 className="font-headline-md text-headline-md mb-4 pb-2 border-b border-outline-variant">
              Categories
            </h3>
            <ul className="space-y-1">
              {[
                'Machine Learning',
                'Natural Language Processing',
                'Computer Vision',
                'Data Engineering',
                'Generative AI',
              ].map((category) => (
                <li key={category}>
                  <a
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors group"
                    href="#"
                  >
                    <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary">
                      {category}
                    </span>
                    <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-outline-variant flex justify-between items-center text-secondary">
              <span className="font-label-sm text-label-sm">Page 1/5</span>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container-low disabled:opacity-50 tactile-btn">
                  <span className="material-symbols-outlined text-sm">
                    chevron_left
                  </span>
                </button>
                <button className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center hover:bg-primary-fixed tactile-btn">
                  <span className="material-symbols-outlined text-sm">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Featured Content & Stats */}
        <div className="lg:col-span-9 space-y-md">
          {/* Promo Banner */}
          <div className="rounded-xl overflow-hidden relative min-h-[240px] flex items-center bg-inverse-surface text-on-primary tactile-card">
            <div className="absolute inset-0 z-0">
              <img
                alt="Two business professionals shaking hands in a futuristic digital environment"
                className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0krxLzsheCboCLL-i03GJm2kr4-cVY6f4SJixuqpn6KGyOsNHwvByKCSw1GZwtOvxyqCcF8cSfs_mi_8Tqg1KZH4r1UiHKGA4vl6It6n7Fxu_XM7Cx4b50TWzL-OQsHbxknUqgq5wxpzvn2TNgVCy6RgfZITdp1mAnVVBDQHJHbvmeM7YLipAFHLfiNqeCRTy--emo0hXflE84aGW_0sYpVq8WH6DcmXcvs5SfJbLg0xqMaI-2ynJYbj-D4vAJboDbgVmgAAcHL4"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/80 to-transparent"></div>
            </div>
            <div className="relative z-10 p-lg max-w-lg">
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-sm leading-tight">
                Gain the advantage, connect to success
              </h2>
              <p className="font-body-md text-body-md opacity-90 mb-md">
                AIFlow Connect - The leading AI human resources ecosystem.
              </p>
              <button className="bg-primary-fixed text-on-primary-fixed font-label-md text-label-md px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-primary hover:text-on-primary transition-colors tactile-btn">
                <span className="material-symbols-outlined">play_circle</span>{' '}
                Watch Video
              </button>
            </div>
          </div>

          {/* Market Stats Banner */}
          <div className="bg-tertiary-container text-on-tertiary-container rounded-xl p-md flex flex-col md:flex-row items-center justify-between border-l-4 border-tertiary shadow-sm tactile-card">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <span className="material-symbols-outlined text-3xl">
                work_history
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md">
                  Job Market Today
                </h3>
                <p className="font-body-md text-body-md opacity-80">
                  26/05/2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-lg">
              <div className="text-center">
                <span className="block font-label-md text-label-md opacity-80 uppercase tracking-wider mb-1">
                  Active Jobs
                </span>
                <span className="font-headline-lg text-headline-lg">
                  54,325
                </span>
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
        </div>
      </main>

      {/* ================= TOP JOBS SECTION ================= */}
      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg pb-xl border-t border-outline-variant">
        <div className="flex justify-between items-end mb-md">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary flex items-center gap-2">
              Best Jobs
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
              <span className="material-symbols-outlined text-sm">
                business
              </span>{' '}
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
              <span className="material-symbols-outlined text-sm">
                business
              </span>{' '}
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
                  <span className="material-symbols-outlined text-xs">
                    work
                  </span>{' '}
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
              <span className="material-symbols-outlined text-sm">
                business
              </span>{' '}
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

      {/* ================= INLINE IMAGE 2: HOW IT WORKS ================= */}
      <section className="bg-surface-container-lowest py-xl px-margin-mobile md:px-margin-desktop border-t border-outline-variant">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-lg">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-4">
              How AIFlow Connect Works
            </h2>
            <p className="font-body-lg text-body-lg text-secondary max-w-2xl mx-auto">
              A seamless experience designed specifically for the unique needs
              of AI talent and the companies that hire them.
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
                      Interview directly with decision-makers and start your
                      next big AI initiative.
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
                      Define the exact AI capabilities, tech stack, and
                      experience level you need.
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
                      Onboard talent quickly and efficiently to accelerate your
                      AI roadmap.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Buttons */}
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
