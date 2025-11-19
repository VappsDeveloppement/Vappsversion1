
import 'server-only';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, doc, getDoc } from 'firebase-admin/firestore';
import { notFound } from 'next/navigation';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import Link from 'next/link';

async function getCounselorData(profileName: string) {
    try {
        const { app } = initializeAdminApp();
        const firestore = getFirestore(app);

        // Step 1: Look up the counselorId from the publicProfileName in the routing collection
        const routeDocRef = doc(firestore, 'minisite_routes', profileName);
        const routeDocSnap = await getDoc(routeDocRef);

        if (!routeDocSnap.exists()) {
            return null; // No route found for this public name
        }
        
        const counselorId = routeDocSnap.data()?.counselorId;
        if (!counselorId) {
            return null; // Route exists but is invalid
        }
        
        // Step 2: Fetch the actual minisite data using the counselorId
        const minisiteDocRef = doc(firestore, 'minisites', counselorId);
        const minisiteDocSnap = await getDoc(minisiteDocRef);
        
        if (!minisiteDocSnap.exists()) {
            return null; // Counselor data not found
        }
        
        const counselorData = minisiteDocSnap.data();

        // Step 3: Fetch agency info (assuming a single agency)
        const agencyRef = doc(firestore, 'agencies', 'vapps-agency');
        const agencySnap = await getDoc(agencyRef);
        const agencyInfo = agencySnap.exists() ? agencySnap.data()?.personalization : {};

        return { ...counselorData, agencyInfo };

    } catch (error) {
        console.error("Error fetching counselor data:", error);
        return null;
    }
}


export default async function CounselorPublicProfilePage({ params }: { params: { publicProfileName: string } }) {
    const counselor = await getCounselorData(params.publicProfileName);

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
            <CounselorHero counselor={counselor as any} />
            <main>
                {showAttentionSection && <AttentionSection counselor={counselor as any} />}
                {showAboutSection && <AboutMeSection counselor={counselor as any} />}
                {showInterestsSection && <InterestsSection counselor={counselor as any} />}
                {showServicesSection && <CounselorServicesSection counselor={counselor as any} />}
                {showCtaSection && <CounselorCtaSection counselor={counselor as any} />}
                {showPricingSection && <CounselorPricingSection counselor={counselor as any} />}
                {showContactSection && <CounselorContactSection counselor={counselor as any} />}
            </main>
            <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
                <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{ color: primaryColor }}>{copyrightText}</Link></p>
            </footer>
        </div>
    );
}

