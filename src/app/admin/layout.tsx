

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Users,
  Home,
  LayoutGrid,
  LifeBuoy,
  Mails,
  CreditCard,
  Palette,
  ShieldCheck,
  UserCircle,
  FlaskConical,
  ClipboardList,
  Newspaper,
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
import { useUser, useAuth, useMemoFirebase, useDoc } from "@/firebase";
import React, { useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: <LayoutGrid /> },
  { href: "/admin/blog", label: "Gestion du Blog", icon: <Newspaper /> },
  { href: "/admin/email-marketing", label: "Email Campaigns", icon: <Mails /> },
  { href: "/admin/beta-test", label: "Recette de test", icon: <FlaskConical /> },
  { href: "/admin/beta-test/results", label: "Résultats Tests", icon: <ClipboardList /> },
  { href: "/admin/support", label: "Support Technique", icon: <LifeBuoy /> },
];

const settingsMenuItems = [
    { href: "/admin/settings/users", label: "Utilisateurs", icon: <Users /> },
    { href: "/admin/settings/personalization", label: "Personnalisation", icon: <Palette /> },
    { href: "/admin/settings/gdpr", label: "Gestion RGPD", icon: <ShieldCheck /> },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/application');
    } else if (!isUserDataLoading && userData?.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, isUserDataLoading, userData, router]);
  
  const activeSettingsPath = settingsMenuItems.some(item => pathname.startsWith(item.href));

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/');
  };

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user || userData?.role !== 'superadmin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
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
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href}>
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
               <Accordion type="single" collapsible defaultValue={activeSettingsPath ? "settings-menu" : undefined} className="w-full">
                    <AccordionItem value="settings-menu" className="border-none">
                        <AccordionTrigger className="w-full flex items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] text-black hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50" data-active={activeSettingsPath}>
                            <Users className="h-4 w-4 shrink-0"/>
                            <span className="truncate flex-1">Administration</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pl-6 space-y-1">
                            {settingsMenuItems.map(item => (
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
                    <Link href="/dashboard">
                        <SidebarMenuButton>
                            <Home />
                            <span>Retour à l'app</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary">
              <Avatar>
                <AvatarImage src="https://picsum.photos/seed/admin-avatar/40/40" data-ai-hint="admin avatar" />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">Super Admin</p>
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
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">
                {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}