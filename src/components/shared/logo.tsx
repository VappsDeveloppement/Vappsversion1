import { Target } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, text = "VApps" }: { className?: string; text?: string; }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0L31.5 9.5V21.5L16 32L0.5 21.5V9.5L16 0Z" fill="#A3E635"/>
        <path d="M16 4.5L28.5 12V19.5L16 27.5L3.5 19.5V12L16 4.5Z" fill="white"/>
        <path d="M16 6.5L25.5 12.25V18.75L16 24.5L6.5 18.75V12.25L16 6.5Z" fill="#A3E635"/>
      </svg>
      <span className="text-2xl font-bold font-headline">{text}</span>
    </Link>
  );
}
