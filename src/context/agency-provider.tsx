

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot, Firestore, FirestoreError } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Section, HeroNavLink, JobOffer, SecondaryVideo, ServiceItem, ParcoursStep } from '@/app/dashboard/settings/mini-site/page';

interface Pillar {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
}

interface Expertise {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
}
interface AboutSectionPersonalization {
    mainTitle: string;
    mainSubtitle: string;
    mainImageUrl: string | null;
    mainText: string;
    pillarsSectionTitle: string;
    pillars: Pillar[];
    showExpertises: boolean;
    expertisesSectionTitle: string;
    expertises: Expertise[];
}

interface CtaSectionPersonalization {
    enabled: boolean;
    title: string;
    subtitle: string;
    text: string;
    buttonText: string;
    buttonLink: string;
    bgColor: string;
    bgImageUrl: string | null;
}

interface Cta2SectionPersonalization {
    title: string;
    text: string;
    buttonText: string;
    buttonLink: string;
    bgColor: string;
    bgImageUrl: string | null;
}

interface JobOffersSectionPersonalization {
    title: string;
    subtitle: string;
    offers: JobOffer[];
}

interface VideoSectionPersonalization {
    sectionTitle: string;
    sectionSubtitle: string;
    mainVideoUrl: string;
    secondaryVideos: SecondaryVideo[];
}

interface ServicesSectionPersonalization {
    title: string;
    subtitle: string;
    description: string;
    services: ServiceItem[];
}

interface ParcoursSectionPersonalization {
    enabled: boolean;
    title: string;
    subtitle: string;
    steps: ParcoursStep[];
}


interface PaymentSettings {
    ribIban: string;
    ribBic: string;
    paypalMerchantId: string;
    paypalClientId: string;
    paypalClientSecret: string;
    paypalMeLink: string;
    skrillEmail: string;
}

interface EmailSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
}

interface GdprSettings {
    inactivityAlertDays: number;
    dpoName: string;
    dpoEmail: string;
    dpoPhone: string;
    dpoAddress: string;
}


// Define the shape of the personalization settings object
interface Personalization {
    appTitle: string;
    appSubtitle: string;
    appTitleColor: string;
    appSubtitleColor: string;
    logoDataUrl: string | null;
    logoWidth: number;
    logoHeight: number;
    logoDisplay: string;
    primaryColor: string;
    secondaryColor: string;
    bgColor: string;
    footerBgColor: string;
    heroStyle: string;
    heroTitle: string;
    heroSubtitle: string;
    heroTitleColor: string;
    heroSubtitleColor: string;
    heroCta1Text: string;
    heroCta1Link: string;
    heroCta2Text: string;
    heroCta2Link: string;
    heroImageUrl: string | null;
    heroBgColor: string;
    heroAppTitle: string;
    heroAppSubtitle: string;
    heroAppTitleColor: string;
    heroAppSubtitleColor: string;
    heroAppCtaText: string;
    heroAppCtaLink: string;
    heroNavLinks: HeroNavLink[];
    footerAboutTitle: string;
    footerAboutText: string;
    footerAboutLinks: any[];
    footerSocialLinks: any[];
    copyrightText: string;
    copyrightUrl: string;
    homePageVersion: string;
    homePageSections: Section[];
    legalInfo: any;
    aboutSection: AboutSectionPersonalization;
    ctaSection: CtaSectionPersonalization;
    cta2Section: Cta2SectionPersonalization;
    jobOffersSection: JobOffersSectionPersonalization;
    videoSection: VideoSectionPersonalization;
    servicesSection: ServicesSectionPersonalization;
    parcoursSection: ParcoursSectionPersonalization;
    paymentSettings: PaymentSettings;
    emailSettings: EmailSettings;
    gdprSettings: GdprSettings;
    [key: string]: any;
}

// Define the context value
interface AgencyContextType {
    personalization: Personalization;
    isLoading: boolean;
    error: Error | null;
    agency: {id: string, name: string, personalization: Personalization} | null
}

// Create the context with a default value
const AgencyContext = createContext<AgencyContextType | undefined>(undefined);


