
'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  LifeBuoy,
  Users,
  CreditCard,
  UserCircle,
  FileText,
  Globe,
  Loader2,
  Settings,
  Newspaper,
  Pyramid,
  PhoneForwarded,
  Bot,
  Wand,
  BookOpen,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser, useMemoFirebase, useDoc } from "@/firebase";
import React, { useMemo, useState, useEffect } from "react";
import { useFirestore, useAuth } from "@/firebase/provider";
import { doc } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAgency } from "@/context/agency-provider";

const mainMenuItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard /> },
  { href: "/dashboard/appointments", label: "Agenda", icon: <CalendarDays /> },
  { href: "/dashboard/messages", label: "Messagerie", icon: <MessageSquare /> },
];

const profileMenuItems = [
    { href: "/dashboard/settings/profile", label: "Mes infos & coordonnées", icon: <FileText /> },
    { href: "/dashboard/settings/mini-site", label: "Mon Mini-site", icon: <Globe /> },
    { href: "/dashboard/settings/parameters", label: "Mes Paramètres", icon: <Settings /> },
];

const supportMenuItem = { href: "/dashboard/settings/support", label: "Support", icon: <LifeBuoy /> };

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


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { personalization, isLoading: isAgencyLoading } = useAgency();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const userPlan = useMemo(() => {
    if (!userData?.planId || !personalization?.whiteLabelSection?.plans) {
      return null;
    }
    return personalization.whiteLabelSection.plans.find(p => p.id === userData.planId);
  }, [userData, personalization]);


  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/application');
    }
  }, [isUserLoading, user, router]);

  const hasAdminAccess = userData?.permissions?.includes('FULLACCESS');
  const isConseiller = userData?.role === 'conseiller';
  
  const activeProfilePath = profileMenuItems.some(item => pathname.startsWith(item.href));

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleLogout = async () => {
    await auth.signOut();
    router.push('/application');
  };

  // This will apply the theme colors for the counselor's dashboard
  const dashboardStyle = useMemo(() => {
    const theme = userData?.dashboardTheme;
    if (isConseiller && theme) {
      return {
        '--background': theme.bgColor ? hexToHsl(theme.bgColor) : undefined,
        '--primary': theme.primaryColor ? hexToHsl(theme.primaryColor) : undefined,
        '--secondary': theme.secondaryColor ? hexToHsl(theme.secondaryColor) : undefined,
      } as React.CSSProperties;
    }
    return {};
  }, [userData, isConseiller]);

  const isLoading = isUserLoading || isUserDataLoading || isAgencyLoading || !isMounted;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const showPrisme = isConseiller && userPlan?.hasPrismeAccess;
  const showVitae = isConseiller && userPlan?.hasVitaeAccess;
  const showAura = isConseiller && userPlan?.hasAuraAccess;


  return (
    <SidebarProvider>
      <div className="flex" style={dashboardStyle}>
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
               {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname.startsWith(item.href)}>
                        {item.icon}
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
               {(isConseiller || hasAdminAccess) && (
                 <>
                    <SidebarMenuItem>
                        <Link href="/dashboard/events">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/events")}>
                            <CalendarDays />
                            <span>Mes Évènements</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/dashboard/billing">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/billing")}>
                            <CreditCard />
                            <span>Facturation</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/dashboard/e-learning">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/e-learning")}>
                            <BookOpen />
                            <span>E-Learning</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    {showPrisme && (
                        <SidebarMenuItem>
                            <Link href="/dashboard/prisme">
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/prisme")}>
                                <Pyramid />
                                <span>Prisme</span>
                            </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    )}
                    {showVitae && (
                        <SidebarMenuItem>
                            <Link href="/dashboard/vitae">
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/vitae")}>
                                <Bot />
                                <span>Vitae</span>
                            </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    )}
                     {showAura && (
                        <SidebarMenuItem>
                            <Link href="/dashboard/aura">
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/aura")}>
                                <Wand />
                                <span>Aura</span>
                            </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    )}
                 </>
               )}
              {(isConseiller || hasAdminAccess) && (
                  <>
                    <SidebarMenuItem>
                        <Link href="/dashboard/clients">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/clients")}>
                            <Users />
                            <span>Mes Clients</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/dashboard/partenaires">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/partenaires")}>
                            <Users />
                            <span>Partenaires</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <Link href="/dashboard/blog">
                        <SidebarMenuButton isActive={pathname.startsWith("/dashboard/blog")}>
                            <Newspaper />
                            <span>Mon Blog</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                  </>
              )}
               <Accordion type="single" collapsible defaultValue={activeProfilePath ? "profile-menu" : undefined} className="w-full">
                    <AccordionItem value="profile-menu" className="border-none">
                        <AccordionTrigger className="w-full flex items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] text-black hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50" data-active={activeProfilePath}>
                            <UserCircle className="h-4 w-4 shrink-0"/>
                            <span className="truncate flex-1">Mon Profil</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pl-6 space-y-1">
                            {(isConseiller || hasAdminAccess) ? (
                                profileMenuItems.map(item => (
                                   <Link key={item.href} href={item.href} className="flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent" data-active={pathname.startsWith(item.href)}>
                                     {React.cloneElement(item.icon, { className: "h-4 w-4"})}
                                     <span>{item.label}</span>
                                   </Link>
                                ))
                            ) : (
                                <Link href="/dashboard/settings/profile" className="flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent" data-active={pathname.startsWith("/dashboard/settings/profile")}>
                                     <FileText className="h-4 w-4" />
                                     <span>Mes infos & coordonnées</span>
                                </Link>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenu>
            
            <SidebarMenu className="mt-auto">
                <SidebarMenuItem>
                  <Link href={supportMenuItem.href}>
                    <SidebarMenuButton isActive={pathname === supportMenuItem.href}>
                        {supportMenuItem.icon}
                        <span>Support</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                 {hasAdminAccess && (
                    <SidebarMenuItem>
                        <Link href="/admin">
                            <SidebarMenuButton isActive={pathname.startsWith("/admin")}>
                                <Users />
                                <span>Admin Platforme</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                 )}
            </SidebarMenu>
             
          </SidebarContent>
          <SidebarFooter>
             <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary">
              <Avatar>
                <AvatarImage src={userData?.photoUrl ?? user?.photoURL ?? undefined} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">{userData?.firstName || user?.displayName || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                 <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="flex items-center justify-between p-4 border-b md:justify-end">
                <div className="md:hidden">
                    <Logo />
                </div>
                <SidebarTrigger className="md:hidden" />
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
