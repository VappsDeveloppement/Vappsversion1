'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Card className="bg-gray-200/90 text-gray-800 border-none shadow-2xl backdrop-blur-sm max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
                <CardDescription>Accédez à votre espace personnel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="votre@email.com" className="bg-white" />
                </div>
                <div className="space-y-2 relative">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" className="bg-white pr-10" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-7 w-7 text-gray-500 hover:bg-gray-200"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                </div>
                <Button className="w-full bg-[#32cd32] hover:bg-[#28a428] text-white font-bold text-lg h-12">
                    Se connecter
                </Button>
                <div className="text-center">
                    <Link href="#" className="text-sm text-gray-600 hover:underline">
                        Mot de passe oublié?
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
