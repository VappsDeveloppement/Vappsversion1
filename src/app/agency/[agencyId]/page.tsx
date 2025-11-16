
'use client';

import React from 'react';
import { AgencyPage } from '@/components/shared/agency-page';
import { useParams } from 'next/navigation';

export default function AgencyPublicPage() {
  const params = useParams();
  const agencyId = params.agencyId as string;

  if (!agencyId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>ID d'agence manquant.</p>
      </div>
    );
  }

  return <AgencyPage agencyId={agencyId} />;
}
