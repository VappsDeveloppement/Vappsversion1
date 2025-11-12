
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgency } from "@/context/agency-provider";
import { useCollection } from "@/firebase";
import { useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();

  const usersQuery = useMemo(() => {
    if (!agency) return null;
    return query(collection(firestore, 'users'), where('agencyId', '==', agency.id));
  }, [agency, firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

  const isLoading = isAgencyLoading || areUsersLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez les utilisateurs et leurs permissions pour l'agence : **{agency?.name || '...'}**
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des utilisateurs</CardTitle>
          <CardDescription>Invitez, modifiez ou supprimez des utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                               <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                               <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                               <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                               <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                           </TableRow>
                        ))
                    ) : users && users.length > 0 ? (
                        users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Aucun utilisateur trouvé.
                            </TableCell>
                       </TableRow>
                    )}
                </TableBody>
           </Table>
        </CardContent>
      </Card>
    </div>
  );
}
