import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/app/routes/routePaths';
import { useBusinessHome } from '@/features/business-home/model/useBusinessHome';

const BusinessHomePage: React.FC = () => {
  const { handleLogout } = useBusinessHome();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <Link to={ROUTE_PATHS.home} className="font-bold text-xl text-blue-700 tracking-tight">
            AIFlow Connect
          </Link>

          <Link
            className="text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1 font-label-md text-label-md"
            to={ROUTE_PATHS.home}
          >
            Home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Verify account
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
          <div className="p-4">
            <h2 className="text-[11px] font-bold text-slate-400 tracking-wider mb-4 px-2 uppercase">
              Dashboard
            </h2>
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-3 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                Overview
              </a>
              <a
                href="#"
                className="flex items-center justify-between text-slate-500 hover:bg-slate-50 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">work_outline</span>
                  Jobs
                </div>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </a>
              <a
                href="#"
                className="flex items-center justify-between text-slate-500 hover:bg-slate-50 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                  Experts
                </div>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </a>
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200 space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Settings
            </a>
            <a
              href="#"
              className="flex items-center gap-3 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
              Help Center
            </a>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-[#EEF2FF] border-l-4 border-blue-600 rounded-r-lg p-6 flex items-start justify-between mb-8">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-blue-600 text-2xl">hourglass_empty</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Profile pending verification</h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    We are reviewing your company information. This process usually takes 24-48 hours.
                    During this time, posting jobs and contacting experts are temporarily locked.
                  </p>
                </div>
              </div>
              <button className="bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 transition-colors">
                Contact support
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Overview</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-4">Open jobs</div>
                      <div className="text-4xl font-bold text-slate-900 mb-6">0</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Verification required to post
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-4">Total spend</div>
                      <div className="text-4xl font-bold text-slate-900 mb-6">$0</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        No transactions yet
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-4">Experts hired</div>
                      <div className="text-4xl font-bold text-slate-900 mb-6">0</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        No hires yet
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Next steps</h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#EEF2FF] p-5 flex items-start gap-4 border-b border-white border-b-2">
                      <span className="material-symbols-outlined text-blue-600 mt-0.5">check_circle</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Account registration</h4>
                        <p className="text-xs text-slate-500 mt-1">Completed at 10:30 AM today</p>
                      </div>
                    </div>

                    <div className="bg-[#EEF2FF] p-5 flex items-start gap-4 border-b border-slate-200">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5">
                        radio_button_unchecked
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">Complete company profile</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Add your logo, description, and website to attract better talent.
                        </p>
                      </div>
                      <button className="text-sm font-bold text-blue-700 hover:underline">Update</button>
                    </div>

                    <div className="bg-white p-5 flex items-start gap-4 opacity-60">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5">
                        radio_button_unchecked
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">Add payment method</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Required before you can start hiring experts.
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">lock</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-xl p-6 h-full flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                      Discover
                      <br />
                      experts
                    </h3>
                    <span className="material-symbols-outlined text-slate-400">lock</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Preview top AI experts in our network before your profile is fully verified.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div className="border border-slate-200 p-4 rounded-lg">
                      <div className="flex gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-md shrink-0"></div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Dr. Elena Rostova</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Machine Learning Engineer, OpenAI</p>
                        </div>
                      </div>
                      <button
                        disabled
                        className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-2 rounded-md cursor-not-allowed"
                      >
                        Verification required
                      </button>
                    </div>

                    <div className="border border-slate-200 p-4 rounded-lg">
                      <div className="flex gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-md shrink-0"></div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Marcus Chen</h4>
                          <p className="text-xs text-slate-500 mt-0.5">NLP and LLM Specialist</p>
                        </div>
                      </div>
                      <button
                        disabled
                        className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-2 rounded-md cursor-not-allowed"
                      >
                        Verification required
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-200 text-center">
                    <a href="#" className="text-sm font-bold text-blue-700 hover:underline">
                      View all experts
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="h-14 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between px-6 shrink-0 text-xs text-slate-500 font-medium">
        <div className="font-bold text-slate-900 text-lg">AIFlow Connect</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-900">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-900">
            Terms of Service
          </a>
          <a href="#" className="hover:text-slate-900">
            Cookie Policy
          </a>
          <a href="#" className="hover:text-slate-900">
            Security
          </a>
        </div>
        <div>© 2026 AIFlow Connect. Precision Outsourcing for Enterprise.</div>
      </footer>
    </div>
  );
};

export default BusinessHomePage;
