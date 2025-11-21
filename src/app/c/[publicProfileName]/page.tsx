

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { CounselorHero } from '@/components/shared/counselor-hero';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useAgency } from '@/context/agency-provider';
import { AttentionSection } from '@/components/shared/attention-section';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    miniSite?: {
        publicProfileName?: string;
        hero?: any;
        attentionSection?: any;
    };
    agencyInfo?: {
        copyrightText?: string;
        copyrightUrl?: string;
    }
};

function CounselorPageContent({ counselor, isLoading, agency }: { counselor: CounselorProfile | null, isLoading: boolean, agency: any }) {
  if (isLoading) {
    return (
        <div className="space-y-8 p-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
  }

  if (!counselor) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-muted">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Profil non disponible</h1>
            <p className="text-muted-foreground mt-2">
                Le profil que vous cherchez n'existe pas ou n'est plus disponible.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Retour à l'accueil
            </Link>
        </div>
    );
  }
  
  const copyrightText = agency?.personalization.copyrightText || "Vapps.";
  const copyrightUrl = agency?.personalization.copyrightUrl || "/";
  const footerBgColor = counselor.miniSite?.hero?.bgColor || '#f1f5f9';
  const primaryColor = counselor.miniSite?.hero?.primaryColor || '#10B981';

  return (
    <div className="bg-muted/30 min-h-screen">
      <main>
        <CounselorHero counselor={counselor} />
        <AttentionSection counselor={counselor} />
      </main>
      <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
        <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
      </footer>
    </div>
  );
}

export default function CounselorPublicProfilePage() {
  const params = useParams();
  const firestore = useFirestore();
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const publicProfileName = params.publicProfileName as string;
  const [counselor, setCounselor] = useState<CounselorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicProfileName || !firestore) return;

    const findCounselor = async () => {
        setIsLoading(true);
        try {
            const minisitesRef = collection(firestore, 'minisites');
            const q = query(minisitesRef, where("miniSite.publicProfileName", "==", publicProfileName), limit(1));
            
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const counselorDoc = querySnapshot.docs[0];
                setCounselor(counselorDoc.data() as CounselorProfile);
            } else {
                console.log(`No minisite found for publicProfileName: ${publicProfileName}`);
                setCounselor(null);
            }
        } catch (error) {
            console.error("Error fetching counselor by public name:", error);
            setCounselor(null);
        } finally {
            setIsLoading(false);
        }
    };

    findCounselor();
  }, [publicProfileName, firestore]);

  const finalLoadingState = isLoading || isAgencyLoading;

  return <CounselorPageContent counselor={counselor} isLoading={finalLoadingState} agency={agency} />
}
