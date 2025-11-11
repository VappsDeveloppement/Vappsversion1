
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

export function Logo({ className }: { className?: string; text?: string; }) {
  const [logoText, setLogoText] = useState("VApps");
  const [logoSubtitle, setLogoSubtitle] = useState("Développement");
  const [logoSrc, setLogoSrc] = useState("/vapps.png");
  const [logoDisplay, setLogoDisplay] = useState("app-and-logo");
  const [logoWidth, setLogoWidth] = useState(40);
  const [logoHeight, setLogoHeight] = useState(40);

  useEffect(() => {
    // This function will run on the client side
    const updateLogo = () => {
        const storedTitle = localStorage.getItem('appTitle');
        const storedSubtitle = localStorage.getItem('appSubtitle');
        const storedLogoSrc = localStorage.getItem('logoDataUrl');
        const storedLogoDisplay = localStorage.getItem('logoDisplay');
        const storedLogoWidth = localStorage.getItem('logoWidth');
        const storedLogoHeight = localStorage.getItem('logoHeight');

        if (storedTitle) setLogoText(storedTitle);
        if (storedSubtitle) setLogoSubtitle(storedSubtitle);
        if (storedLogoSrc) setLogoSrc(storedLogoSrc);
        if (storedLogoDisplay) setLogoDisplay(storedLogoDisplay);
        if (storedLogoWidth) setLogoWidth(parseInt(storedLogoWidth, 10));
        if (storedLogoHeight) {
          setLogoHeight(parseInt(storedLogoHeight, 10))
        } else {
          setLogoHeight(parseInt(storedLogoWidth, 10)); // Fallback for proportional height
        }
    };

    // Initial update
    updateLogo();

    // Listen for changes from other tabs/windows
    window.addEventListener('storage', updateLogo);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('storage', updateLogo);
    };
  }, []);

  const showText = logoDisplay === 'app-and-logo';

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Image src={logoSrc} alt="VApps Logo" width={logoWidth} height={logoHeight} style={{ height: 'auto' }} />
      {showText && (
        <div className='flex items-baseline gap-2'>
          <span className="text-2xl font-bold font-headline">{logoText}</span>
          <span className="text-sm text-muted-foreground">{logoSubtitle}</span>
        </div>
      )}
    </Link>
  );
}
