
'use client';

import React, { type ReactNode, useState, useEffect } from 'react';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * This component acts as a Client Component boundary.
 * It ensures that its children are only rendered on the client side,
 * preventing server-side rendering issues with client-only libraries like Firebase.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render children only after the component has mounted on the client.
  return isClient ? <>{children}</> : null;
}
