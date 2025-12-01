
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import { useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";


export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const isConseiller = userData?.role === 'conseiller';
  const hasAdminAccess = userData?.permissions?.includes('FULLACCESS');
  const canHaveMiniSite = isConseiller || hasAdminAccess;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les informations de votre compte et de votre profil.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/settings/profile">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader className="flex flex-row items-center gap-4">
              <UserCircle className="h-8 w-8 text-primary" />
              <CardTitle>Mon Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Mettez à jour vos informations personnelles, votre photo et votre biographie.</CardDescription>
            </CardContent>
          </Card>
        </Link>
        {canHaveMiniSite && (
           <Link href="/dashboard/settings/mini-site">
            <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <Palette className="h-8 w-8 text-primary" />
                <CardTitle>Mon Mini-site</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Personnalisez l'apparence et le contenu de votre page publique.</CardDescription>
              </CardContent>
            </Card>
          </Link>
        )}
         {canHaveMiniSite && (
           <Link href="/dashboard/settings/parameters">
            <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <CardTitle>Mes Paramètres</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Configurez vos moyens de paiements et vos e-mails.</CardDescription>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
