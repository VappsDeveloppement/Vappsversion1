
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'superadmin' | 'membre' | 'prospect';
    dateJoined: string;
};

export default function UserManagementPage() {
    const firestore = useFirestore();
    const { isUserLoading } = useUser();
    const [searchTerm, setSearchTerm] = useState('');

    const usersQuery = useMemoFirebase(() => {
        if (isUserLoading || !firestore) return null; // Ne pas exécuter la requête si l'utilisateur charge
        return query(collection(firestore, 'users'));
    }, [firestore, isUserLoading]);

    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);
    
    const filteredUsers = useMemo(() => {
        if (!allUsers) return [];
        if (!searchTerm) return allUsers;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return allUsers.filter(user => 
            user.firstName.toLowerCase().includes(lowercasedTerm) ||
            user.lastName.toLowerCase().includes(lowercasedTerm) ||
            user.email.toLowerCase().includes(lowercasedTerm)
        );
    }, [allUsers, searchTerm]);
    
    const isLoading = isUserLoading || areUsersLoading;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">User Management</h1>
                <p className="text-muted-foreground">View, manage, and edit user accounts and permissions.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>A list of all users in the platform.</CardDescription>
                    <div className="pt-4">
                        <Input 
                            placeholder="Search users by name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Date Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}>
                                            <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                           ) : filteredUsers.length > 0 ? (
                               filteredUsers.map((user) => (
                                   <TableRow key={user.id}>
                                       <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                       <TableCell>{user.email}</TableCell>
                                       <TableCell><Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                                       <TableCell>{new Date(user.dateJoined).toLocaleDateString()}</TableCell>
                                       <TableCell className="text-right">
                                           {/* Action buttons will go here */}
                                       </TableCell>
                                   </TableRow>
                               ))
                           ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No users found.
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
