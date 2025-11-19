
import React from 'react';
import { notFound } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import Link from 'next/link';

// Initialize Firebase Admin SDK
const { app } = initializeAdminApp();
const firestore = getFirestore(app);

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    miniSite?: any;
    agencyInfo?: {
        copyrightText?: string;
        copyrightUrl?: string;
    }
};

async function getCounselorProfile(counselorId: string): Promise<CounselorProfile | null> {
    if (!counselorId) {
        return null;
    }
    try {
        const docRef = firestore.collection('minisites').doc(counselorId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data() as CounselorProfile;
        } else {
            console.log(`No minisite document found for ID: ${counselorId}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching counselor profile:", error);
        return null;
    }
}

export default async function CounselorPublicProfilePage({ params }: { params: { counselorId: string } }) {
  const { counselorId } = params;
  const counselor = await getCounselorProfile(counselorId);

  if (!counselor) {
    notFound();
  }

  const showAttentionSection = counselor.miniSite?.attentionSection?.enabled !== false;
  const showAboutSection = counselor.miniSite?.aboutSection?.enabled !== false;
  const showInterestsSection = counselor.miniSite?.interestsSection?.enabled !== false;
  const showServicesSection = counselor.miniSite?.servicesSection?.enabled !== false;
  const showCtaSection = counselor.miniSite?.ctaSection?.enabled !== false;
  const showPricingSection = counselor.miniSite?.pricingSection?.enabled !== false;
  const showContactSection = counselor.miniSite?.contactSection?.enabled !== false;

  const copyrightText = counselor.agencyInfo?.copyrightText || "Vapps.";
  const copyrightUrl = counselor.agencyInfo?.copyrightUrl || "/";
  const footerBgColor = counselor.miniSite?.hero?.bgColor || '#f1f5f9';
  const primaryColor = counselor.miniSite?.hero?.primaryColor || '#10B981';

  return (
    <div className="bg-muted/30 min-h-screen">
      <CounselorHero counselor={counselor} />
      <main>
        {showAttentionSection && <AttentionSection counselor={counselor} />}
        {showAboutSection && <AboutMeSection counselor={counselor} />}
        {showInterestsSection && <InterestsSection counselor={counselor} />}
        {showServicesSection && <CounselorServicesSection counselor={counselor} />}
        {showCtaSection && <CounselorCtaSection counselor={counselor} />}
        {showPricingSection && <CounselorPricingSection counselor={counselor} />}
        {showContactSection && <CounselorContactSection counselor={counselor} />}
      </main>
      <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
        <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
      </footer>
    </div>
  );
}
