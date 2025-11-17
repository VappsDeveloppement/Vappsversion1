'use client';

import { FirebaseClientProvider } from "@/firebase";
import { AgencyProvider } from "@/context/agency-provider";

// The AgencyProvider is now used globally to provide context from the single default agency.
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AgencyProvider agencyId="vapps-agency">
                {children}
            </AgencyProvider>
        </FirebaseClientProvider>
    );
}
