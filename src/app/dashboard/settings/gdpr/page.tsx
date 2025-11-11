import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GdprPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Gestion RGPD</h1>
        <p className="text-muted-foreground">
          Gérez les données et la conformité RGPD.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Conformité RGPD</CardTitle>
          <CardDescription>Exportez ou supprimez les données des utilisateurs conformément au RGPD.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">La section RGPD est vide.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
