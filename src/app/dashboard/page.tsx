
export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Tableau de bord</h1>
                <p className="text-muted-foreground">Voici un aperçu de votre tableau de bord.</p>
            </div>

            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Votre tableau de bord est vide.</p>
            </div>

        </div>
    );
}
