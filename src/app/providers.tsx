
'use client';

import { FirebaseClientProvider } from "@/firebase";

// The AgencyProvider is now used within specific pages that need agency context,
// such as the main homepage and dynamic agency pages, not globally.
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
    );
}
