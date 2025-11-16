
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import React from 'react';
import { useAgency } from '@/context/agency-provider';

export function Logo({ className }: { className?: string; text?: string; }) {
  const agencyContext = useAgency(); // This hook can now return undefined

  // Use personalization if context exists, otherwise use default values.
  const personalization = agencyContext?.personalization;
  const logoText = personalization?.appTitle || "VApps";
  const logoSubtitle = personalization?.appSubtitle || "Développement";
  const appTitleColor = personalization?.appTitleColor || "#000000";
  const appSubtitleColor = personalization?.appSubtitleColor || "#666666";
  const logoSrc = personalization?.logoDataUrl || "/vapps.png";
  const logoDisplay = personalization?.logoDisplay || "app-and-logo";
  const logoWidth = personalization?.logoWidth || 40;
  
  const showText = logoDisplay === 'app-and-logo';

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Image src={logoSrc} alt={`${logoText} Logo`} width={logoWidth} height={logoWidth} />
      {showText && (
        <div className='flex items-baseline gap-2'>
          <span className="text-2xl font-bold font-headline" style={{ color: appTitleColor }}>{logoText}</span>
          <span className="text-sm" style={{ color: appSubtitleColor }}>{logoSubtitle}</span>
        </div>
      )}
    </Link>
  );
}
