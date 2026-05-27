import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface relative overflow-hidden font-body-md text-on-surface">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary-fixed rounded-full mix-blend-overlay filter blur-3xl opacity-30"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-80 h-80 bg-tertiary-fixed rounded-full mix-blend-overlay filter blur-3xl opacity-30"></div>
      
      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo/Brand area */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>api</span>
          <span className="font-headline-lg text-headline-md font-bold text-primary">AIFlow Connect</span>
        </div>

        {/* The Card containing the specific auth form (Login/Register) */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant shadow-xl tactile-card">
          {children}
        </div>
        
        {/* Footer links */}
        <div className="mt-8 text-center text-sm font-label-sm text-secondary">
          <p>© 2024 AIFlow Connect. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;