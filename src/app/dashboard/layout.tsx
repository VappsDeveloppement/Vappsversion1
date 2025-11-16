

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Users,
  Shield,
  FileText,
  Paintbrush,
  ChevronDown,
  LayoutTemplate,
  UserCog,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";
import { useFirestore } from "@/firebase/provider";
import { doc } from "firebase/firestore";
import { useDoc, useMemoFirebase } from "@/firebase";

const menuItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard /> },
  { href: "/dashboard/appointments", label: "Agenda", icon: <CalendarDays /> },
  { href: "/dashboard/messages", label: "Messagerie", icon: <MessageSquare /> },
  { href: "/dashboard/billing", label: "Facturation", icon: <CreditCard /> },
];

const settingsMenuItems = [
    { href: "/dashboard/settings/personalization", label: "Personnalisation", icon: <Paintbrush /> },
    { href: "/dashboard/settings/users", label: "Utilisateurs", icon: <Users /> },
    { href: "/dashboard/settings/gdpr", label: "Gestion RGPD", icon: <FileText /> },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isSuperAdmin = useMemo(() => userData?.role === 'superadmin', [userData]);
  
  const isModelAgencyPath = menuItems.some(item => pathname.startsWith(item.href)) || pathname.startsWith('/dashboard/settings');

  const [isModelAgencyOpen, setIsModelAgencyOpen] = React.useState(isModelAgencyPath);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(pathname.startsWith('/dashboard/settings'));
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getInitials = (email?: string | null) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  }
  
  const isLoading = isUserLoading || isUserDataLoading || !isMounted;

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
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                            <Skeleton className="h-8 w-full mt-2" />
                            <div className="pl-4 space-y-1 pt-1">
                                <Skeleton className="h-7 w-[calc(100%-1rem)]" />
                                <Skeleton className="h-7 w-[calc(100%-1rem)]" />
                                <Skeleton className="h-7 w-[calc(100%-1rem)]" />
                            </div>
                        </div>
                    </SidebarContent>
                    <SidebarFooter>
                        <div className="p-2 mt-auto">
                            <Skeleton className="h-8 w-full" />
                        </div>
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
              
                <Collapsible open={isModelAgencyOpen} onOpenChange={setIsModelAgencyOpen}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={isModelAgencyPath}>
                                <LayoutTemplate />
                                <span>Modèle Agence</span>
                                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isModelAgencyOpen && "rotate-180")} />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                           {menuItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                              <Link href={item.href}>
                                <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                   <span>
                                    {item.icon}
                                    <span>{item.label}</span>
                                   </span>
                                </SidebarMenuSubButton>
                              </Link>
                            </SidebarMenuItem>
                          ))}
                            <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuSubButton asChild isActive={pathname.startsWith("/dashboard/settings")}>
                                          <span>
                                            <Shield />
                                            <span>Administration</span>
                                            <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isSettingsOpen && "rotate-180")} />
                                          </span>
                                        </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                </SidebarMenuItem>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {settingsMenuItems.map((item) => (
                                            <SidebarMenuItem key={item.href}>
                                                <Link href={item.href} passHref>
                                                    <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                                      <span>
                                                        {item.icon}
                                                        <span>{item.label}</span>
                                                      </span>
                                                    </SidebarMenuSubButton>
                                                </Link>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </Collapsible>
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenu>
             <SidebarMenu className="mt-auto">
                {isSuperAdmin && (
                  <SidebarMenuItem>
                      <Link href="/admin">
                           <SidebarMenuButton isActive={pathname.startsWith("/admin")}>
                               <UserCog />
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
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                {isUserLoading ? (
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-sm truncate">{user?.displayName || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || "No email"}</p>
                  </>
                )}
              </div>
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
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
