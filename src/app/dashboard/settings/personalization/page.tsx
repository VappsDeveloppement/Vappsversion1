import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PersonalizationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
        <p className="text-muted-foreground">
          Gérez la personnalisation de la plateforme.
        </p>
      </div>

      <Tabs defaultValue="info-legales">
        <TabsList>
          <TabsTrigger value="info-legales">Infos Légales</TabsTrigger>
          <TabsTrigger value="apparence">Apparence</TabsTrigger>
          <TabsTrigger value="accueil">Page d'accueil</TabsTrigger>
          <TabsTrigger value="paiement">Paiement</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="rgpd">Paramètres RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="info-legales">
          <Card>
            <CardHeader>
              <CardTitle>Informations Légales</CardTitle>
              <CardDescription>Gérez les informations légales de votre entreprise.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des informations légales est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apparence">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Modifiez les couleurs, le logo et l'apparence générale de votre espace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu de l'apparence est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accueil">
          <Card>
            <CardHeader>
              <CardTitle>Page d'accueil</CardTitle>
              <CardDescription>Configurez le contenu de votre page d'accueil.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu de la page d'accueil est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paiement">
          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
              <CardDescription>Gérez les options de paiement.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des paiements est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Configurez les paramètres d'envoi d'emails.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des emails est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rgpd">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres RGPD</CardTitle>
              <CardDescription>Gérez les paramètres de conformité RGPD.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des paramètres RGPD est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
