
'use client';

import React from 'react';
import { LoginForm } from '@/components/shared/login-form';
import { Logo } from '@/components/shared/logo';

export default function ApplicationPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <div className="absolute top-8">
            <Logo />
        </div>
        <LoginForm />
    </div>
  );
}
