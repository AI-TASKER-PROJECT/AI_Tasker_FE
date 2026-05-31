import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/app/routes/routePaths';

const ChooseRolePage: React.FC = () => {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* Header riêng của trang Auth */}
      <header className="py-md px-margin-mobile md:px-margin-desktop flex justify-between items-center bg-white shadow-sm md:shadow-none">
        <div className="font-headline-md text-headline-md font-bold text-primary">
          <Link to={ROUTE_PATHS.dashboardOverview}>AIFlow Connect</Link>
        </div>
        <nav className="hidden md:flex gap-md">
          <a
            className="font-label-md text-label-md text-secondary hover:text-primary transition-colors"
            href="#"
          >
            Products
          </a>
          <a
            className="font-label-md text-label-md text-secondary hover:text-primary transition-colors"
            href="#"
          >
            Solutions
          </a>
          <a
            className="font-label-md text-label-md text-secondary hover:text-primary transition-colors"
            href="#"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-sm">
          <Link
            className="font-label-md text-label-md text-primary font-semibold"
            to={ROUTE_PATHS.login}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-xl px-margin-mobile md:px-margin-desktop container mx-auto">
        <div className="text-center mb-xl max-w-2xl mx-auto">
          <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface mb-sm">
            Choose Your Path
          </h1>
          <p className="font-body-lg text-body-lg text-secondary">
            Sign up to start building your autonomous future today.
          </p>
        </div>

        {/* Two Column Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter max-w-5xl mx-auto">
          {/* Business Column */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-tactile flex flex-col group hover:border-primary/30 transition-all duration-300">
            <div className="h-48 card-inner-ui p-sm overflow-hidden relative">
              <div className="bg-white rounded-lg shadow-sm p-base h-full border border-slate-100 flex flex-col gap-xs">
                <div className="flex items-center justify-between border-b border-slate-50 pb-xs">
                  <div className="flex items-center gap-xs">
                    <div className="h-2 w-24 bg-slate-100 rounded"></div>
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="h-4 w-12 bg-slate-50 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-sm pt-xs">
                  <div className="space-y-xs">
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="h-2 w-2/3 bg-slate-50 rounded"></div>
                    <div className="h-6 w-full bg-slate-100 rounded mt-xs"></div>
                  </div>
                  <div className="bg-slate-50 rounded-lg flex items-center justify-center p-xs aspect-square">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">
                      hub
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-lg flex flex-col flex-grow">
              <h2 className="font-headline-md text-headline-md mb-sm text-on-surface">
                I am a Business
              </h2>
              <p className="font-body-md text-body-md text-secondary mb-xl flex-grow">
                Hire elite AI talent and automate your workflows with custom AI
                agents.
              </p>
              <button className="btn-black w-full md:w-fit font-label-md text-label-md py-sm px-lg rounded-lg uppercase tracking-widest flex items-center justify-center gap-xs">
                <span>Register as Business</span>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </button>
            </div>
          </div>

          {/* Expert Column */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-tactile flex flex-col group hover:border-primary/30 transition-all duration-300">
            <div className="h-48 card-inner-ui p-sm overflow-hidden relative">
              <div className="bg-white rounded-lg shadow-sm p-base h-full border border-slate-100">
                <div className="space-y-sm">
                  <div className="flex justify-between items-center mb-xs">
                    <div className="flex gap-xs items-center">
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[12px]">
                          code
                        </span>
                      </div>
                      <div className="h-2 w-16 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-4 w-10 bg-green-100 rounded-full"></div>
                  </div>
                  <div className="p-xs bg-slate-50 rounded border border-slate-100">
                    <div className="flex items-start gap-xs">
                      <div className="w-8 h-8 rounded bg-slate-200 shrink-0"></div>
                      <div className="flex-grow space-y-xs">
                        <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
                        <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-xs">
                    <div className="h-5 w-1/3 bg-blue-50 rounded border border-blue-100"></div>
                    <div className="h-5 w-1/4 bg-slate-50 rounded border border-slate-100"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-lg flex flex-col flex-grow">
              <h2 className="font-headline-md text-headline-md mb-sm text-on-surface">
                I am an AI Expert
              </h2>
              <p className="font-body-md text-body-md text-secondary mb-xl flex-grow">
                Apply for high-stakes enterprise projects and build your AI
                specialist portfolio.
              </p>
              <button className="btn-black w-full md:w-fit font-label-md text-label-md py-sm px-lg rounded-lg uppercase tracking-widest flex items-center justify-center gap-xs">
                <span>Register as Expert</span>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-xl">
          <p className="font-body-md text-body-md text-secondary">
            Already have an account?{' '}
            <Link
              className="text-primary font-bold hover:underline"
              to={ROUTE_PATHS.login}
            >
              Sign In
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant py-lg px-margin-mobile md:px-margin-desktop mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="font-headline-md text-headline-md font-bold text-on-surface">
            AIFlow Connect
          </div>
          <div className="flex flex-wrap justify-center gap-md">
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              Support
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              Documentation
            </a>
          </div>
          <div className="font-body-md text-body-md text-secondary">
            © 2024 AIFlow Connect.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChooseRolePage;
