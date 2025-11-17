

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Users,
  CreditCard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Palette,
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
import { useUser, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from "react";
import { useFirestore, useAuth } from "@/firebase/provider";
import { collection, doc, query, where } from "firebase/firestore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AgencyProvider, useAgency } from "@/context/agency-provider";


const mainMenuItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard /> },
  { href: "/dashboard/appointments", label: "Agenda", icon: <CalendarDays /> },
  { href: "/dashboard/messages", label: "Messagerie", icon: <MessageSquare /> },
  { href: "/dashboard/billing", label: "Facturation & Devis", icon: <CreditCard /> },
];

const administrationMenuItems = [
    { href: "/dashboard/settings/users", label: "Utilisateurs", icon: <Users /> },
    { href: "/dashboard/settings/personalization", label: "Personnalisation", icon: <Palette /> },
    { href: "/dashboard/settings/gdpr", label: "Gestion RGPD", icon: <ShieldCheck /> },
];

const supportMenuItem = { href: "/dashboard/settings/support", label: "Support", icon: <LifeBuoy /> };


function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { agency } = useAgency();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isSuperAdmin = userData?.role === 'superadmin';

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isLoading = isUserLoading || isUserDataLoading || !isMounted;
  
  const isAdministrationPathActive = administrationMenuItems.some(item => pathname === item.href);

  const handleLogout = async () => {
    await auth.signOut();
    const redirectUrl = agency?.id ? `/agency/${agency.id}` : '/';
    router.push(redirectUrl);
  };

  if (isLoading) {
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
      <div className="flex">
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
               {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href}>
                        {item.icon}
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
                <Accordion type="single" collapsible defaultValue={isAdministrationPathActive ? "admin-menu" : undefined} className="w-full">
                    <AccordionItem value="admin-menu" className="border-none">
                        <AccordionTrigger className="w-full flex items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] text-black hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50" data-active={isAdministrationPathActive}>
                            <Settings className="h-4 w-4 shrink-0"/>
                            <span className="truncate flex-1">Administration</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pl-6 space-y-1">
                            {administrationMenuItems.map(item => (
                               <Link key={item.href} href={item.href} className="flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent" data-active={pathname === item.href}>
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
                <AvatarImage src={user?.photoURL ?? undefined} />
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AgencyProvider agencyId="vapps-agency">
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </AgencyProvider>
  );
}
