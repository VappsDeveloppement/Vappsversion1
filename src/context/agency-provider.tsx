
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot, Firestore, FirestoreError } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Section } from '@/app/dashboard/settings/personalization/page';

// Define the shape of the personalization settings object
interface Personalization {
    appTitle: string;
    appSubtitle: string;
    logoDataUrl: string | null;
    logoWidth: number;
    logoHeight: number;
    logoDisplay: string;
    primaryColor: string;
    secondaryColor: string;
    bgColor: string;
    heroStyle: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCta1Text: string;
    heroCta1Link: string;
    heroCta2Text: string;
    heroCta2Link: string;
    heroImageUrl: string | null;
    heroBgColor: string;
    footerAboutTitle: string;
    footerAboutText: string;
    footerAboutLinks: any[];
    footerSocialLinks: any[];
    copyrightText: string;
    copyrightUrl: string;
    homePageVersion: string;
    homePageSections: Section[];
    legalInfo: any;
    [key: string]: any;
}

// Define the context value
interface AgencyContextType {
    personalization: Personalization;
    isLoading: boolean;
    error: Error | null;
}

// Create the context with a default value
const AgencyContext = createContext<AgencyContextType | undefined>(undefined);


const defaultPersonalization: Personalization = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    logoDataUrl: null,
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    heroStyle: "application",
    heroTitle: "Révélez votre potentiel et construisez une carrière qui vous ressemble.",
    heroSubtitle: "Un accompagnement sur-mesure pour votre épanouissement professionnel et personnel.",
    heroCta1Text: "Découvrir mes services",
    heroCta1Link: "/services",
    heroCta2Text: "Prendre rendez-vous",
    heroCta2Link: "/contact",
    heroImageUrl: null,
    heroBgColor: "#000000",
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

const defaultAgency: {id: string, name: string, personalization: Personalization} = {
    id: 'vapps-agency',
    name: 'VApps Agency',
    personalization: defaultPersonalization
};


export const AgencyProvider = ({ children }: { children: ReactNode }) => {
    const { firestore, user } = useFirebase();
    const [personalization, setPersonalization] = useState<Personalization>(defaultPersonalization);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // This is the single source of truth for the model application.
    const agencyId = 'vapps-agency'; 

    useEffect(() => {
        if (!firestore || !user) {
            // If there's no user or firestore, use defaults. App works offline/unauthenticated.
            setPersonalization(defaultPersonalization);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const agencyDocRef = doc(firestore, 'agencies', agencyId);
        
        const unsubscribe = onSnapshot(agencyDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const agencyData = docSnap.data();
                
                const mergedPersonalization = {
                    ...defaultPersonalization,
                    ...(agencyData.personalization || {}),
                    legalInfo: {
                        ...defaultPersonalization.legalInfo,
                        ...(agencyData.personalization?.legalInfo || {})
                    },
                    homePageSections: agencyData.personalization?.homePageSections?.length 
                        ? agencyData.personalization.homePageSections 
                        : defaultPersonalization.homePageSections
                };
                setPersonalization(mergedPersonalization);
            } else {
                // If doc doesn't exist in DB, use defaults. App still works.
                setPersonalization(defaultPersonalization);
            }
            setIsLoading(false);
            setError(null);
        }, (err: FirestoreError) => {
            console.warn("Firestore read error in AgencyProvider:", err.message);
            // On error (e.g. permissions on first run), still provide default data.
            setPersonalization(defaultPersonalization);
            setIsLoading(false);
            setError(err);
            
            // This will trigger the global error listener for debugging if needed
            const contextualError = new FirestorePermissionError({
                path: agencyDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', contextualError);
        });

        return () => unsubscribe();
    }, [firestore, user]); // Re-run when user authenticates

    const value = {
        // We no longer expose the whole 'agency' object, just what's needed.
        personalization,
        isLoading,
        error,
        // The concepts of isDefaultAgency and the agency object itself are gone.
        // We provide a dummy agency object for components that might still use it temporarily.
        agency: { id: agencyId, name: 'VApps Model', personalization }
    };

    return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
};

// Create a custom hook to use the agency context
export const useAgency = (): AgencyContextType & { agency: {id: string, name: string, personalization: Personalization} | null } => {
    const context = useContext(AgencyContext);
    if (context === undefined) {
        throw new Error('useAgency must be used within an AgencyProvider');
    }
    // We add the dummy agency object here for backward compatibility during the refactor.
    return { ...context, agency: { id: 'vapps-agency', name: 'VApps Model', personalization: context.personalization } };
};
