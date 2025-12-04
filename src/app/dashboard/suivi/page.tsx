
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList, Route } from "lucide-react";

export default function SuiviPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Suivi</h1>
        <p className="text-muted-foreground">
          Gérez le suivi de vos clients, vos modèles et vos parcours.
        </p>
      </div>

      <Tabs defaultValue="suivi" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="suivi">
            <ClipboardList className="mr-2 h-4 w-4" /> Suivi
          </TabsTrigger>
          <TabsTrigger value="form-templates">
            <FileText className="mr-2 h-4 w-4" /> Modèle de formulaire
          </TabsTrigger>
           <TabsTrigger value="parcours">
            <Route className="mr-2 h-4 w-4" /> Parcours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suivi">
          <Card>
            <CardHeader>
              <CardTitle>Suivi des clients</CardTitle>
              <CardDescription>
                Cette section est en cours de développement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Le module de suivi des clients sera bientôt disponible ici.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="form-templates">
          <Card>
            <CardHeader>
              <CardTitle>Modèles de formulaire</CardTitle>
              <CardDescription>
                 Cette section est en cours de développement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>La gestion des modèles de formulaire sera bientôt disponible ici.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="parcours">
            <Card>
                <CardHeader>
                    <CardTitle>Parcours</CardTitle>
                    <CardDescription>
                        Cette section est en cours de développement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>Le module de création de parcours sera bientôt disponible ici.</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
