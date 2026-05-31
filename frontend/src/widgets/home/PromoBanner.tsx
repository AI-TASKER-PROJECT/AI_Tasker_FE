import React from 'react';

const PromoBanner: React.FC = () => {
  return (
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
      </div>
    </div>
  );
};

export default PromoBanner;
