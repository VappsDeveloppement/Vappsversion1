
'use client';

import React from 'react';
import { MessageSquare } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
    const router = useRouter();

    // Redirect to the main dashboard as this page is no longer used for contact requests.
    // The main messaging feature is not yet implemented.
    React.useEffect(() => {
        router.push('/dashboard');
    }, [router]);

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Messagerie</h3>
            <p className="text-muted-foreground">Cette section est en cours de construction.</p>
            <p className="text-sm text-muted-foreground mt-2">Vous allez être redirigé vers le tableau de bord.</p>
        </div>
    );
}
