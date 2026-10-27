import React from 'react';

export const Header: React.FC = () => {
  return (
    <header 
      className="w-full sticky top-0 z-40 select-none p-0 m-0 leading-none relative md:hidden pointer-events-none"
    >
      {/* Mobile Top Paper Strip (< md) */}
      <div className="relative w-full overflow-hidden">
        <img
          src="/PNG/1/Frame/daitren.png"
          alt="Milo Helios Header"
          className="w-full h-auto block object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/PNG/LOGO.png';
          }}
        />
        <img
          src="/PNG/1/Frame/LOGO.png"
          alt="MILO Logo"
          className="absolute top-2 sm:top-2.5 right-3 sm:right-4 h-11 sm:h-13 w-auto object-contain drop-shadow-md z-10"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/PNG/LOGO.png';
          }}
        />
      </div>
    </header>
  );
};
