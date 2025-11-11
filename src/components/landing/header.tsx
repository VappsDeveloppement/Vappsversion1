"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export function Header({ agencyName }: { agencyName: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo text={agencyName} />
        <div className="ml-auto flex items-center gap-4">
          <Button asChild>
            <Link href="/dashboard">Mon Espace</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
