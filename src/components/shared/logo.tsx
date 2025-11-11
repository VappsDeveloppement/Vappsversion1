
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

export function Logo({ className }: { className?: string; text?: string; }) {
  const [logoText, setLogoText] = useState("VApps");

  useEffect(() => {
    // This function will run on the client side
    const updateLogoText = () => {
        const storedTitle = localStorage.getItem('appTitle');
        if (storedTitle) {
            setLogoText(storedTitle);
        }
    };

    // Initial update
    updateLogoText();

    // Listen for changes from other tabs/windows
    window.addEventListener('storage', updateLogoText);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('storage', updateLogoText);
    };
  }, []);

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Image src="/vapps.png" alt="VApps Logo" width={28} height={28} />
      <span className="text-2xl font-bold font-headline">{logoText}</span>
    </Link>
  );
}
