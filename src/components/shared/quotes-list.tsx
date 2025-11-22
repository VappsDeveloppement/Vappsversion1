
'use client';

import React, { useState } from 'react';
import { useCollection, useMemoFirebase, useUser, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Edit, Trash2, FileSignature } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NewQuoteForm } from './new-quote-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type Quote = {
  id: string;
  quoteNumber: string;
  clientInfo: {
    name: string;
  };
  issueDate: string;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  [key: string]: any; // Allow other properties
};

const statusVariant: Record<Quote['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'default',
  accepted: 'default', // Using default for accepted as it's a positive status
  rejected: 'destructive',
};

const statusText: Record<Quote['status'], string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
};

export function QuotesList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  const quotesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'quotes'),
      where('counselorId', '==', user.uid),
      orderBy('issueDate', 'desc')
    );
  }, [user, firestore]);

  const { data: quotes, isLoading } = useCollection<Quote>(quotesQuery);

  const handleNewQuote = () => {
    setEditingQuote(null);
    setIsSheetOpen(true);
  };
  
  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
    setIsSheetOpen(true);
  };

  const handleDelete = () => {
    if (!quoteToDelete) return;
    const quoteDocRef = doc(firestore, 'quotes', quoteToDelete.id);
    deleteDocumentNonBlocking(quoteDocRef);
    toast({ title: "Devis supprimé", description: `Le devis ${quoteToDelete.quoteNumber} a été supprimé.` });
    setQuoteToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle>Mes Devis</CardTitle>
                <CardDescription>Liste de tous les devis que vous avez créés.</CardDescription>
            </div>
             <Button onClick={handleNewQuote}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Devis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date d'émission</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : quotes && quotes.length > 0 ? (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.clientInfo.name}</TableCell>
                    <TableCell>{new Date(quote.issueDate).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{quote.total.toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[quote.status] || 'secondary'}>
                        {statusText[quote.status] || quote.status}
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
                            <DropdownMenuItem onClick={() => handleEdit(quote)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setQuoteToDelete(quote)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSignature className="h-10 w-10 text-muted-foreground"/>
                      <p className="text-muted-foreground">Aucun devis créé pour le moment.</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={handleNewQuote}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Créer votre premier devis
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-5xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{editingQuote ? 'Modifier le devis' : 'Créer un nouveau devis'}</SheetTitle>
            </SheetHeader>
            <NewQuoteForm setOpen={setIsSheetOpen} initialData={editingQuote} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                Cette action supprimera définitivement le devis <strong>{quoteToDelete?.quoteNumber}</strong>. Cette action est irréversible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
