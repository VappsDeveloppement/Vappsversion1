
import { redirect } from 'next/navigation'

export default function DashboardPage() {
    // For now, all Firebase Auth users are considered "Super Admins" for the model.
    // This page will redirect them to their default dashboard.
    // In the future, this page will be the landing page for "Agency" users.
    redirect('/dashboard/api/agency');

    // The content below will be shown to agency users in the future.
    /*
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
    */
}
