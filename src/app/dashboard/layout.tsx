

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  Shield,
  FileText,
  Paintbrush,
  ChevronDown,
  Home
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
import React from "react";

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
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(pathname.startsWith('/dashboard/settings'));

  // State to manage logo display mode
  const [logoDisplay, setLogoDisplay] = React.useState('app-and-logo');

  React.useEffect(() => {
    const updateLogoDisplay = () => {
      const storedDisplay = localStorage.getItem('logoDisplay');
      if (storedDisplay) {
        setLogoDisplay(storedDisplay);
      }
    };
    updateLogoDisplay();
    window.addEventListener('storage', updateLogoDisplay);
    return () => window.removeEventListener('storage', updateLogoDisplay);
  }, []);


  const getInitials = (email?: string | null) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className={cn(logoDisplay === 'logo-only' && 'justify-center')}>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href}>
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
                <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/settings")}>
                                <Shield />
                                <span>Administration</span>
                                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isSettingsOpen && "rotate-180")} />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {settingsMenuItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuSubButton isActive={pathname === item.href}>
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenu>
             <SidebarMenu className="mt-auto">
                <SidebarMenuItem>
                    <Link href="/admin">
                         <SidebarMenuButton isActive={pathname.startsWith("/admin")}>
                             <Users />
                            <span>Admin Area</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
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
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
