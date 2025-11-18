
'use client';

import React from 'react';
import { useAgency } from '@/context/agency-provider';
import { HomePageSelector } from "@/components/shared/home-page-selector";
import { Skeleton } from '../ui/skeleton';

function AgencyPageContent() {
  const { isLoading } = useAgency();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 p-8 w-full max-w-4xl">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return <HomePageSelector />;
}

export function AgencyPage() {
  return <AgencyPageContent />;
}
