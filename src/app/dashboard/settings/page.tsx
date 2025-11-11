import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de la plateforme.
        </p>
      </div>

      <Tabs defaultValue="personalization">
        <TabsList>
          <TabsTrigger value="personalization">Personnalisation</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="gdpr">RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="personalization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation</CardTitle>
              <CardDescription>Gérez la personnalisation de la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Le contenu de la personnalisation est vide.</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Gérez les utilisateurs et leurs permissions.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La section des utilisateurs est vide.</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion RGPD</CardTitle>
              <CardDescription>
                Gérez les données et la conformité RGPD.
              </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La section RGPD est vide.</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
