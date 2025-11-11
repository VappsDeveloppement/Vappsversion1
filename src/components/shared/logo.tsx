import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, text = "VApps" }: { className?: string; text?: string; }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Image src="/vapps.png" alt="VApps Logo" width={28} height={28} />
      <span className="text-2xl font-bold font-headline">{text}</span>
    </Link>
  );
}
