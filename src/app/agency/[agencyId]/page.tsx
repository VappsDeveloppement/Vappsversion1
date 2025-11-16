
'use client';

import React from 'react';
import { AgencyPage } from '@/components/shared/agency-page';

export default function AgencyPublicPage({ params }: { params: { agencyId: string } }) {
  const { agencyId } = params;

  if (!agencyId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>ID d'agence manquant.</p>
      </div>
    );
  }

  return <AgencyPage agencyId={agencyId} />;
}
