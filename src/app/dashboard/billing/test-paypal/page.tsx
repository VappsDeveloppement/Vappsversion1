
'use client';

import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAgency } from '@/context/agency-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function TestPayPalPage() {
    const { personalization, isLoading } = useAgency();
    const clientId = personalization?.paymentSettings?.paypalClientId;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!clientId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>PayPal Connection Test</CardTitle>
                    <CardDescription>Verify your PayPal integration.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration Missing</AlertTitle>
                        <AlertDescription>
                            Your PayPal Client ID is not set. Please <Link href="/dashboard/settings/personalization" className="underline font-semibold">configure your payment settings</Link> first.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
    const initialOptions = {
        "client-id": clientId,
        currency: "EUR",
        intent: "capture",
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>PayPal Connection Test</CardTitle>
                <CardDescription>
                    This page uses your provided Client ID to render a PayPal button. 
                    If the button appears below, your Client ID is likely correct and the application can communicate with PayPal.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert className='mb-6'>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Client ID Found</AlertTitle>
                    <AlertDescription>
                        Attempting to load PayPal buttons with Client ID: <span className="font-mono text-xs bg-muted p-1 rounded">{clientId}</span>
                    </AlertDescription>
                </Alert>

                <PayPalScriptProvider options={initialOptions}>
                    <div className='max-w-md mx-auto'>
                         <PayPalButtons
                            style={{ layout: "vertical" }}
                            createOrder={(data, actions) => {
                                return actions.order.create({
                                    purchase_units: [{
                                        description: "Test Transaction",
                                        amount: {
                                            value: "1.00",
                                            currency_code: "EUR"
                                        }
                                    }]
                                });
                            }}
                             onApprove={(data, actions) => {
                                return actions.order!.capture().then(details => {
                                    alert("Test transaction completed by " + details.payer.name?.given_name);
                                });
                            }}
                            onError={(err) => {
                                console.error("PayPal Button Error:", err);
                                alert("An error occurred with the PayPal button. Check the console for details. Your Client ID might be invalid for transactions.");
                            }}
                         />
                    </div>
                </PayPalScriptProvider>
            </CardContent>
        </Card>
    );
}

