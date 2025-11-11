import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Facebook, Twitter, Linkedin } from "lucide-react";
import { Button } from "../ui/button";

export function Footer({ agencyName }: { agencyName: string }) {
  return (
    <footer className="border-t">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Logo text={agencyName} />
            <p className="text-sm text-muted-foreground">
              Unlock your full potential with professional and personal development coaching.
            </p>
          </div>
          <div className="grid grid-cols-2 md:col-span-2 gap-8">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link href="#faq" className="text-muted-foreground hover:text-foreground">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {agencyName}. All rights reserved.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="#"><Twitter className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="#"><Facebook className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="#"><Linkedin className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}