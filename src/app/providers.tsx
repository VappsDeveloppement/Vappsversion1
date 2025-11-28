'use client';

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AgencyProvider } from "@/context/agency-provider";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AgencyProvider>
                {children}
                <Toaster />
            </AgencyProvider>
        </FirebaseClientProvider>
    );
}
