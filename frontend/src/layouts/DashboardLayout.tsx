import React from 'react';

interface DashboardLayoutProps {
  children?: React.ReactNode; // Hoặc sử dụng <Outlet /> từ react-router-dom
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="bg-background text-on-background font-body-md antialiased pt-16 min-h-screen flex flex-col">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop bg-surface dark:bg-on-surface h-16 border-b border-outline-variant dark:border-outline shadow-sm dark:shadow-none">
        <div className="flex items-center gap-lg">
          <a
            className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed flex items-center gap-2"
            href="#"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              api
            </span>
            AIFlow Connect
          </a>
          <div className="hidden md:flex items-center gap-md">
            <a
              className="text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1 font-label-md text-label-md"
              href="#"
            >
              Jobs
            </a>
            <a
              className="text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed transition-colors font-label-md text-label-md hover:bg-surface-container-low dark:hover:bg-surface-variant px-2 py-1 rounded-lg"
              href="#"
            >
              Experts
            </a>
            <a
              className="text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed transition-colors font-label-md text-label-md hover:bg-surface-container-low dark:hover:bg-surface-variant px-2 py-1 rounded-lg"
              href="#"
            >
              Dashboard
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors h-10 w-10 rounded-full hover:bg-surface-container-low active:translate-y-0.5 active:shadow-inner">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="hidden md:flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors h-10 w-10 rounded-full hover:bg-surface-container-low active:translate-y-0.5 active:shadow-inner">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="flex items-center gap-2 ml-2 border-l border-outline-variant pl-4">
            <a
              className="font-label-md text-label-md text-primary px-4 py-2 rounded-lg border border-primary hover:bg-primary-fixed transition-colors"
              href="#"
            >
              Sign In
            </a>
            <a
              className="font-label-md text-label-md bg-primary text-on-primary px-4 py-2 rounded-lg tactile-btn hover:bg-on-primary-fixed-variant"
              href="#"
            >
              Register
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Body */}
      <div className="flex-grow">{children}</div>

      {/* Footer */}
      <footer className="w-full py-lg px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-gutter bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant dark:border-outline flat no shadows mt-auto">
        <div className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined">api</span> AIFlow Connect
        </div>
        <div className="font-body-md text-body-md text-on-surface-variant opacity-80">
          © 2024 AIFlow Connect. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a
            className="text-on-surface-variant dark:text-surface-variant hover:text-primary font-label-sm text-label-sm hover:underline decoration-primary transition-all"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-on-surface-variant dark:text-surface-variant hover:text-primary font-label-sm text-label-sm hover:underline decoration-primary transition-all"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-on-surface-variant dark:text-surface-variant hover:text-primary font-label-sm text-label-sm hover:underline decoration-primary transition-all"
            href="#"
          >
            Support Center
          </a>
          <a
            className="text-on-surface-variant dark:text-surface-variant hover:text-primary font-label-sm text-label-sm hover:underline decoration-primary transition-all"
            href="#"
          >
            Documentation
          </a>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
