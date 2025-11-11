import { Target } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, text = "VApps" }: { className?: string; text?: string; }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Target className="h-7 w-7 text-primary" />
      <span className="text-2xl font-bold text-foreground font-headline">{text}</span>
    </Link>
  );
}