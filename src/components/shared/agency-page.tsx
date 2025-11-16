
'use client';

import React from 'react';
import { AgencyProvider, useAgency } from '@/context/agency-provider';
import { HomePageSelector } from "@/components/shared/home-page-selector";

function AgencyPageContent() {
  const { isLoading } = useAgency();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  return <HomePageSelector />;
}

export function AgencyPage({ agencyId }: { agencyId: string }) {
  return (
    <AgencyProvider agencyId={agencyId}>
      <AgencyPageContent />
    </AgencyProvider>
  );
}
