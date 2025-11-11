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
        <Card className="w-full max-w-sm bg-background text-foreground">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Connexion</CardTitle>
                <CardDescription>Accédez à votre espace personnel.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="votre@email.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} required />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                            </Button>
                        </div>
                    </div>
                    <Button type="submit" className="w-full !mt-6 bg-lime-400 text-black hover:bg-lime-500">
                        Se connecter
                    </Button>
                    <div className="text-center">
                         <Link href="#" className="text-sm text-muted-foreground hover:underline">
                            Mot de passe oublié?
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
