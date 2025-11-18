
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Section, HeroNavLink, ParcoursStep, JobOffer, SecondaryVideo, ServiceItem } from '@/app/dashboard/settings/personalization/page';

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

interface ParcoursSectionPersonalization {
    title: string;
    subtitle: string;
    steps: ParcoursStep[];
}

interface CtaSectionPersonalization {
    title: string;
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
    parcoursSection: ParcoursSectionPersonalization;
    ctaSection: CtaSectionPersonalization;
    cta2Section: Cta2SectionPersonalization;
    jobOffersSection: JobOffersSectionPersonalization;
    videoSection: VideoSectionPersonalization;
    servicesSection: ServicesSectionPersonalization;
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
  { id: 'parcours', label: 'Parcours de transformation', enabled: true },
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
    parcoursSection: {
      title: "Votre parcours de transformation",
      subtitle: "Un cheminement structuré et bienveillant pour vous guider à chaque étape de votre évolution.",
      steps: [
          { id: `step-1`, title: "Étape 1: Bilan & Intention", description: "Faire le point sur votre situation, vos besoins et poser une intention claire." },
          { id: `step-2`, title: "Étape 2: Exploration", description: "Séances personnalisées alliant coaching et outils de développement personnel." },
          { id: `step-3`, title: "Étape 3: Intégration", description: "Nous consolidons vos acquis et mettons en place un plan d'action durable." },
          { id: `step-4`, title: "Étape 4: Épanouissement", description: "Vous repartez avec les clés pour poursuivre votre chemin en toute autonomie." }
      ]
    },
    ctaSection: {
        title: "Prêt à tester le futur ?",
        text: "Rejoignez notre communauté de bêta-testeurs et découvrez des applications innovantes avant tout le monde.",
        buttonText: "Devenir bêta-testeur",
        buttonLink: "#",
        bgColor: "#f0fdf4",
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
    agencyId?: string;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            const userDocRef = doc(firestore, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                const usersCollectionRef = collection(firestore, 'users');
                const usersSnapshot = await getDocs(usersCollectionRef);
                const isFirstUser = usersSnapshot.empty;
                
                const nameParts = firebaseUser.displayName?.split(' ') || [firebaseUser.email?.split('@')[0] || 'Utilisateur', ''];
                const firstName = nameParts.shift() || 'Nouveau';
                const lastName = nameParts.join(' ') || 'Utilisateur';

                const newUserDoc = {
                    id: firebaseUser.uid,
                    firstName: firstName,
                    lastName: lastName,
                    email: firebaseUser.email,
                    role: isFirstUser ? 'superadmin' : 'membre',
                    counselorId: isFirstUser ? firebaseUser.uid : '',
                    dateJoined: firebaseUser.metadata.creationTime,
                    lastSignInTime: firebaseUser.metadata.lastSignInTime,
                    phone: firebaseUser.phoneNumber || '',
                };

                await setDoc(userDocRef, newUserDoc);
            } else {
                const lastSignInTime = firebaseUser.metadata.lastSignInTime;
                await setDoc(userDocRef, { lastSignInTime }, { merge: true });
            }
        }
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};
