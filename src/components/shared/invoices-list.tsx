
'use client';

import React from 'react';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientInfo: {
    name: string;
  };
  issueDate: string;
  dueDate: string;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
};

const statusVariant: Record<Invoice['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'secondary',
};

const statusText: Record<Invoice['status'], string> = {
  pending: 'En attente',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export function InvoicesList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const invoicesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/invoices`),
      orderBy('issueDate', 'desc')
    );
  }, [user, firestore]);

  const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes Factures</CardTitle>
        <CardDescription>Liste de toutes les factures que vous avez générées.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date d'émission</TableHead>
              <TableHead>Date d'échéance</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : invoices && invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientInfo.name}</TableCell>
                  <TableCell>{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{invoice.total.toFixed(2)} €</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status] || 'secondary'}>
                      {statusText[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir la facture</DropdownMenuItem>
                        <DropdownMenuItem>Renvoyer par e-mail</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Aucune facture n'a été générée.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    