
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot, Firestore, FirestoreError } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    isDefaultAgency: boolean;
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

export const AgencyProvider = ({ children }: AgencyProviderProps) => {
    const { firestore } = useFirebase();
    const [agency, setAgency] = useState<Agency | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isDefaultAgency, setIsDefaultAgency] = useState(false);
    const agencyId = 'vapps-agency'; // Hardcode the agency ID

    useEffect(() => {
        if (!firestore) {
            setAgency(defaultAgency);
            setIsDefaultAgency(true);
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
                setIsDefaultAgency(false);
            } else {
                setAgency(defaultAgency);
                setIsDefaultAgency(true);
            }
            setIsLoading(false);
        }, (err: FirestoreError) => {
            const contextualError = new FirestorePermissionError({
                path: agencyDocRef.path,
                operation: 'get',
            });

            setError(contextualError);
            setAgency(defaultAgency); // Fallback to default on error
            setIsDefaultAgency(true); // Treat errors as a "default" state to trigger onboarding
            setIsLoading(false);
            
            // Emit the contextual error for the global listener
            errorEmitter.emit('permission-error', contextualError);
        });

        return () => unsubscribe();
    }, [firestore]);

    const personalization = useMemo(() => {
        if (!agency) return defaultPersonalization;
        return agency.personalization;
    }, [agency]);

    const value = {
        agency,
        personalization,
        isLoading,
        error,
        isDefaultAgency,
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
