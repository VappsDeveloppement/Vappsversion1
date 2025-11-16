

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Users,
  Home,
  LayoutGrid,
  LifeBuoy,
  UserCog,
  PanelsTopLeft,
  Mails,
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
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { doc } from "firebase/firestore";
import React, { useEffect } from "react";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: <LayoutGrid /> },
  { href: "/admin/page-builder", label: "Page Builder", icon: <PanelsTopLeft /> },
  { href: "/admin/email-marketing", label: "Email Campaigns", icon: <Mails /> },
  { href: "/admin/user-management", label: "User Management", icon: <Users /> },
  { href: "/admin/super-admins", label: "Super Admins", icon: <UserCog /> },
  { href: "/admin/support", label: "Support Technique", icon: <LifeBuoy /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;

  useEffect(() => {
    // If loading is finished and there's no user or the user is not a superadmin, redirect.
    if (!isLoading && (!user || userData?.role !== 'superadmin')) {
      router.push('/dashboard');
    }
  }, [isLoading, user, userData, router]);

  if (isLoading || !user || userData?.role !== 'superadmin') {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar>
          <SidebarHeader>
            <div className="flex justify-between items-center">
                <Logo />
                <p className="px-2 py-1 text-xs font-semibold rounded-md bg-destructive text-destructive-foreground">Super Admin</p>
            </div>
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
                <p className="font-semibold text-sm truncate">{user?.displayName || "Super Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
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
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">
                {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