const defaultHomePageSections: Section[] = [
  { id: 'hero', label: 'Hero (Titre & Connexion)', enabled: true, isLocked: true },
  { id: 'about', label: 'À propos (Trouver votre voie)', enabled: true },
  { id: 'cta', label: "Appel à l'action (CTA)", enabled: true },
  { id: 'video', label: 'Vidéo', enabled: true },
  { id: 'shop', label: 'Boutique', enabled: true },
  { id: 'services', label: 'Accompagnements', enabled: true },
  { id: 'otherActivities', label: 'Autres activités & Contact', enabled: true },
  { id: 'blog', label: 'Blog', enabled: true },
  { id: 'whiteLabel', label: 'Marque Blanche', enabled: true },
  { id: 'pricing', label: 'Formules (Tarifs)', enabled: true },
  { id: 'jobOffers', label: 'Offre emploi', enabled: true },
  { id: 'cta2', label: 'CTA 2', enabled: true },
];

const defaultPersonalization: Personalization = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    appTitleColor: "#000000",
    appSubtitleColor: "#666666",
    logoDataUrl: null,
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    footerBgColor: "#111827",
    heroStyle: "application",
    heroTitle: "Révélez votre potentiel et construisez une carrière qui vous ressemble.",
    heroSubtitle: "Un accompagnement sur-mesure pour votre épanouissement professionnel et personnel.",
    heroTitleColor: "#FFFFFF",
    heroSubtitleColor: "#E0E0E0",
    heroCta1Text: "Découvrir mes services",
    heroCta1Link: "/services",
    heroCta2Text: "Prendre rendez-vous",
    heroCta2Link: "/contact",
    heroImageUrl: null,
    heroBgColor: "#000000",
    heroAppTitle: "Un accompagnement holistique pour une évolution professionnelle alignée avec vos valeurs.",
    heroAppSubtitle: "Accédez à vos ressources, suivez vos progrès et communiquez avec votre coach.",
    heroAppTitleColor: "#FFFFFF",
    heroAppSubtitleColor: "#E0E0E0",
    heroAppCtaText: "Découvrir VApps",
    heroAppCtaLink: "#about",
    heroNavLinks: [],
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
    homePageSections: defaultHomePageSections,
    legalInfo: {
        companyName: "", structureType: "", capital: "", siret: "", addressStreet: "", addressZip: "", addressCity: "",
        email: "", phone: "", apeNaf: "", rm: "", rcs: "", nda: "", insurance: "", isVatSubject: false, vatRate: "", vatNumber: "",
        legalMentions: "", cgv: "", privacyPolicy: ""
    },
    aboutSection: {
      mainTitle: "Trouver Votre Voie",
      mainSubtitle: "Une approche sur-mesure",
      mainImageUrl: null,
      mainText: "Chez Vapps, nous croyons qu'il n'existe pas de chemin unique. C'est pourquoi nous proposons une approche holistique et inclusive, qui prend en compte votre personnalité, vos compétences, vos envies et vos contraintes.",
      pillarsSectionTitle: "Les piliers de notre accompagnement",
      pillars: [
        { id: "pillar-method", title: "Notre Méthode", description: "Une approche structurée en 4 étapes pour garantir votre succès.", imageUrl: null },
        { id: "pillar-tools", title: "Nos Outils", description: "Des supports et outils exclusifs pour guider votre réflexion.", imageUrl: null },
        { id: "pillar-community", title: "Notre Communauté", description: "Rejoignez un réseau d'entraide pour partager et grandir ensemble.", imageUrl: null },
      ],
      showExpertises: true,
      expertisesSectionTitle: "Nos expertises sectorielles",
      expertises: [
        { id: "expertise-tech", title: "Secteur Tech", description: "Conseils pour les métiers du numérique.", imageUrl: null },
        { id: "expertise-health", title: "Secteur Santé", description: "Évoluer dans le domaine de la santé.", imageUrl: null },
        { id: "expertise-entrepreneurship", title: "Entrepreneuriat", description: "Passer de l'idée à la création d'entreprise.", imageUrl: null },
        { id: "expertise-management", title: "Management", description: "Devenir un manager bienveillant et efficace.", imageUrl: null },
      ]
    },
    ctaSection: {
        enabled: false,
        title: "Prêt(e) à passer à l'action ?",
        subtitle: "",
        text: "Contactez-moi dès aujourd'hui pour planifier votre première séance.",
        buttonText: "Prendre rendez-vous",
        buttonLink: "#contact",
        bgColor: "#F9FAFB",
        bgImageUrl: null
    },
    cta2Section: {
        title: "Un deuxième appel à l'action",
        text: "Incitez vos visiteurs à effectuer une seconde action importante ici.",
        buttonText: "S'inscrire à la newsletter",
        buttonLink: "#",
        bgColor: "#eff6ff", // bg-blue-50
        bgImageUrl: null as string | null
    },
    jobOffersSection: {
        title: "Nos Offres d'Emploi",
        subtitle: "Rejoignez une équipe dynamique et passionnée.",
        offers: [
            { id: `job-1`, title: "Développeur Full-Stack", contractType: "CDI", location: "Paris, France" },
            { id: `job-2`, title: "Chef de Projet Digital", contractType: "CDI", location: "Lyon, France" },
            { id: `job-3`, title: "UX/UI Designer", contractType: "Alternance", location: "Télétravail" },
        ]
    },
    videoSection: {
        sectionTitle: "Découvrez l'approche Vapps en Vidéo",
        sectionSubtitle: "Plongez dans notre univers et découvrez comment notre accompagnement peut transformer votre parcours professionnel.",
        mainVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        secondaryVideos: [
            { id: `video-1`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Notre approche holistique" },
            { id: `video-2`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Définir vos objectifs de carrière" },
            { id: `video-3`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Témoignage : La reconversion de Sarah" }
        ]
    },
    servicesSection: {
        title: "Nos Accompagnements",
        subtitle: "Construisons ensemble votre avenir",
        description: "Que vous soyez en quête de sens, en reconversion ou désireux d'évoluer, nous avons une solution pour vous.",
        services: [
            { id: `service-1`, title: "Bilan de Compétences", description: "Faites le point sur vos forces et aspirations pour définir un projet clair.", imageUrl: null },
            { id: `service-2`, title: "Coaching Carrière", description: "Un accompagnement personnalisé pour atteindre vos objectifs professionnels.", imageUrl: null },
            { id: `service-3`, title: "Formation au Leadership", description: "Développez vos compétences managériales et devenez un leader inspirant.", imageUrl: null },
        ]
    },
    parcoursSection: {
        enabled: false,
        title: "Etapes d'accompagnement",
        subtitle: "Mon approche pour votre réussite",
        steps: [],
    },
    paymentSettings: {
        ribIban: "",
        ribBic: "",
        paypalMerchantId: "",
        paypalClientId: "",
        paypalClientSecret: "",
        paypalMeLink: "",
        skrillEmail: "",
    },
    emailSettings: {
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
        smtpSecure: true,
        fromEmail: "",
        fromName: "",
    },
    gdprSettings: {
        inactivityAlertDays: 365,
        dpoName: "",
        dpoEmail: "",
        dpoPhone: "",
        dpoAddress: "",
    }
};

interface AgencyProviderProps {
    children: ReactNode;
}

export const AgencyProvider = ({ children }: AgencyProviderProps) => {
    const { firestore, isUserLoading } = useFirebase();
    const [personalization, setPersonalization] = useState<Personalization>(defaultPersonalization);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [agencyData, setAgencyData] = useState<any>(null);

    const agencyIdToLoad = 'vapps-agency'; 

    useEffect(() => {
        if (isUserLoading) {
            return;
        }

        if (!firestore) {
            setPersonalization(defaultPersonalization);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const agencyDocRef = doc(firestore, 'agencies', agencyIdToLoad);
        
        const unsubscribe = onSnapshot(agencyDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const fetchedAgencyData = docSnap.data();
                setAgencyData(fetchedAgencyData);
                
                const savedSections = fetchedAgencyData.personalization?.homePageSections || [];
                const codeSections = defaultHomePageSections;

                const savedSectionsMap = new Map(savedSections.map((s: Section) => [s.id, s]));

                const mergedSections = codeSections.map(codeSection => {
                    const savedSection = savedSectionsMap.get(codeSection.id);
                    return savedSection ? { ...codeSection, ...savedSection } : codeSection;
                }).filter(section => section.id !== 'footer');

                const finalSections = mergedSections.sort((a, b) => {
                    const aIndex = savedSections.findIndex((s: Section) => s.id === a.id);
                    const bIndex = savedSections.findIndex((s: Section) => s.id === b.id);

                    if (a.isLocked && !b.isLocked) return -1;
                    if (!a.isLocked && b.isLocked) return 1;

                    if (aIndex === -1 && bIndex === -1) return 0;
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                });


                const mergedPersonalization = {
                    ...defaultPersonalization,
                    ...(fetchedAgencyData.personalization || {}),
                    homePageSections: finalSections,
                    legalInfo: {
                        ...defaultPersonalization.legalInfo,
                        ...(fetchedAgencyData.personalization?.legalInfo || {})
                    },
                    aboutSection: {
                        ...defaultPersonalization.aboutSection,
                        ...(fetchedAgencyData.personalization?.aboutSection || {}),
                        pillars: (fetchedAgencyData.personalization?.aboutSection?.pillars || defaultPersonalization.aboutSection.pillars).map((p: any, i: number) => ({ ...defaultPersonalization.aboutSection.pillars[i], ...p })),
                        expertises: (fetchedAgencyData.personalization?.aboutSection?.expertises || defaultPersonalization.aboutSection.expertises).map((e: any, i: number) => ({ ...defaultPersonalization.aboutSection.expertises[i], ...e })),
                    },
                     ctaSection: {
                        ...defaultPersonalization.ctaSection,
                        ...(fetchedAgencyData.personalization?.ctaSection || {}),
                    },
                    cta2Section: {
                        ...defaultPersonalization.cta2Section,
                        ...(fetchedAgencyData.personalization?.cta2Section || {}),
                    },
                    jobOffersSection: {
                        ...defaultPersonalization.jobOffersSection,
                        ...(fetchedAgencyData.personalization?.jobOffersSection || {}),
                    },
                    videoSection: {
                        ...defaultPersonalization.videoSection,
                        ...(fetchedAgencyData.personalization?.videoSection || {}),
                    },
                    servicesSection: {
                        ...defaultPersonalization.servicesSection,
                        ...(fetchedAgencyData.personalization?.servicesSection || {}),
                    },
                    parcoursSection: {
                        ...defaultPersonalization.parcoursSection,
                        ...(fetchedAgencyData.personalization?.parcoursSection || {}),
                    },
                    paymentSettings: {
                        ...defaultPersonalization.paymentSettings,
                        ...(fetchedAgencyData.personalization?.paymentSettings || {})
                    },
                    emailSettings: {
                        ...defaultPersonalization.emailSettings,
                        ...(fetchedAgencyData.personalization?.emailSettings || {})
                    },
                    gdprSettings: {
                        ...defaultPersonalization.gdprSettings,
                        ...(fetchedAgencyData.personalization?.gdprSettings || {})
                    }
                };
                setPersonalization(mergedPersonalization);
            } else {
                setPersonalization(defaultPersonalization);
                setAgencyData({ id: agencyIdToLoad, name: "VApps", personalization: defaultPersonalization });
            }
            setIsLoading(false);
            setError(null);
        }, (err: FirestoreError) => {
            console.warn("Firestore read error in AgencyProvider:", err.message);
            setPersonalization(defaultPersonalization);
            setIsLoading(false);
            setError(err);
            
            const contextualError = new FirestorePermissionError({
                path: agencyDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', contextualError);
        });

        return () => unsubscribe();
    }, [firestore, isUserLoading]);

    const agency = useMemo(() => {
        if (!agencyData) return null;
        return { 
            id: agencyIdToLoad, 
            name: agencyData.name || '...', 
            personalization 
        };
    }, [agencyData, personalization]);


    const value = {
        personalization,
        isLoading: isLoading || isUserLoading,
        error,
        agency
    };

    return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
};

export function useAgency() {
    const context = useContext(AgencyContext);
    if (context === undefined) {
        throw new Error('useAgency must be used within an AgencyProvider');
    }
    return context;
};
