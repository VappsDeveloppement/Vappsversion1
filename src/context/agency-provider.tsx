
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// Define the shape of the personalization settings object
interface Personalization {
    [key: string]: any;
}

// Define the shape of an agency document
interface Agency {
    id: string;
    name: string;
    personalization: Personalization;
}

// Define the context value
interface AgencyContextType {
    agency: Agency | null;
    personalization: Personalization | null;
    isLoading: boolean;
    error: Error | null;
}

// Create the context with a default value
const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

// Define the provider component
interface AgencyProviderProps {
    children: ReactNode;
}

const defaultPersonalization = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    logoDataUrl: null as string | null,
    footerAboutTitle: "À propos",
    footerAboutText: "HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.",
    footerAboutLinks: [
      { id: 1, text: "Notre mission", url: "#", icon: "GitBranch" },
      { id: 2, text: "Carrières", url: "#", icon: "Briefcase" },
    ],
    footerSocialLinks: [
      { id: 1, name: 'Facebook', url: '', icon: 'Facebook' },
      { id: 2, name: 'Twitter', url: '', icon: 'Twitter' },
      { id: 3, name: 'LinkedIn', url: '', icon: 'Linkedin' },
      { id: 4, name: 'Instagram', url: '', icon: 'Instagram' },
    ],
    copyrightText: "Vapps.",
    copyrightUrl: "/",
    homePageVersion: 'tunnel',
    homePageSections: [
      { id: 'hero', label: 'Hero (Titre & Connexion)', enabled: true, isLocked: true },
      { id: 'about', label: 'À propos (Trouver votre voie)', enabled: true },
      { id: 'parcours', label: 'Parcours de transformation', enabled: true },
      { id: 'cta', label: 'Appel à l\'action (CTA)', enabled: true },
      { id: 'video', label: 'Vidéo', enabled: true },
      { id: 'shop', label: 'Boutique', enabled: true },
      { id: 'services', label: 'Accompagnements', enabled: true },
      { id: 'otherActivities', label: 'Autres activités & Contact', enabled: true },
      { id: 'blog', label: 'Blog', enabled: true },
      { id: 'whiteLabel', label: 'Marque Blanche', enabled: true },
      { id: 'pricing', label: 'Formules (Tarifs)', enabled: true },
      { id: 'footer', label: 'Pied de page', enabled: true, isLocked: true },
    ],
    legalInfo: {
        companyName: "", structureType: "", capital: "", siret: "", addressStreet: "", addressZip: "", addressCity: "",
        email: "", phone: "", apeNaf: "", rm: "", rcs: "", nda: "", insurance: "", isVatSubject: false, vatRate: "", vatNumber: "",
        legalMentions: "", cgv: "", privacyPolicy: ""
    }
};

const defaultAgency: Agency = {
    id: 'vapps-agency',
    name: 'VApps Agency',
    personalization: defaultPersonalization
};


const ensureUserDocument = async (firestore: Firestore, user: User) => {
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        console.log(`User document for ${user.uid} not found. Creating it...`);
        const agencyId = 'vapps-agency';
        const userData = {
            id: user.uid,
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || 'Admin',
            lastName: user.displayName?.split(' ')[1] || 'User',
            role: 'admin', // First user is always admin
            agencyId: agencyId,
            dateJoined: new Date().toISOString(),
        };
        // Use the non-blocking update with proper error handling
        setDocumentNonBlocking(userRef, userData, { merge: true });
    }
};


export const AgencyProvider = ({ children }: AgencyProviderProps) => {
    const { firestore, auth } = useFirebase();
    const [agency, setAgency] = useState<Agency | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const agencyId = 'vapps-agency'; // Hardcode the agency ID

    useEffect(() => {
        if (!firestore) {
            setAgency(defaultAgency);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const agencyDocRef = doc(firestore, 'agencies', agencyId);
        
        const unsubscribe = onSnapshot(agencyDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const agencyData = { id: docSnap.id, ...docSnap.data() } as Agency;
                
                const mergedPersonalization = {
                    ...defaultPersonalization,
                    ...(agencyData.personalization || {}),
                    legalInfo: {
                        ...defaultPersonalization.legalInfo,
                        ...(agencyData.personalization?.legalInfo || {})
                    },
                    homePageSections: agencyData.personalization?.homePageSections?.length ? agencyData.personalization.homePageSections : defaultPersonalization.homePageSections
                };
                agencyData.personalization = mergedPersonalization;

                setAgency(agencyData);
            } else {
                console.log("Agency document not found, using default.");
                setAgency(defaultAgency);
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error listening to agency document:", err);
            setError(err);
            setAgency(defaultAgency); // Fallback to default on error
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);


    // Effect to subscribe to Firebase auth state changes
      useEffect(() => {
        if (!auth || !firestore) {
          return;
        }

        const unsubscribe = onAuthStateChanged(
          auth,
          async (firebaseUser) => {
            if (firebaseUser) {
                await ensureUserDocument(firestore, firebaseUser);
            }
          },
          (error) => {
            console.error("FirebaseProvider: onAuthStateChanged error:", error);
          }
        );
        return () => unsubscribe();
      }, [auth, firestore]);


    const personalization = useMemo(() => {
        if (!agency) return defaultPersonalization;
        return agency.personalization;
    }, [agency]);

    const value = {
        agency,
        personalization,
        isLoading,
        error,
    };

    return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
};

// Create a custom hook to use the agency context
export const useAgency = (): AgencyContextType => {
    const context = useContext(AgencyContext);
    if (context === undefined) {
        throw new Error('useAgency must be used within an AgencyProvider');
    }
    return context;
};
