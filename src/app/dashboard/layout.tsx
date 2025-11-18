
"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo, useState } from "react";
import { useFirestore, useAuth } from "@/firebase/provider";
import { doc } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const mainMenuItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard /> },
  { href: "/dashboard/appointments", label: "Agenda", icon: <CalendarDays /> },
  { href: "/dashboard/messages", label: "Messagerie", icon: <MessageSquare /> },
  { href: "/dashboard/billing", label: "Facturation", icon: <CreditCard /> },
];

const profileMenuItems = [
    { href: "/dashboard/settings/profile", label: "Mes infos & coordonnées", icon: <FileText /> },
    { href: "/dashboard/settings/mini-site", label: "Mon Mini-site", icon: <Globe /> },
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || isLoggingOut) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user, isLoggingOut]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isSuperAdmin = userData?.role === 'superadmin';
  const isConseiller = userData?.role === 'conseiller';
  
  const activeProfilePath = profileMenuItems.some(item => pathname.startsWith(item.href));

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleLogout = () => {
    setIsLoggingOut(true);
    const redirectUrl = (isConseiller) ? `/c/${user?.uid}` : '/';
    
    router.push(redirectUrl);
    
    // Give the router time to navigate before signing out.
    // This prevents a race condition where data hooks on the new page
    // fire before the old page's hooks (which require auth) have cleaned up.
    setTimeout(() => {
        auth.signOut();
    }, 100); // A small delay is usually sufficient.
  };


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

  const isLoading = isUserLoading || isUserDataLoading || !isMounted;

  if (isLoading && !isLoggingOut) {
    return (
        <SidebarProvider>
            <div className="flex">
                <Sidebar>
                     <SidebarHeader>
                        <Skeleton className="h-8 w-32" />
                    </SidebarHeader>
                    <SidebarContent>
                        <div className="flex-1 p-2 space-y-1">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    </SidebarContent>
                    <SidebarFooter>
                        <div className="p-2">
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </SidebarFooter>
                </Sidebar>
                <SidebarInset>
                    <header className="p-4 border-b h-14"></header>
                    <main className="p-8">
                        <Skeleton className="h-96 w-full" />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
  }


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
              {isConseiller && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/clients">
                      <SidebarMenuButton isActive={pathname.startsWith("/dashboard/clients")}>
                          <Users />
                          <span>Mes Clients</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
              )}
               <Accordion type="single" collapsible defaultValue={activeProfilePath ? "profile-menu" : undefined} className="w-full">
                    <AccordionItem value="profile-menu" className="border-none">
                        <AccordionTrigger className="w-full flex items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] text-black hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50" data-active={activeProfilePath}>
                            <UserCircle className="h-4 w-4 shrink-0"/>
                            <span className="truncate flex-1">Mon Profil</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pl-6 space-y-1">
                            {profileMenuItems.map(item => (
                               <Link key={item.href} href={item.href} className="flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent" data-active={pathname.startsWith(item.href)}>
                                 {React.cloneElement(item.icon, { className: "h-4 w-4"})}
                                 <span>{item.label}</span>
                               </Link>
                            ))}
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
                 {isSuperAdmin && (
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
              <Button variant="ghost" size="icon" onClick={handleLogout} disabled={isLoggingOut}>
                 {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
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

    