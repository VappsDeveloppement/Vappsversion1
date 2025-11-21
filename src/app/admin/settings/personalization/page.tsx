

'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GitBranch, Briefcase, PlusCircle, Trash2, Upload, Facebook, Twitter, Linkedin, Instagram, Settings, LayoutTemplate, ArrowUp, ArrowDown, ChevronDown, Link as LinkIcon, Eye, EyeOff, Info, Mail, Loader2, FlaskConical, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/context/agency-provider";
import { setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sendTestEmail } from "@/app/actions/email";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Link from 'next/link';

// Helper function to convert hex to HSL
const hexToHsl = (hex: string): string => {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return '0 0% 0%'; // fallback for invalid hex
  }

  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  
  const r_ = r / 255, g_ = g / 255, b_ = b / 255;
  const max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_: h = (g_ - b_) / d + (g_ < b_ ? 6 : 0); break;
      case g_: h = (b_ - r_) / d + 2; break;
      case b_: h = (r_ - g_) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});

export type AboutLink = {
  id: number;
  text: string;
  url: string;
  icon: string;
};

export type SocialLink = {
  id: number;
  name: string;
  url: string;
  icon: string;
};

export type HeroNavLink = {
  id: number;
  text: string;
  url: string;
};

export type ParcoursStep = {
  id: string;
  title: string;
  description: string;
};

export type JobOffer = {
  id: string;
  title: string;
  contractType: string;
  location: string;
};

export type SecondaryVideo = {
  id: string;
  url: string;
  title: string;
}

export type ServiceItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
};

const socialIconMap: { [key: string]: React.ComponentType<any> } = {
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
};

export type Section = {
  id: string;
  label: string;
  enabled: boolean;
  isLocked?: boolean; // To prevent moving certain sections like hero/footer
};


const defaultHomePageSections: Section[] = [
  { id: 'hero', label: 'Hero (Titre & Connexion)', enabled: true, isLocked: true },
  { id: 'about', label: 'À propos (Trouver votre voie)', enabled: true },
  { id: 'cta', label: "Appel à l'action (CTA)", enabled: true },
  { id: 'video', label: 'Vidéo', enabled: true },
  { id: 'directory', label: 'Annuaire des conseillers', enabled: true },
  { id: 'otherActivities', label: 'Autres activités & Contact', enabled: true },
  { id: 'blog', label: 'Blog', enabled: true },
  { id: 'whiteLabel', label: 'Marque Blanche', enabled: true },
  { id: 'jobOffers', label: 'Offre emploi', enabled: true },
];

