import React from 'react';

const CategoriesSidebar: React.FC = () => {
  const categories = [
    'Machine Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Data Engineering',
    'Generative AI',
  ];

  return (
    <aside className="lg:col-span-3">
      <div className="bg-surface rounded-xl border border-outline-variant p-4 tactile-card sticky top-24">
        <h3 className="font-headline-md text-headline-md mb-4 pb-2 border-b border-outline-variant">
          Categories
        </h3>
        <ul className="space-y-1">
          {categories.map((category) => (
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
  );
};

export default CategoriesSidebar;
