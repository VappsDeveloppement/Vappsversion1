import { Logo } from "./logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ExternalLink, GitBranch } from "lucide-react";
import Link from "next/link";

interface LegalInfoProps {
  companyName?: string;
  capital?: number;
  address?: string;
  siret?: string;
  rcs?: string;
  nafCode?: string;
  email?: string;
  phone?: string;
}

const defaultLegalInfo: LegalInfoProps = {
    companyName: "SARL au capital de 1000 €",
    address: "123 Rue de la République, 75001 Paris",
    siret: "12345678901234",
    rcs: "Paris B 123 456 789",
    nafCode: "6201Z",
    email: "contact@vapps.test",
    phone: "01 23 45 67 89",
};

export function Footer({ legalInfo = defaultLegalInfo }: { legalInfo?: LegalInfoProps }) {
    return (
        <footer className="bg-gray-900 text-gray-300 py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="md:col-span-4 text-sm">
                        <Logo className="text-white mb-4" />
                        {legalInfo.companyName && <p>{legalInfo.companyName}</p>}
                        {legalInfo.address && <p>{legalInfo.address}</p>}
                        <br />
                        {legalInfo.siret && <p>SIRET: {legalInfo.siret}</p>}
                        {legalInfo.rcs && <p>RCS: {legalInfo.rcs}</p>}
                        {legalInfo.nafCode && <p>Code NAF: {legalInfo.nafCode}</p>}
                        <br />
                        {legalInfo.email && <p>E-mail: {legalInfo.email}</p>}
                        {legalInfo.phone && <p>Téléphone: {legalInfo.phone}</p>}
                        <br />
                        <div className="space-y-1">
                            <Link href="#" className="block hover:text-white text-secondary">Mentions légales</Link>
                            <Link href="#" className="block hover:text-white text-secondary">Politique de confidentialité</Link>
                            <Link href="#" className="block hover:text-white text-secondary">Conditions Générales de Vente</Link>
                        </div>
                    </div>

                    {/* Middle Column */}
                    <div className="md:col-span-4">
                        <h3 className="font-bold text-white text-lg mb-4">Contactez-nous</h3>
                        <form className="space-y-4">
                            <Input 
                                type="email" 
                                placeholder="email@example.com" 
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
                            />
                            <Select>
                                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Demande d'information" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="info">Demande d'information</SelectItem>
                                    <SelectItem value="partnership">Partenariat</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                </SelectContent>
                            </Select>
                            <Textarea 
                                placeholder="Votre message..." 
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]" 
                            />
                            <Button className="font-bold">
                                Envoyer
                            </Button>
                        </form>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-4">
                        <h3 className="font-bold text-white text-lg mb-4">À propos</h3>
                        <p className="text-sm mb-6">
                            HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.
                        </p>
                        <ul className="space-y-3">
                            <li>
                                <Link href="#" className="flex items-center gap-2 hover:text-white text-secondary">
                                    <GitBranch className="h-4 w-4" />
                                    <span>Notre mission</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="flex items-center gap-2 hover:text-white text-secondary">
                                    <Briefcase className="h-4 w-4" />
                                    <span>Carrières</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-12 pt-6 text-center text-sm">
                    <p>© {new Date().getFullYear()} - Vapps.</p>
                </div>
            </div>
        </footer>
    );
}