const defaultPersonalization = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    appTitleColor: "#000000",
    appSubtitleColor: "#666666",
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    footerBgColor: "#111827",
    logoDataUrl: null as string | null,
    heroStyle: 'application', // 'application' (avec connexion) ou 'tunnel' (sans connexion)
    heroTitle: "Révélez votre potentiel et construisez une carrière qui vous ressemble.",
    heroSubtitle: "Un accompagnement sur-mesure pour votre épanouissement professionnel et personnel.",
    heroTitleColor: "#FFFFFF",
    heroSubtitleColor: "#E0E0E0",
    heroCta1Text: "Découvrir mes services",
    heroCta1Link: "/services",
    heroCta2Text: "Prendre rendez-vous",
    heroCta2Link: "/contact",
    heroImageUrl: null as string | null,
    heroBgColor: "#000000",
    heroAppTitle: "Un accompagnement holistique pour une évolution professionnelle alignée avec vos valeurs.",
    heroAppSubtitle: "Accédez à vos ressources, suivez vos progrès et communiquez avec votre coach.",
    heroAppCtaText: "Découvrir VApps",
    heroAppCtaLink: "#about",
    heroNavLinks: [
      { id: 1, text: "Approche", url: "#about" },
      { id: 2, text: "Parcours", url: "#parcours" },
      { id: 3, text: "Formules", url: "#pricing" },
      { id: 4, text: "Contact", url: "#contact" },
    ] as HeroNavLink[],
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
    homePageSections: defaultHomePageSections,
    legalInfo: {
        companyName: "", structureType: "", capital: "", siret: "", addressStreet: "", addressZip: "", addressCity: "",
        email: "", phone: "", apeNaf: "", rm: "", rcs: "", nda: "", insurance: "", isVatSubject: false, vatRate: "", vatNumber: "",
        legalMentions: "", cgv: "", privacyPolicy: ""
    },
    aboutSection: {
      mainTitle: "Trouver Votre Voie",
      mainSubtitle: "Une approche sur-mesure",
      mainImageUrl: null as string | null,
      mainText: "Chez Vapps, nous croyons qu'il n'existe pas de chemin unique. C'est pourquoi nous proposons une approche holistique et inclusive, qui prend en compte votre personnalité, vos compétences, vos envies et vos contraintes.",
      pillarsSectionTitle: "Les piliers de notre accompagnement",
      pillars: [
        { id: `pillar-${Date.now()}-1`, title: 'Nouveau Pilier', description: 'Description du nouveau pilier.', imageUrl: null },
        { id: `pillar-${Date.now()}-2`, title: 'Nouveau Pilier', description: 'Description du nouveau pilier.', imageUrl: null },
        { id: `pillar-${Date.now()}-3`, title: 'Nouveau Pilier', description: 'Description du nouveau pilier.', imageUrl: null },
      ],
      showExpertises: true,
      expertisesSectionTitle: "Nos expertises sectorielles",
      expertises: [
        { id: `expertise-${Date.now()}-1`, title: 'Nouvelle Expertise', description: 'Description de la nouvelle expertise.', imageUrl: null },
        { id: `expertise-${Date.now()}-2`, title: 'Nouvelle Expertise', description: 'Description de la nouvelle expertise.', imageUrl: null },
        { id: `expertise-${Date.now()}-3`, title: 'Nouvelle Expertise', description: 'Description de la nouvelle expertise.', imageUrl: null },
        { id: `expertise-${Date.now()}-4`, title: 'Nouvelle Expertise', description: 'Description de la nouvelle expertise.', imageUrl: null },
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
      ] as ParcoursStep[]
    },
    ctaSection: {
        title: "Prêt à tester le futur ?",
        text: "Rejoignez notre communauté de bêta-testeurs et découvrez des applications innovantes avant tout le monde.",
        buttonText: "Devenir bêta-testeur",
        buttonLink: "#",
        bgColor: "#f0fdf4",
        bgImageUrl: null as string | null
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
            { id: `job-${Date.now()}-1`, title: "Développeur Full-Stack", contractType: "CDI", location: "Paris, France" },
            { id: `job-${Date.now()}-2`, title: "Chef de Projet Digital", contractType: "CDI", location: "Lyon, France" },
            { id: `job-${Date.now()}-3`, title: "UX/UI Designer", contractType: "Alternance", location: "Télétravail" },
        ] as JobOffer[]
    },
    videoSection: {
        sectionTitle: "Découvrez l'approche Vapps en Vidéo",
        sectionSubtitle: "Plongez dans notre univers et découvrez comment notre accompagnement peut transformer votre parcours professionnel.",
        mainVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        secondaryVideos: [
            { id: `video-1`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Notre approche holistique" },
            { id: `video-2`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Définir vos objectifs de carrière" },
            { id: `video-3`, url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Témoignage : La reconversion de Sarah" }
        ] as SecondaryVideo[]
    },
    servicesSection: {
        title: "Nos Accompagnements",
        subtitle: "Construisons ensemble votre avenir",
        description: "Que vous soyez en quête de sens, en reconversion ou désireux d'évoluer, nous avons une solution pour vous.",
        services: [
            { id: `service-${Date.now()}-1`, title: 'Nouvel Accompagnement', description: 'Description du nouvel accompagnement.', imageUrl: null },
            { id: `service-${Date.now()}-2`, title: 'Nouvel Accompagnement', description: 'Description du nouvel accompagnement.', imageUrl: null },
            { id: `service-${Date.now()}-3`, title: 'Nouvel Accompagnement', description: 'Description du nouvel accompagnement.', imageUrl: null },
        ] as ServiceItem[]
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

const PayPalConnectionTest = () => {
    const { personalization, isLoading } = useAgency();
    const clientId = personalization?.paymentSettings?.paypalClientId;

    if (!clientId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration PayPal manquante</AlertTitle>
                <AlertDescription>
                   Votre Client ID PayPal n'est pas configuré. Impossible de tester l'intégration.
                </AlertDescription>
            </Alert>
        );
    }
    
    const initialOptions = {
        "client-id": clientId,
        currency: "EUR",
        intent: "capture",
    };

    return (
        <div>
            <Alert className='mb-6'>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Client ID trouvé</AlertTitle>
                <AlertDescription>
                    Tentative de chargement des boutons PayPal avec le Client ID fourni. Si les boutons s'affichent, votre configuration est probablement correcte.
                </AlertDescription>
            </Alert>

            <PayPalScriptProvider options={initialOptions}>
                <div className='max-w-md mx-auto'>
                     <PayPalButtons
                        style={{ layout: "vertical" }}
                        createOrder={(data, actions) => {
                            return actions.order.create({
                                purchase_units: [{
                                    description: "Test Transaction",
                                    amount: {
                                        value: "1.00",
                                        currency_code: "EUR"
                                    }
                                }]
                            });
                        }}
                         onApprove={(data, actions) => {
                            return actions.order!.capture().then(details => {
                                alert("Test transaction completed by " + details.payer.name?.given_name);
                            });
                        }}
                        onError={(err) => {
                            console.error("PayPal Button Error:", err);
                            alert("Une erreur est survenue avec le bouton PayPal. Vérifiez la console pour plus de détails. Votre Client ID est peut-être invalide.");
                        }}
                     />
                </div>
            </PayPalScriptProvider>
        </div>
    );
}


export default function PersonalizationPage() {
  const { toast } = useToast();
  const { agency, personalization, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();

  const [settings, setSettings] = useState(personalization || defaultPersonalization);
  const [logoPreview, setLogoPreview] = React.useState(personalization?.logoDataUrl || "/vapps.png");
  const [heroImagePreview, setHeroImagePreview] = React.useState(personalization?.heroImageUrl);
  const [aboutImagePreview, setAboutImagePreview] = React.useState(personalization?.aboutSection?.mainImageUrl);
  const [ctaImagePreview, setCtaImagePreview] = React.useState(personalization?.ctaSection?.bgImageUrl);
  const [cta2ImagePreview, setCta2ImagePreview] = React.useState(personalization?.cta2Section?.bgImageUrl);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (personalization) {
      setSettings(prev => ({
        ...defaultPersonalization,
        ...prev,
        ...personalization,
        homePageSections: personalization.homePageSections || defaultHomePageSections,
        heroNavLinks: personalization.heroNavLinks || [],
        aboutSection: {
            ...defaultPersonalization.aboutSection,
            ...(personalization.aboutSection || {})
        },
        parcoursSection: {
            ...defaultPersonalization.parcoursSection,
            ...(personalization.parcoursSection || {})
        },
        ctaSection: {
            ...defaultPersonalization.ctaSection,
            ...(personalization.ctaSection || {})
        },
        cta2Section: {
            ...defaultPersonalization.cta2Section,
            ...(personalization.cta2Section || {})
        },
        jobOffersSection: {
            ...defaultPersonalization.jobOffersSection,
            ...(personalization.jobOffersSection || {})
        },
        videoSection: {
          ...defaultPersonalization.videoSection,
          ...(personalization.videoSection || {})
        },
        servicesSection: {
          ...defaultPersonalization.servicesSection,
          ...(personalization.servicesSection || {})
        },
        paymentSettings: {
            ...defaultPersonalization.paymentSettings,
            ...(personalization.paymentSettings || {})
        },
        emailSettings: {
            ...defaultPersonalization.emailSettings,
            ...(personalization.emailSettings || {})
        },
        gdprSettings: {
            ...defaultPersonalization.gdprSettings,
            ...(personalization.gdprSettings || {})
        }
      }));
      if (personalization.logoDataUrl) {
          setLogoPreview(personalization.logoDataUrl);
      } else {
        setLogoPreview("/vapps.png")
      }
      if (personalization.heroImageUrl) {
        setHeroImagePreview(personalization.heroImageUrl);
      } else {
        setHeroImagePreview(null);
      }
       if (personalization.aboutSection?.mainImageUrl) {
        setAboutImagePreview(personalization.aboutSection.mainImageUrl);
      } else {
        setAboutImagePreview(null);
      }
       if (personalization.ctaSection?.bgImageUrl) {
        setCtaImagePreview(personalization.ctaSection.bgImageUrl);
      } else {
        setCtaImagePreview(null);
      }
      if (personalization.cta2Section?.bgImageUrl) {
        setCta2ImagePreview(personalization.cta2Section.bgImageUrl);
      } else {
        setCta2ImagePreview(null);
      }
    }
  }, [personalization]);

  const handleFieldChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAboutSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      aboutSection: {
        ...(prev.aboutSection || defaultPersonalization.aboutSection),
        [field]: value
      }
    }));
  };
  
  const handleAboutPillarChange = (index: number, field: 'title' | 'description' | 'imageUrl', value: string | null) => {
      const newPillars = [...(settings.aboutSection.pillars)];
      newPillars[index] = { ...newPillars[index], [field]: value };
      handleAboutSectionChange('pillars', newPillars);
  };

  const addPillar = () => {
    const newPillars = [
        ...(settings.aboutSection.pillars || []),
        { id: `pillar-${Date.now()}`, title: 'Nouveau Pilier', description: 'Description du nouveau pilier.', imageUrl: null },
    ];
    handleAboutSectionChange('pillars', newPillars);
  };

  const removePillar = (index: number) => {
    const newPillars = settings.aboutSection.pillars.filter((_, i) => i !== index);
    handleAboutSectionChange('pillars', newPillars);
  };
  
  const handleAboutExpertiseChange = (index: number, field: 'title' | 'description' | 'imageUrl', value: string | null) => {
      const newExpertises = [...(settings.aboutSection.expertises)];
      newExpertises[index] = { ...newExpertises[index], [field]: value };
      handleAboutSectionChange('expertises', newExpertises);
  };

  const addExpertise = () => {
    const newExpertises = [
        ...(settings.aboutSection.expertises || []),
        { id: `expertise-${Date.now()}`, title: 'Nouvelle Expertise', description: 'Description de la nouvelle expertise.', imageUrl: null },
    ];
    handleAboutSectionChange('expertises', newExpertises);
  };

  const removeExpertise = (index: number) => {
    const newExpertises = settings.aboutSection.expertises.filter((_, i) => i !== index);
    handleAboutSectionChange('expertises', newExpertises);
  };
  
    const handleParcoursSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      parcoursSection: {
        ...(prev.parcoursSection || defaultPersonalization.parcoursSection),
        [field]: value
      }
    }));
  };

  const handleParcoursStepChange = (index: number, field: 'title' | 'description', value: string) => {
      const newSteps = [...(settings.parcoursSection.steps)];
      newSteps[index] = { ...newSteps[index], [field]: value };
      handleParcoursSectionChange('steps', newSteps);
  };

  const addParcoursStep = () => {
    const newSteps = [
        ...(settings.parcoursSection.steps || []),
        { id: `step-${Date.now()}`, title: 'Nouvelle Étape', description: 'Description de la nouvelle étape.' },
    ];
    handleParcoursSectionChange('steps', newSteps);
  };

  const removeParcoursStep = (index: number) => {
    const newSteps = settings.parcoursSection.steps.filter((_, i) => i !== index);
    handleParcoursSectionChange('steps', newSteps);
  };

  const handleCtaSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      ctaSection: {
        ...(prev.ctaSection || defaultPersonalization.ctaSection),
        [field]: value
      }
    }));
  };
  
  const handleCta2SectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      cta2Section: {
        ...(prev.cta2Section || defaultPersonalization.cta2Section),
        [field]: value
      }
    }));
  };

  const handleJobOffersSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      jobOffersSection: {
        ...(prev.jobOffersSection || defaultPersonalization.jobOffersSection),
        [field]: value
      }
    }));
  };
  
  const handleJobOfferChange = (index: number, field: keyof JobOffer, value: string) => {
      const newOffers = [...(settings.jobOffersSection.offers)];
      (newOffers[index] as any)[field] = value;
      handleJobOffersSectionChange('offers', newOffers);
  };

  const addJobOffer = () => {
    const newOffers = [
        ...(settings.jobOffersSection.offers || []),
        { id: `job-${Date.now()}`, title: 'Nouveau Poste', contractType: 'CDI', location: 'À distance' },
    ];
    handleJobOffersSectionChange('offers', newOffers);
  };

  const removeJobOffer = (index: number) => {
    const newOffers = settings.jobOffersSection.offers.filter((_, i) => i !== index);
    handleJobOffersSectionChange('offers', newOffers);
  };

  const handleVideoSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      videoSection: {
        ...(prev.videoSection || defaultPersonalization.videoSection),
        [field]: value
      }
    }));
  };

  const handleSecondaryVideoChange = (index: number, field: 'url' | 'title', value: string) => {
    const newVideos = [...(settings.videoSection.secondaryVideos)];
    newVideos[index] = { ...newVideos[index], [field]: value };
    handleVideoSectionChange('secondaryVideos', newVideos);
  };

  const addSecondaryVideo = () => {
    const newVideos = [
        ...(settings.videoSection.secondaryVideos || []),
        { id: `video-${Date.now()}`, url: '', title: 'Nouveau titre' },
    ];
    handleVideoSectionChange('secondaryVideos', newVideos);
  };

  const removeSecondaryVideo = (index: number) => {
    const newVideos = settings.videoSection.secondaryVideos.filter((_, i) => i !== index);
    handleVideoSectionChange('secondaryVideos', newVideos);
  };
  
    const handleServicesSectionChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      servicesSection: {
        ...(prev.servicesSection || defaultPersonalization.servicesSection),
        [field]: value
      }
    }));
  };

  const handleAccompagnementChange = (index: number, field: keyof ServiceItem, value: string | null) => {
      const newServices = [...(settings.servicesSection.services)];
      (newServices[index] as any)[field] = value;
      handleServicesSectionChange('services', newServices);
  };

  const addAccompagnement = () => {
    const newServices = [
        ...(settings.servicesSection.services || []),
        { id: `service-${Date.now()}`, title: 'Nouvel Accompagnement', description: 'Description du nouvel accompagnement.', imageUrl: null },
    ];
    handleServicesSectionChange('services', newServices);
  };

  const removeAccompagnement = (index: number) => {
    const newServices = settings.servicesSection.services.filter((_, i) => i !== index);
    handleServicesSectionChange('services', newServices);
  };


  const handleLegalInfoChange = (field: string, value: any) => {
    setSettings(prev => ({
        ...prev,
        legalInfo: {
            ...prev.legalInfo,
            [field]: value
        }
    }))
  }

  const handlePaymentSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({
        ...prev,
        paymentSettings: {
            ...prev.paymentSettings,
            [field]: value
        }
    }))
  }

  const handleEmailSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({
        ...prev,
        emailSettings: {
            ...prev.emailSettings,
            [field]: value
        }
    }))
  }

  const handleGdprSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      gdprSettings: {
        ...(prev.gdprSettings || defaultPersonalization.gdprSettings),
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    if (!agency) {
      toast({ title: "Erreur", description: "Agence non trouvée.", variant: "destructive" });
      return;
    }
    const agencyRef = doc(firestore, 'agencies', agency.id);
    setDocumentNonBlocking(agencyRef, { personalization: settings }, { merge: true });
    toast({ title: "Paramètres enregistrés", description: "Vos paramètres ont été sauvegardés." });
  };
  
  const handleResetAppearance = () => {
      const resetSettings = {
        ...settings,
        ...defaultPersonalization
      };
      setSettings(resetSettings);
      setLogoPreview(defaultPersonalization.logoDataUrl || "/vapps.png");
      setHeroImagePreview(defaultPersonalization.heroImageUrl);

      if (!agency) return;
      const agencyRef = doc(firestore, 'agencies', agency.id);
      setDocumentNonBlocking(agencyRef, { personalization: resetSettings }, { merge: true });
      toast({ title: "Réinitialisation", description: "Les paramètres d'apparence ont été réinitialisés." });
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
        toast({ title: "Erreur", description: "Veuillez saisir une adresse e-mail de destination.", variant: "destructive"});
        return;
    }
    setIsTestingEmail(true);
    const result = await sendTestEmail({ settings: settings.emailSettings, recipient: testEmail });
    setIsTestingEmail(false);

    if (result.success) {
        toast({ title: "Succès", description: "E-mail de test envoyé avec succès à " + testEmail });
    } else {
        toast({ title: "Échec de l'envoi", description: result.error, variant: "destructive" });
    }
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
        toBase64(file).then(callback);
    }
  };

  const createUploadHandler = (callback: (base64: string) => void) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(event, callback);
  };
  
  const handleLinkChange = (index: number, field: keyof AboutLink, value: string) => {
    const newLinks = [...(settings.footerAboutLinks || [])];
    (newLinks[index] as any)[field] = value;
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const addLink = () => {
    const newLinks = [
      ...(settings.footerAboutLinks || []),
      { id: Date.now(), text: 'Nouveau lien', url: '#', icon: 'GitBranch' },
    ];
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = (settings.footerAboutLinks || []).filter((_, i) => i !== index);
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const handleSocialLinkChange = (index: number, url: string) => {
    const newLinks = [...(settings.footerSocialLinks || [])];
    newLinks[index].url = url;
    handleFieldChange('footerSocialLinks', newLinks);
  };

  const handleHeroNavLinkChange = (index: number, field: keyof HeroNavLink, value: string) => {
    const newLinks = [...(settings.heroNavLinks || [])];
    (newLinks[index] as any)[field] = value;
    handleFieldChange('heroNavLinks', newLinks);
  };

  const addHeroNavLink = () => {
    const newLinks = [
      ...(settings.heroNavLinks || []),
      { id: Date.now(), text: 'Nouveau', url: '#' },
    ];
    handleFieldChange('heroNavLinks', newLinks);
  };

  const removeHeroNavLink = (index: number) => {
    const newLinks = (settings.heroNavLinks || []).filter((_, i) => i !== index);
    handleFieldChange('heroNavLinks', newLinks);
  };
  
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const currentSections = [...(settings.homePageSections || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
  
    if (newIndex < 0 || newIndex >= currentSections.length || currentSections[index].isLocked || currentSections[newIndex].isLocked) {
      return;
    }
  
    const newSections = [...currentSections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]]; // Swap
    handleFieldChange('homePageSections', newSections);
  };

  const handleSectionToggle = (id: string, enabled: boolean) => {
    const newSections = (settings.homePageSections || []).map(section => 
      section.id === id ? { ...section, enabled } : section
    );
    handleFieldChange('homePageSections', newSections);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && settings) {
        document.documentElement.style.setProperty('--primary', hexToHsl(settings.primaryColor));
        document.documentElement.style.setProperty('--secondary', hexToHsl(settings.secondaryColor));
        document.documentElement.style.setProperty('--background', hexToHsl(settings.bgColor));
    }
  }, [settings?.primaryColor, settings?.secondaryColor, settings?.bgColor]);
  
  if (isAgencyLoading) {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
            <Skeleton className="h-10 w-full" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
        <p className="text-muted-foreground">
          Gérez la personnalisation de la plateforme.
        </p>
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />


      <Tabs defaultValue="info-legales">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
          <TabsTrigger value="info-legales">Infos Légales</TabsTrigger>
          <TabsTrigger value="apparence">Apparence</TabsTrigger>
          <TabsTrigger value="accueil">Page d'accueil</TabsTrigger>
          <TabsTrigger value="paiement">Paiement</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="info-legales">
          <Card>
            <CardHeader>
              <CardTitle>Informations et Documents Légaux</CardTitle>
              <CardDescription>Gérez les informations légales de votre entreprise et le contenu de vos documents. Ces informations seront affichées sur votre site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
              
              <section>
                <h3 className="text-xl font-semibold mb-6 border-b pb-2">Informations sur l'entreprise</h3>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="company-name">Nom de l'entreprise / conseiller</Label>
                        <Input id="company-name" placeholder="Votre Nom Commercial" value={settings.legalInfo?.companyName} onChange={e => handleLegalInfoChange('companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="structure-type">Type de structure</Label>
                        <Input id="structure-type" placeholder="SARL, SAS, Auto-entrepreneur..." value={settings.legalInfo?.structureType} onChange={e => handleLegalInfoChange('structureType', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="capital">Capital</Label>
                        <Input id="capital" type="number" placeholder="1000" value={settings.legalInfo?.capital} onChange={e => handleLegalInfoChange('capital', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="siret">SIRET</Label>
                        <Input id="siret" placeholder="12345678901234" value={settings.legalInfo?.siret} onChange={e => handleLegalInfoChange('siret', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Adresse</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input placeholder="Numéro et nom de rue" className="sm:col-span-3" value={settings.legalInfo?.addressStreet} onChange={e => handleLegalInfoChange('addressStreet', e.target.value)} />
                        <Input placeholder="Code Postal" value={settings.legalInfo?.addressZip} onChange={e => handleLegalInfoChange('addressZip', e.target.value)} />
                        <Input placeholder="Ville" className="sm:col-span-2" value={settings.legalInfo?.addressCity} onChange={e => handleLegalInfoChange('addressCity', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" placeholder="contact@exemple.com" value={settings.legalInfo?.email} onChange={e => handleLegalInfoChange('email', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" type="tel" placeholder="0123456789" value={settings.legalInfo?.phone} onChange={e => handleLegalInfoChange('phone', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="ape-naf">APE/NAF</Label>
                        <Input id="ape-naf" placeholder="6201Z" value={settings.legalInfo?.apeNaf} onChange={e => handleLegalInfoChange('apeNaf', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="rm">RM (optionnel)</Label>
                        <Input id="rm" placeholder="Numéro RM" value={settings.legalInfo?.rm} onChange={e => handleLegalInfoChange('rm', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-medium mb-4">Paramètres de TVA</h4>
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3">
                            <Switch id="vat-subject" checked={settings.legalInfo?.isVatSubject} onCheckedChange={checked => handleLegalInfoChange('isVatSubject', checked)} />
                            <Label htmlFor="vat-subject">Assujetti à la TVA (non applicable pour le régime micro-entreprise)</Label>
                            </div>

                            {settings.legalInfo?.isVatSubject && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 border-l ml-2">
                                <div className="space-y-2">
                                <Label htmlFor="vat-rate">Taux de TVA (%)</Label>
                                <Input id="vat-rate" type="number" placeholder="20" value={settings.legalInfo.vatRate} onChange={e => handleLegalInfoChange('vatRate', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="vat-number">Numéro de TVA Intracommunautaire</Label>
                                <Input id="vat-number" placeholder="FR12345678901" value={settings.legalInfo.vatNumber} onChange={e => handleLegalInfoChange('vatNumber', e.target.value)} />
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-medium mb-4">Informations optionnelles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="rcs">RCS (Numéro et Ville)</Label>
                                <Input id="rcs" placeholder="Paris B 123 456 789" value={settings.legalInfo?.rcs} onChange={e => handleLegalInfoChange('rcs', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nda">Numéro NDA (Formation)</Label>
                                <Input id="nda" placeholder="Numéro de déclaration d'activité" value={settings.legalInfo?.nda} onChange={e => handleLegalInfoChange('nda', e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="insurance">Police d'assurance</Label>
                                <Input id="insurance" placeholder="Nom de l'assurance et numéro de contrat" value={settings.legalInfo?.insurance} onChange={e => handleLegalInfoChange('insurance', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
              </section>

              <div className="border-t"></div>

              <section>
                 <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu des documents</h3>
                 <div className="space-y-8">
                    <div>
                        <Label htmlFor="legal-mentions" className="text-lg font-medium">Mentions Légales</Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={settings.legalInfo?.legalMentions || ''}
                            onChange={content => handleLegalInfoChange('legalMentions', content)}
                            placeholder="Rédigez vos mentions légales ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="cgv" className="text-lg font-medium">Conditions Générales de Vente (CGV)</Label>
                        <div className="mt-2">
                           <RichTextEditor
                            content={settings.legalInfo?.cgv || ''}
                            onChange={content => handleLegalInfoChange('cgv', content)}
                            placeholder="Rédigez vos conditions générales de vente ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="privacy-policy" className="text-lg font-medium">Politique de confidentialité</Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={settings.legalInfo?.privacyPolicy || ''}
                            onChange={content => handleLegalInfoChange('privacyPolicy', content)}
                            placeholder="Rédigez votre politique de confidentialité ici..."
                          />
                        </div>
                    </div>
                 </div>
              </section>
              
              <div className="flex justify-end pt-6 border-t">
                <Button onClick={handleSave}>Enregistrer les modifications</Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apparence">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Modifiez les couleurs, le logo et l'apparence générale de votre espace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="app-title">Titre de l'application</Label>
                        <Input id="app-title" value={settings.appTitle} onChange={(e) => handleFieldChange('appTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="app-title-color">Couleur du titre</Label>
                        <div className="flex items-center gap-2">
                            <Input type="color" value={settings.appTitleColor} onChange={(e) => handleFieldChange('appTitleColor', e.target.value)} className="w-10 h-10 p-1"/>
                            <Input id="app-title-color" value={settings.appTitleColor} onChange={(e) => handleFieldChange('appTitleColor', e.target.value)} />
                        </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="app-subtitle">Sous-titre de l'application</Label>
                        <Input id="app-subtitle" value={settings.appSubtitle} onChange={(e) => handleFieldChange('appSubtitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="app-subtitle-color">Couleur du sous-titre</Label>
                        <div className="flex items-center gap-2">
                            <Input type="color" value={settings.appSubtitleColor} onChange={(e) => handleFieldChange('appSubtitleColor', e.target.value)} className="w-10 h-10 p-1"/>
                            <Input id="app-subtitle-color" value={settings.appSubtitleColor} onChange={(e) => handleFieldChange('appSubtitleColor', e.target.value)} />
                        </div>
                    </div>
                  </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Logo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label>Fichier du logo</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 flex items-center justify-center rounded-md border bg-muted relative">
                                    {logoPreview && <Image src={logoPreview} alt="Aperçu du logo" layout="fill" objectFit="contain" />}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={createUploadHandler(base64 => {
                                      setLogoPreview(base64);
                                      handleFieldChange('logoDataUrl', base64);
                                    })}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                />
                                <div className="flex flex-col gap-2">
                                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Uploader
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => {
                                      setLogoPreview("/vapps.png");
                                      handleFieldChange('logoDataUrl', null);
                                  }}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                  </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Formats recommandés : SVG, PNG, JPG.</p>
                        </div>
                         <div className="space-y-4">
                            <Label>Largeur du logo (en pixels)</Label>
                            <div className="space-y-2">
                                <Label htmlFor="logo-width" className="flex items-center justify-between">
                                    <span>Largeur</span>
                                    <span className="text-sm text-muted-foreground">{settings.logoWidth}px</span>
                                </Label>
                                <Slider
                                    id="logo-width"
                                    min={10}
                                    max={200}
                                    step={1}
                                    value={[settings.logoWidth || 40]}
                                    onValueChange={(value) => handleFieldChange('logoWidth', value[0])}
                                />
                            </div>
                        </div>
                    </div>
                     <div>
                        <Label className="mb-3 block">Affichage</Label>
                        <RadioGroup value={settings.logoDisplay} onValueChange={(value) => handleFieldChange('logoDisplay', value)} className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="app-and-logo" id="app-and-logo" />
                                <Label htmlFor="app-and-logo">Nom de l'application et logo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="logo-only" id="logo-only" />
                                <Label htmlFor="logo-only">Logo uniquement</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Couleurs du thème</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="primary-color">Couleur Primaire</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.primaryColor} onChange={(e) => handleFieldChange('primaryColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="primary-color" value={settings.primaryColor} onChange={(e) => handleFieldChange('primaryColor', e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="secondary-color">Couleur Secondaire</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.secondaryColor} onChange={(e) => handleFieldChange('secondaryColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="secondary-color" value={settings.secondaryColor} onChange={(e) => handleFieldChange('secondaryColor', e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bg-color">Couleur de Fond</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.bgColor} onChange={(e) => handleFieldChange('bgColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="bg-color" value={settings.bgColor} onChange={(e) => handleFieldChange('bgColor', e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footer-bg-color">Fond du Pied de page</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.footerBgColor} onChange={(e) => handleFieldChange('footerBgColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="footer-bg-color" value={settings.footerBgColor} onChange={(e) => handleFieldChange('footerBgColor', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Section "À propos"</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="footer-about-title">Titre de la section</Label>
                            <Input id="footer-about-title" value={settings.footerAboutTitle} onChange={(e) => handleFieldChange('footerAboutTitle', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footer-about-text">Texte de description</Label>
                            <Textarea id="footer-about-text" value={settings.footerAboutText} onChange={(e) => handleFieldChange('footerAboutText', e.target.value)} />
                        </div>
                        <div>
                            <Label>Liens personnalisés</Label>
                            <div className="space-y-4 mt-2">
                                {settings.footerAboutLinks.map((link, index) => (
                                    <div key={link.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <Input 
                                                placeholder="Texte du lien"
                                                value={link.text}
                                                onChange={(e) => handleLinkChange(index, 'text', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Input 
                                                placeholder="URL (ex: /contact)"
                                                value={link.url}
                                                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Select value={link.icon} onValueChange={(value) => handleLinkChange(index, 'icon', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Icône" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GitBranch">Branche</SelectItem>
                                                    <SelectItem value="Briefcase">Mallette</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1">
                                            <Button variant="ghost" size="icon" onClick={() => removeLink(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addLink}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un lien
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Réseaux Sociaux</h3>
                    <div className="space-y-4">
                        {settings.footerSocialLinks.map((link, index) => {
                            const Icon = socialIconMap[link.icon];
                            return (
                                <div key={link.id} className="flex items-center gap-4">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                    <div className="flex-1">
                                        <Label htmlFor={`social-link-${link.name}`}>{link.name}</Label>
                                        <Input
                                            id={`social-link-${link.name}`}
                                            placeholder={`URL de votre page ${link.name}`}
                                            value={link.url}
                                            onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t -mx-6"></div>
                
                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Copyright</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="copyright-text">Texte du Copyright</Label>
                            <Input id="copyright-text" value={settings.copyrightText} onChange={(e) => handleFieldChange('copyrightText', e.target.value)} placeholder="Votre Nom d'Entreprise" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="copyright-url">URL du lien Copyright</Label>
                            <Input id="copyright-url" value={settings.copyrightUrl} onChange={(e) => handleFieldChange('copyrightUrl', e.target.value)} placeholder="/"/>
                        </div>
                    </div>
                </div>


                 <div className="flex justify-start pt-6 border-t gap-2">
                    <Button onClick={handleSave} style={{backgroundColor: settings.primaryColor}}>Sauvegarder les changements</Button>
                    <Button variant="outline" onClick={handleResetAppearance}>Réinitialiser</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accueil">
          <Card>
            <CardHeader>
              <CardTitle>Page d'accueil</CardTitle>
              <CardDescription>Configurez le contenu de la page d'accueil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                 <h3 className="text-lg font-medium mb-4">Organisation des sections</h3>
                 <p className="text-sm text-muted-foreground mb-6">Réorganisez les sections de la page d'accueil. Activez ou désactivez les sections selon vos besoins.</p>
                 
                 <Accordion type="single" collapsible className="w-full space-y-2">
                    {(settings.homePageSections || []).map((section, index) => {
                       return(
                        <AccordionItem value={section.id} key={section.id} className="border rounded-lg bg-background overflow-hidden">
                            <div className="flex items-center gap-2 p-3">
                                <AccordionTrigger className="flex-1 p-0 hover:no-underline">
                                    <div className="flex-1 text-left font-medium">{section.label}</div>
                                </AccordionTrigger>
                                
                                {!section.isLocked && (
                                    <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'up')}}
                                        disabled={index === 0 || (settings.homePageSections && settings.homePageSections[index - 1].isLocked)}
                                        className="h-8 w-8"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'down')}}
                                        disabled={index === settings.homePageSections.length - 1 || (settings.homePageSections[index + 1] && settings.homePageSections[index + 1].isLocked)}
                                        className="h-8 w-8"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    </div>
                                )}

                                <div onClick={(e) => e.stopPropagation()} className="p-2">
                                  <Switch
                                      checked={section.enabled}
                                      onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                                  />
                                </div>
                                <AccordionTrigger className="p-0 [&_svg]:ml-2">
                                  <span className="sr-only">Toggle section content</span>
                                </AccordionTrigger>
                            </div>
                            <AccordionContent>
                                <div className="p-6 border-t bg-muted/50">
                                {section.id === 'hero' ? (
                                    <div className="space-y-6">
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-medium">Image de fond & Couleur</h4>
                                            <div className="flex items-center gap-4 mt-4">
                                                <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden" style={{backgroundColor: heroImagePreview ? 'transparent' : settings.heroBgColor}}>
                                                    {heroImagePreview ? (
                                                        <Image src={heroImagePreview} alt="Aperçu du Héro" layout="fill" objectFit="cover" />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground p-2 text-center">Couleur de fond active</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={createUploadHandler(base64 => {
                                                        setHeroImagePreview(base64);
                                                        handleFieldChange('heroImageUrl', base64);
                                                    })}
                                                    className="hidden"
                                                    accept="image/png, image/jpeg"
                                                />
                                                <div className="flex flex-col gap-2">
                                                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                                      <Upload className="mr-2 h-4 w-4" />
                                                      Changer l'image
                                                  </Button>
                                                  <Button variant="destructive" size="sm" onClick={() => {
                                                        setHeroImagePreview(null);
                                                        handleFieldChange('heroImageUrl', null);
                                                  }}>
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Supprimer
                                                  </Button>
                                                </div>
                                            </div>
                                             <div className="space-y-2 mt-4">
                                                <Label htmlFor="hero-bg-color">Couleur de fond (si pas d'image)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="color" value={settings.heroBgColor} onChange={(e) => handleFieldChange('heroBgColor', e.target.value)} className="w-10 h-10 p-1"/>
                                                    <Input id="hero-bg-color" value={settings.heroBgColor} onChange={(e) => handleFieldChange('heroBgColor', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-semibold text-base mb-4">Contenu pour le Héro "Avec connexion"</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-app-title">Titre</Label>
                                                    <Textarea id="hero-app-title" value={settings.heroAppTitle} onChange={(e) => handleFieldChange('heroAppTitle', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-app-subtitle">Sous-titre</Label>
                                                    <Textarea id="hero-app-subtitle" value={settings.heroAppSubtitle} onChange={(e) => handleFieldChange('heroAppSubtitle', e.target.value)} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-app-cta-text">Texte du bouton</Label>
                                                        <Input id="hero-app-cta-text" value={settings.heroAppCtaText} onChange={(e) => handleFieldChange('heroAppCtaText', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-app-cta-link">Lien du bouton</Label>
                                                        <Input id="hero-app-cta-link" value={settings.heroAppCtaLink} onChange={(e) => handleFieldChange('heroAppCtaLink', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-semibold text-base mb-4">Contenu pour le Héro "Sans connexion"</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-title">Titre du Héro</Label>
                                                    <Textarea id="hero-title" value={settings.heroTitle} onChange={(e) => handleFieldChange('heroTitle', e.target.value)} />
                                                </div>
                                                 <div className="space-y-2">
                                                    <Label htmlFor="hero-title-color">Couleur du titre</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" value={settings.heroTitleColor} onChange={(e) => handleFieldChange('heroTitleColor', e.target.value)} className="w-10 h-10 p-1"/>
                                                        <Input id="hero-title-color" value={settings.heroTitleColor} onChange={(e) => handleFieldChange('heroTitleColor', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-subtitle">Sous-titre du Héro</Label>
                                                    <Textarea id="hero-subtitle" value={settings.heroSubtitle} onChange={(e) => handleFieldChange('heroSubtitle', e.target.value)} />
                                                </div>
                                                 <div className="space-y-2">
                                                    <Label htmlFor="hero-subtitle-color">Couleur du sous-titre</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" value={settings.heroSubtitleColor} onChange={(e) => handleFieldChange('heroSubtitleColor', e.target.value)} className="w-10 h-10 p-1"/>
                                                        <Input id="hero-subtitle-color" value={settings.heroSubtitleColor} onChange={(e) => handleFieldChange('heroSubtitleColor', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-cta1-text">Texte CTA 1</Label>
                                                        <Input id="hero-cta1-text" value={settings.heroCta1Text} onChange={(e) => handleFieldChange('heroCta1Text', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-cta1-link">Lien CTA 1</Label>
                                                        <Input id="hero-cta1-link" value={settings.heroCta1Link} onChange={(e) => handleFieldChange('heroCta1Link', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-cta2-text">Texte CTA 2</Label>
                                                        <Input id="hero-cta2-text" value={settings.heroCta2Text} onChange={(e) => handleFieldChange('heroCta2Text', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="hero-cta2-link">Lien CTA 2</Label>
                                                        <Input id="hero-cta2-link" value={settings.heroCta2Link} onChange={(e) => handleFieldChange('heroCta2Link', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>Menu de navigation (pour Héro "Sans connexion")</Label>
                                                    <div className="space-y-4 mt-2">
                                                        {(settings.heroNavLinks || []).map((link, index) => (
                                                            <div key={link.id} className="grid grid-cols-11 gap-2 items-center">
                                                                <div className="col-span-5">
                                                                    <Input 
                                                                        placeholder="Texte du lien"
                                                                        value={link.text}
                                                                        onChange={(e) => handleHeroNavLinkChange(index, 'text', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-5">
                                                                    <Input 
                                                                        placeholder="URL (ex: #contact)"
                                                                        value={link.url}
                                                                        onChange={(e) => handleHeroNavLinkChange(index, 'url', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <Button variant="ghost" size="icon" onClick={() => removeHeroNavLink(index)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <Button variant="outline" size="sm" onClick={addHeroNavLink}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Ajouter un lien de navigation
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : section.id === 'about' ? (
                                    <div className="space-y-8">
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu Principal</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="about-main-title">Titre principal</Label>
                                                <Input id="about-main-title" value={settings.aboutSection?.mainTitle} onChange={(e) => handleAboutSectionChange('mainTitle', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="about-main-subtitle">Sous-titre</Label>
                                                <Input id="about-main-subtitle" value={settings.aboutSection?.mainSubtitle} onChange={(e) => handleAboutSectionChange('mainSubtitle', e.target.value)} />
                                            </div>
                                         </div>
                                         <div className="mt-6 space-y-2">
                                            <Label htmlFor="about-main-text">Texte principal</Label>
                                            <Textarea id="about-main-text" value={settings.aboutSection?.mainText} onChange={(e) => handleAboutSectionChange('mainText', e.target.value)} rows={5} />
                                         </div>
                                         <div className="mt-6">
                                            <Label>Image principale</Label>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                   {aboutImagePreview ? (
                                                        <Image src={aboutImagePreview} alt="Aperçu de l'image À Propos" layout="fill" objectFit="cover" />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={createUploadHandler(base64 => {
                                                        setAboutImagePreview(base64);
                                                        handleAboutSectionChange('mainImageUrl', base64);
                                                    })}
                                                    className="hidden"
                                                    accept="image/png, image/jpeg"
                                                />
                                                <div className="flex flex-col gap-2">
                                                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                                      <Upload className="mr-2 h-4 w-4" />
                                                      Uploader
                                                  </Button>
                                                  <Button variant="destructive" size="sm" onClick={() => {
                                                      setAboutImagePreview(null);
                                                      handleAboutSectionChange('mainImageUrl', null);
                                                  }}>
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Supprimer
                                                  </Button>
                                                </div>
                                            </div>
                                         </div>
                                      </section>

                                      <div className="border-t -mx-6"></div>

                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Piliers de l'accompagnement</h3>
                                         <div className="space-y-2 mb-6">
                                            <Label htmlFor="about-pillars-title">Titre de la section des piliers</Label>
                                            <Input id="about-pillars-title" value={settings.aboutSection?.pillarsSectionTitle} onChange={(e) => handleAboutSectionChange('pillarsSectionTitle', e.target.value)} />
                                         </div>
                                         <div className="space-y-6">
                                            {settings.aboutSection.pillars.map((pillar, index) => (
                                                <div key={pillar.id} className="p-4 border rounded-lg space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-medium">Pilier {index + 1}</h4>
                                                        <Button variant="ghost" size="icon" onClick={() => removePillar(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`pillar-title-${index}`}>Titre</Label>
                                                            <Input id={`pillar-title-${index}`} value={pillar.title} onChange={(e) => handleAboutPillarChange(index, 'title', e.target.value)} />
                                                        </div>
                                                         <div className="space-y-2">
                                                            <Label htmlFor={`pillar-desc-${index}`}>Description</Label>
                                                            <Input id={`pillar-desc-${index}`} value={pillar.description} onChange={(e) => handleAboutPillarChange(index, 'description', e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <Label>Image du pilier</Label>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                                {pillar.imageUrl ? (
                                                                    <Image src={pillar.imageUrl} alt={`Aperçu pour ${pillar.title}`} layout="fill" objectFit="cover" />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => {
                                                                    const currentRef = fileInputRef.current;
                                                                    if (currentRef) {
                                                                        currentRef.onchange = createUploadHandler(base64 => handleAboutPillarChange(index, 'imageUrl', base64));
                                                                        currentRef.click();
                                                                    }
                                                                }}>
                                                                    <Upload className="mr-2 h-4 w-4" /> Uploader
                                                                </Button>
                                                                <Button variant="destructive" size="sm" onClick={() => handleAboutPillarChange(index, 'imageUrl', null)}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <Button variant="outline" size="sm" onClick={addPillar} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter un pilier
                                         </Button>
                                      </section>

                                      <div className="border-t -mx-6"></div>
                                      
                                      <section>
                                         <div className="flex items-center justify-between mb-6 border-b pb-2">
                                            <h3 className="text-xl font-semibold">Expertises Sectorielles</h3>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="show-expertises">Afficher la section</Label>
                                                <Switch
                                                    id="show-expertises"
                                                    checked={settings.aboutSection?.showExpertises}
                                                    onCheckedChange={(checked) => handleAboutSectionChange('showExpertises', checked)}
                                                />
                                            </div>
                                         </div>
                                         {settings.aboutSection?.showExpertises && (
                                            <>
                                                <div className="space-y-2 mb-6">
                                                    <Label htmlFor="about-expertises-title">Titre de la section des expertises</Label>
                                                    <Input id="about-expertises-title" value={settings.aboutSection?.expertisesSectionTitle} onChange={(e) => handleAboutSectionChange('expertisesSectionTitle', e.target.value)} />
                                                </div>
                                                <div className="space-y-6">
                                                    {settings.aboutSection.expertises.map((expertise, index) => (
                                                        <div key={expertise.id} className="p-4 border rounded-lg space-y-4">
                                                          <div className="flex justify-between items-center">
                                                            <h4 className="font-medium">Expertise {index + 1}</h4>
                                                            <Button variant="ghost" size="icon" onClick={() => removeExpertise(index)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                          </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                              <div className="space-y-2">
                                                                  <Label htmlFor={`expertise-title-${index}`}>Titre</Label>
                                                                  <Input id={`expertise-title-${index}`} value={expertise.title} onChange={(e) => handleAboutExpertiseChange(index, 'title', e.target.value)} />
                                                              </div>
                                                              <div className="space-y-2">
                                                                  <Label htmlFor={`expertise-desc-${index}`}>Description</Label>
                                                                  <Input id={`expertise-desc-${index}`} value={expertise.description} onChange={(e) => handleAboutExpertiseChange(index, 'description', e.target.value)} />
                                                              </div>
                                                            </div>
                                                            <div className="mt-4">
                                                                <Label>Image de l'expertise</Label>
                                                                <div className="flex items-center gap-4 mt-2">
                                                                    <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                                        {expertise.imageUrl ? (
                                                                            <Image src={expertise.imageUrl} alt={`Aperçu pour ${expertise.title}`} layout="fill" objectFit="cover" />
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <Button variant="outline" size="sm" onClick={() => {
                                                                            const currentRef = fileInputRef.current;
                                                                            if (currentRef) {
                                                                                currentRef.onchange = createUploadHandler(base64 => handleAboutExpertiseChange(index, 'imageUrl', base64));
                                                                                currentRef.click();
                                                                            }
                                                                        }}>
                                                                            <Upload className="mr-2 h-4 w-4" /> Uploader
                                                                        </Button>
                                                                        <Button variant="destructive" size="sm" onClick={() => handleAboutExpertiseChange(index, 'imageUrl', null)}>
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={addExpertise} className="mt-4">
                                                  <PlusCircle className="mr-2 h-4 w-4" />
                                                  Ajouter une expertise
                                                </Button>
                                            </>
                                         )}
                                      </section>
                                    </div>
                                ) : section.id === 'parcours' ? (
                                    <div className="space-y-8">
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu de la section</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="parcours-title">Titre principal</Label>
                                                <Input id="parcours-title" value={settings.parcoursSection.title} onChange={(e) => handleParcoursSectionChange('title', e.target.value)} />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="parcours-subtitle">Sous-titre</Label>
                                                <Textarea id="parcours-subtitle" value={settings.parcoursSection.subtitle} onChange={(e) => handleParcoursSectionChange('subtitle', e.target.value)} />
                                            </div>
                                         </div>
                                      </section>

                                      <div className="border-t -mx-6"></div>

                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Étapes du parcours</h3>
                                         <div className="space-y-6">
                                            {settings.parcoursSection.steps.map((step, index) => (
                                                <div key={step.id} className="p-4 border rounded-lg space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-medium">Étape {index + 1}</h4>
                                                        <Button variant="ghost" size="icon" onClick={() => removeParcoursStep(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`step-title-${index}`}>Titre de l'étape</Label>
                                                        <Input id={`step-title-${index}`} value={step.title} onChange={(e) => handleParcoursStepChange(index, 'title', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`step-desc-${index}`}>Description</Label>
                                                        <Textarea id={`step-desc-${index}`} value={step.description} onChange={(e) => handleParcoursStepChange(index, 'description', e.target.value)} />
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <Button variant="outline" size="sm" onClick={addParcoursStep} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter une étape
                                         </Button>
                                      </section>
                                    </div>
                                ) : section.id === 'cta' ? (
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="font-medium">Contenu</h4>
                                            <div className="space-y-4 mt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cta-title">Titre</Label>
                                                    <Input id="cta-title" value={settings.ctaSection?.title} onChange={e => handleCtaSectionChange('title', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="cta-text">Texte</Label>
                                                    <Textarea id="cta-text" value={settings.ctaSection?.text} onChange={e => handleCtaSectionChange('text', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Bouton</h4>
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cta-button-text">Texte du bouton</Label>
                                                    <Input id="cta-button-text" value={settings.ctaSection?.buttonText} onChange={e => handleCtaSectionChange('buttonText', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="cta-button-link">Lien du bouton</Label>
                                                    <Input id="cta-button-link" value={settings.ctaSection?.buttonLink} onChange={e => handleCtaSectionChange('buttonLink', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Arrière-plan</h4>
                                            <div className="grid grid-cols-2 gap-8 mt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cta-bg-color">Couleur de fond</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" value={settings.ctaSection?.bgColor} onChange={e => handleCtaSectionChange('bgColor', e.target.value)} className="w-10 h-10 p-1"/>
                                                        <Input id="cta-bg-color" value={settings.ctaSection?.bgColor} onChange={e => handleCtaSectionChange('bgColor', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <Label>Image de fond</Label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-20 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden" style={{backgroundColor: settings.ctaSection?.bgColor}}>
                                                            {ctaImagePreview && <Image src={ctaImagePreview} alt="Aperçu CTA" layout="fill" objectFit="cover" />}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            onChange={createUploadHandler(base64 => {
                                                                setCtaImagePreview(base64);
                                                                handleCtaSectionChange('bgImageUrl', base64);
                                                            })}
                                                            className="hidden"
                                                            accept="image/png, image/jpeg"
                                                        />
                                                        <div className="flex flex-col gap-2">
                                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Uploader</Button>
                                                            <Button variant="destructive" size="sm" onClick={() => {
                                                                setCtaImagePreview(null);
                                                                handleCtaSectionChange('bgImageUrl', null);
                                                            }}>Supprimer</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : section.id === 'video' ? (
                                    <div className="space-y-8">
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu de la section</h3>
                                         <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="video-section-title">Titre principal</Label>
                                                <Input id="video-section-title" value={settings.videoSection.sectionTitle} onChange={(e) => handleVideoSectionChange('sectionTitle', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="video-section-subtitle">Sous-titre</Label>
                                                <Textarea id="video-section-subtitle" value={settings.videoSection.sectionSubtitle} onChange={(e) => handleVideoSectionChange('sectionSubtitle', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="video-main-url">URL de la vidéo principale</Label>
                                                <Input id="video-main-url" placeholder="https://www.youtube.com/embed/..." value={settings.videoSection.mainVideoUrl} onChange={(e) => handleVideoSectionChange('mainVideoUrl', e.target.value)} />
                                            </div>
                                         </div>
                                      </section>
                                      <div className="border-t -mx-6"></div>
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Vidéos secondaires</h3>
                                         <div className="space-y-6">
                                            {settings.videoSection.secondaryVideos.map((video, index) => (
                                                <div key={video.id} className="p-4 border rounded-lg space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-medium">Vidéo secondaire {index + 1}</h4>
                                                        <Button variant="ghost" size="icon" onClick={() => removeSecondaryVideo(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`video-secondary-url-${index}`}>URL</Label>
                                                            <Input id={`video-secondary-url-${index}`} placeholder="https://www.youtube.com/embed/..." value={video.url} onChange={(e) => handleSecondaryVideoChange(index, 'url', e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`video-secondary-title-${index}`}>Titre</Label>
                                                            <Input id={`video-secondary-title-${index}`} value={video.title} onChange={(e) => handleSecondaryVideoChange(index, 'title', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <Button variant="outline" size="sm" onClick={addSecondaryVideo} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter une vidéo secondaire
                                         </Button>
                                      </section>
                                    </div>
                                ) : section.id === 'services' ? (
                                    <div className="space-y-8">
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu de la section</h3>
                                         <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="services-title">Titre principal</Label>
                                                <Input id="services-title" value={settings.servicesSection.title} onChange={(e) => handleServicesSectionChange('title', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="services-subtitle">Sous-titre (slogan)</Label>
                                                <Input id="services-subtitle" value={settings.servicesSection.subtitle} onChange={(e) => handleServicesSectionChange('subtitle', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="services-description">Texte de description</Label>
                                                <Textarea id="services-description" value={settings.servicesSection.description} onChange={(e) => handleServicesSectionChange('description', e.target.value)} />
                                            </div>
                                         </div>
                                      </section>
                                      <div className="border-t -mx-6"></div>
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Liste des Accompagnements</h3>
                                         <div className="space-y-6">
                                            {settings.servicesSection.services.map((service, index) => (
                                                <div key={service.id} className="p-4 border rounded-lg space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-medium">Accompagnement {index + 1}</h4>
                                                        <Button variant="ghost" size="icon" onClick={() => removeAccompagnement(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`service-title-${index}`}>Titre</Label>
                                                            <Input id={`service-title-${index}`} value={service.title} onChange={(e) => handleAccompagnementChange(index, 'title', e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`service-desc-${index}`}>Description</Label>
                                                            <Input id={`service-desc-${index}`} value={service.description} onChange={(e) => handleAccompagnementChange(index, 'description', e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <Label>Image</Label>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                                {service.imageUrl ? (
                                                                    <Image src={service.imageUrl} alt={`Aperçu pour ${service.title}`} layout="fill" objectFit="cover" />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => {
                                                                    const currentRef = fileInputRef.current;
                                                                    if (currentRef) {
                                                                        currentRef.onchange = createUploadHandler(base64 => handleAccompagnementChange(index, 'imageUrl', base64));
                                                                        currentRef.click();
                                                                    }
                                                                }}>
                                                                    <Upload className="mr-2 h-4 w-4" /> Uploader
                                                                </Button>
                                                                <Button variant="destructive" size="sm" onClick={() => handleAccompagnementChange(index, 'imageUrl', null)}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <Button variant="outline" size="sm" onClick={addAccompagnement} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter un accompagnement
                                         </Button>
                                      </section>
                                    </div>
                                ) : section.id === 'jobOffers' ? (
                                    <div className="space-y-8">
                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu de la section</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="joboffers-title">Titre principal</Label>
                                                <Input id="joboffers-title" value={settings.jobOffersSection.title} onChange={(e) => handleJobOffersSectionChange('title', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="joboffers-subtitle">Sous-titre</Label>
                                                <Input id="joboffers-subtitle" value={settings.jobOffersSection.subtitle} onChange={(e) => handleJobOffersSectionChange('subtitle', e.target.value)} />
                                            </div>
                                         </div>
                                      </section>

                                      <div className="border-t -mx-6"></div>

                                      <section>
                                         <h3 className="text-xl font-semibold mb-6 border-b pb-2">Offres d'emploi</h3>
                                         <div className="space-y-6">
                                            {settings.jobOffersSection.offers.map((offer, index) => (
                                                <div key={offer.id} className="p-4 border rounded-lg space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-medium">Offre {index + 1}</h4>
                                                        <Button variant="ghost" size="icon" onClick={() => removeJobOffer(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`job-title-${index}`}>Titre du poste</Label>
                                                            <Input id={`job-title-${index}`} value={offer.title} onChange={(e) => handleJobOfferChange(index, 'title', e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`job-contract-${index}`}>Type de contrat</Label>
                                                            <Input id={`job-contract-${index}`} value={offer.contractType} onChange={(e) => handleJobOfferChange(index, 'contractType', e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`job-location-${index}`}>Lieu</Label>
                                                            <Input id={`job-location-${index}`} value={offer.location} onChange={(e) => handleJobOfferChange(index, 'location', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <Button variant="outline" size="sm" onClick={addJobOffer} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter une offre
                                         </Button>
                                      </section>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun paramètre de personnalisation pour cette section.</p>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                       )
                    })}
                </Accordion>
              </section>
                <div className="flex justify-end pt-6 border-t">
                    <Button onClick={handleSave}>Enregistrer les modifications</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="paiement">
          <Card>
            <CardHeader>
              <CardTitle>Moyens de Paiement</CardTitle>
              <CardDescription>Configurez les moyens de paiement que vous acceptez pour la facturation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <section>
                    <h3 className="text-xl font-semibold mb-6 border-b pb-2">Virement Bancaire (RIB)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="rib-iban">IBAN</Label>
                            <Input id="rib-iban" placeholder="FR76..." value={settings.paymentSettings?.ribIban} onChange={e => handlePaymentSettingsChange('ribIban', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rib-bic">BIC / SWIFT</Label>
                            <Input id="rib-bic" placeholder="AGRIFRPP888" value={settings.paymentSettings?.ribBic} onChange={e => handlePaymentSettingsChange('ribBic', e.target.value)} />
                        </div>
                    </div>
                </section>

                <div className="border-t"></div>

                <section>
                    <h3 className="text-xl font-semibold mb-6 border-b pb-2">PayPal</h3>
                     <Accordion type="single" collapsible>
                        <AccordionItem value="paypal-settings">
                            <AccordionTrigger>Configurer les identifiants PayPal</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="paypal-client-id">Client ID</Label>
                                            <Input id="paypal-client-id" placeholder="Votre Client ID PayPal" value={settings.paymentSettings?.paypalClientId} onChange={e => handlePaymentSettingsChange('paypalClientId', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="paypal-client-secret">Client Secret</Label>
                                            <Input id="paypal-client-secret" type="password" placeholder="Votre Client Secret PayPal" value={settings.paymentSettings?.paypalClientSecret} onChange={e => handlePaymentSettingsChange('paypalClientSecret', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paypal-merchant-id">ID Marchand PayPal</Label>
                                        <Input id="paypal-merchant-id" placeholder="ID de votre compte marchand (optionnel)" value={settings.paymentSettings?.paypalMerchantId} onChange={e => handlePaymentSettingsChange('paypalMerchantId', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paypal-me-link">Lien PayPal.Me (pour paiements manuels)</Label>
                                        <Input id="paypal-me-link" placeholder="https://paypal.me/VotreNom" value={settings.paymentSettings?.paypalMeLink} onChange={e => handlePaymentSettingsChange('paypalMeLink', e.target.value)} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="paypal-test">
                            <AccordionTrigger>Tester l'intégration PayPal</AccordionTrigger>
                            <AccordionContent>
                                <div className="pt-4">
                                    <PayPalConnectionTest />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </section>

                <div className="border-t"></div>

                <section>
                    <h3 className="text-xl font-semibold mb-6 border-b pb-2">Skrill</h3>
                    <div className="space-y-2">
                        <Label htmlFor="skrill-email">Email du compte Skrill</Label>
                        <Input id="skrill-email" type="email" placeholder="email@skrill.com" value={settings.paymentSettings?.skrillEmail} onChange={e => handlePaymentSettingsChange('skrillEmail', e.target.value)} />
                    </div>
                </section>

                <div className="flex justify-end pt-6 border-t">
                    <Button onClick={handleSave}>Enregistrer les modifications</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
            <Card>
                <CardHeader>
                <CardTitle>Configuration des e-mails</CardTitle>
                <CardDescription>
                    Configurez le serveur SMTP pour l'envoi des e-mails transactionnels (confirmation d'inscription, factures, etc.).
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <section>
                        <h3 className="text-xl font-semibold mb-6 border-b pb-2">Expéditeur</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="from-name">Nom de l'expéditeur</Label>
                                <Input id="from-name" placeholder="Votre Nom ou Nom de l'Agence" value={settings.emailSettings?.fromName} onChange={e => handleEmailSettingsChange('fromName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="from-email">E-mail de l'expéditeur</Label>
                                <Input id="from-email" type="email" placeholder="contact@votreagence.com" value={settings.emailSettings?.fromEmail} onChange={e => handleEmailSettingsChange('fromEmail', e.target.value)} />
                            </div>
                        </div>
                    </section>
                    <div className="border-t"></div>
                    <section>
                        <h3 className="text-xl font-semibold mb-6 border-b pb-2">Serveur SMTP</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="smtp-host">Hôte SMTP</Label>
                                    <Input id="smtp-host" placeholder="smtp.fournisseur.com" value={settings.emailSettings?.smtpHost} onChange={e => handleEmailSettingsChange('smtpHost', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp-port">Port SMTP</Label>
                                    <Input id="smtp-port" type="number" placeholder="587" value={settings.emailSettings?.smtpPort} onChange={e => handleEmailSettingsChange('smtpPort', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="smtp-user">Nom d'utilisateur SMTP</Label>
                                <Input id="smtp-user" placeholder="Votre nom d'utilisateur" value={settings.emailSettings?.smtpUser} onChange={e => handleEmailSettingsChange('smtpUser', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="smtp-pass">Mot de passe SMTP</Label>
                                <div className="relative">
                                    <Input id="smtp-pass" type={showSmtpPass ? "text" : "password"} placeholder="••••••••••••" value={settings.emailSettings?.smtpPass} onChange={e => handleEmailSettingsChange('smtpPass', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowSmtpPass(!showSmtpPass)}>
                                        {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Switch id="smtp-secure" checked={settings.emailSettings?.smtpSecure} onCheckedChange={checked => handleEmailSettingsChange('smtpSecure', checked)} />
                                <Label htmlFor="smtp-secure">Utiliser une connexion sécurisée (TLS/SSL)</Label>
                            </div>
                        </div>
                    </section>
                    
                    <div className="border-t"></div>

                     <section>
                        <h3 className="text-xl font-semibold mb-6 border-b pb-2">Tester la configuration</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="test-email">Envoyer un e-mail de test à</Label>
                                <Input id="test-email" type="email" placeholder="votre.email@test.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                            </div>
                            <Button onClick={handleTestEmail} disabled={isTestingEmail}>
                                {isTestingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Envoyer le test
                            </Button>
                        </div>
                    </section>


                    <div className="border-t"></div>

                     <section>
                        <h3 className="text-xl font-semibold mb-6 border-b pb-2">Utiliser Gmail comme serveur SMTP</h3>
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Information</AlertTitle>
                            <AlertDescription>
                                Pour utiliser votre compte Gmail, vous devez générer un "mot de passe d'application" dans les paramètres de sécurité de votre compte Google. N'utilisez pas votre mot de passe habituel.
                                <ul className="list-disc pl-5 mt-2 text-xs">
                                    <li><strong className="font-medium">Hôte SMTP :</strong> smtp.gmail.com</li>
                                    <li><strong className="font-medium">Port :</strong> 587 (avec connexion sécurisée) ou 465</li>
                                    <li><strong className="font-medium">Nom d'utilisateur :</strong> Votre adresse Gmail complète</li>
                                    <li><strong className="font-medium">Mot de passe :</strong> Le mot de passe d'application que vous avez généré</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </section>

                    <div className="flex justify-end pt-6 border-t">
                        <Button onClick={handleSave}>Enregistrer les modifications</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

    

    

    
