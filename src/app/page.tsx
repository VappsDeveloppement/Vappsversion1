
'use client';

import React from 'react';
import { AgencyPage } from '@/components/shared/agency-page';

export default function Home() {
    // The main page of the site loads the default agency.
    return <AgencyPage agencyId="vapps-agency" />;
}
