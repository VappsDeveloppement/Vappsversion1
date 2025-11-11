"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Card className="w-full max-w-sm bg-gray-200/90 text-gray-800">
            <CardHeader className="text-left">
                <CardTitle className="text-2xl font-bold text-black">Connexion</CardTitle>
                <CardDescription className="text-gray-600">Accédez à votre espace personnel.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-black">Email</Label>
                        <Input id="email" type="email" placeholder="votre@email.com" required className="bg-white text-black" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password"  className="text-black">Mot de passe</Label>
                        <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} required className="bg-white text-black" />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-gray-500"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                            </Button>
                        </div>
                    </div>
                    <Button type="submit" className="w-full !mt-6 bg-lime-400 text-black font-bold hover:bg-lime-500">
                        Se connecter
                    </Button>
                    <div className="text-center pt-2">
                         <Link href="#" className="text-sm text-gray-600 hover:underline">
                            Mot de passe oublié?
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
