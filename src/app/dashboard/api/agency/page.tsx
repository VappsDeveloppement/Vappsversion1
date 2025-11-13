
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { PlusCircle, Search } from "lucide-react";

export default function AgencyApiPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des Agences</h1>
                    <p className="text-muted-foreground">Créez et gérez les agences de la plateforme.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Créer une agence
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les agences</CardTitle>
                    <CardDescription>Liste de toutes les agences créées sur la plateforme.</CardDescription>
                    <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Rechercher une agence par nom..." className="pl-10" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de l'agence</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date de création</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Aucune agence trouvée.
                                </TableCell>
                           </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
