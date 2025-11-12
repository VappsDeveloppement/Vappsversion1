'use client';

import { FirebaseClientProvider } from "@/firebase";
import { AgencyProvider } from "@/context/agency-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AgencyProvider>
                {children}
            </AgencyProvider>
        </FirebaseClientProvider>
    );
}
