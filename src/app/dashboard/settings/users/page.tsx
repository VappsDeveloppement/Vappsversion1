
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgency } from "@/context/agency-provider";
import { useCollection } from "@/firebase";
import React, { useMemo, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'superadmin' | 'conseiller' | 'membre' | 'prospect';
  dateJoined: string;
};

// Component to render the user table
const UserTable = ({ users, isLoading, emptyMessage }: { users: User[], isLoading: boolean, emptyMessage: string }) => {
  if (isLoading) {
    return (
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
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
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
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


export default function UsersPage() {
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();

  const [adminSearch, setAdminSearch] = useState('');
  const [conseillerSearch, setConseillerSearch] = useState('');
  const [membreSearch, setMembreSearch] = useState('');
  const [prospectSearch, setProspectSearch] = useState('');

  const usersQuery = useMemo(() => {
    if (!agency) return null;
    return query(collection(firestore, 'users'), where('agencyId', '==', agency.id));
  }, [agency, firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

  const isLoading = isAgencyLoading || areUsersLoading;

  const filterUsers = (data: User[] | null, role: string[], searchTerm: string): User[] => {
    if (!data) return [];
    return data.filter(user => 
      role.includes(user.role) &&
      (
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };
  
  const admins = useMemo(() => filterUsers(users, ['admin', 'superadmin'], adminSearch), [users, adminSearch]);
  const conseillers = useMemo(() => filterUsers(users, ['conseiller'], conseillerSearch), [users, conseillerSearch]);
  const membres = useMemo(() => filterUsers(users, ['membre'], membreSearch), [users, membreSearch]);
  const prospects = useMemo(() => filterUsers(users, ['prospect'], prospectSearch), [users, prospectSearch]);


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
          <Tabs defaultValue="admins">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="conseillers">Conseillers</TabsTrigger>
              <TabsTrigger value="membres">Membres</TabsTrigger>
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
            </TabsList>

            <TabsContent value="admins">
              <div className="space-y-4 pt-4">
                <Input 
                  placeholder="Rechercher un admin..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
                <UserTable users={admins} isLoading={isLoading} emptyMessage="Aucun admin trouvé." />
              </div>
            </TabsContent>

            <TabsContent value="conseillers">
                <div className="space-y-4 pt-4">
                    <Input 
                        placeholder="Rechercher un conseiller..."
                        value={conseillerSearch}
                        onChange={(e) => setConseillerSearch(e.target.value)}
                    />
                    <UserTable users={conseillers} isLoading={isLoading} emptyMessage="Aucun conseiller trouvé." />
                </div>
            </TabsContent>

            <TabsContent value="membres">
                <div className="space-y-4 pt-4">
                    <Input 
                        placeholder="Rechercher un membre..."
                        value={membreSearch}
                        onChange={(e) => setMembreSearch(e.target.value)}
                    />
                    <UserTable users={membres} isLoading={isLoading} emptyMessage="Aucun membre trouvé." />
                </div>
            </TabsContent>

            <TabsContent value="prospects">
                <div className="space-y-4 pt-4">
                    <Input 
                        placeholder="Rechercher un prospect..."
                        value={prospectSearch}
                        onChange={(e) => setProspectSearch(e.target.value)}
                    />
                    <UserTable users={prospects} isLoading={isLoading} emptyMessage="Aucun prospect trouvé." />
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
