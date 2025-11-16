
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Users,
  Home,
  LayoutGrid,
  LifeBuoy,
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
import { useUser } from "@/firebase";
import React from "react";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: <LayoutGrid /> },
  { href: "/admin/page-builder", label: "Page Builder", icon: <PanelsTopLeft /> },
  { href: "/admin/email-marketing", label: "Email Campaigns", icon: <Mails /> },
  { href: "/admin/user-management", label: "User Management", icon: <Users /> },
  { href: "/admin/support", label: "Support Technique", icon: <LifeBuoy /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  // REMOVED: Super admin role check to ensure access
  // const isSuperAdmin = userData?.role === 'superadmin';
  // if (!isSuperAdmin) {
  //   // You can redirect or show an unauthorized message
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <p>Accès non autorisé.</p>
  //     </div>
  //   );
  // }

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
                <p className="font-semibold text-sm truncate">Super Admin</p>
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
