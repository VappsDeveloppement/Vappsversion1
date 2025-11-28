
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from '@/firebase/provider';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject, getMetadata } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Folder, File as FileIcon, Upload, Trash2, ArrowLeft, Home, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type StorageItem = {
    name: string;
    type: 'folder' | 'file';
    url?: string;
    fullPath: string;
    size?: number;
    updated?: string;
};

export default function GedPage() {
    const storage = useStorage();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState<StorageItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fileToDelete, setFileToDelete] = useState<StorageItem | null>(null);
    const [uploadingFile, setUploadingFile] = useState<File | null>(null);

    const fetchItems = useCallback(async () => {
        if (!storage) return;
        setIsLoading(true);
        try {
            const listRef = ref(storage, currentPath);
            const res = await listAll(listRef);

            const folders: StorageItem[] = res.prefixes.map(folderRef => ({
                name: folderRef.name,
                type: 'folder',
                fullPath: folderRef.fullPath,
            }));

            const filesPromises = res.items.map(async (itemRef) => {
                 const [metadata, url] = await Promise.all([
                    getMetadata(itemRef),
                    getDownloadURL(itemRef)
                ]);
                return {
                    name: itemRef.name,
                    type: 'file' as const,
                    url,
                    fullPath: itemRef.fullPath,
                    size: metadata.size,
                    updated: metadata.updated,
                };
            });

            const files = await Promise.all(filesPromises);

            setItems([...folders, ...files]);
        } catch (error) {
            console.error("Error fetching storage items:", error);
            toast({ title: "Erreur", description: "Impossible de lister les fichiers.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [storage, currentPath, toast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !storage) return;

        setUploadingFile(file);
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        const fileRef = ref(storage, filePath);

        try {
            await uploadBytes(fileRef, file);
            toast({ title: "Téléversement réussi", description: `Le fichier ${file.name} a été ajouté.` });
            fetchItems(); // Refresh list
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Erreur de téléversement", variant: "destructive" });
        } finally {
            setUploadingFile(null);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleDeleteFile = async () => {
        if (!fileToDelete || !storage) return;
        
        const fileRef = ref(storage, fileToDelete.fullPath);
        try {
            await deleteObject(fileRef);
            toast({ title: "Fichier supprimé", description: `${fileToDelete.name} a été supprimé.` });
            fetchItems(); // Refresh list
        } catch (error) {
            toast({ title: "Erreur de suppression", variant: "destructive" });
        } finally {
            setFileToDelete(null);
        }
    };

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
    };

    const handleNavigateBack = () => {
        const pathParts = currentPath.split('/').filter(Boolean);
        pathParts.pop();
        setCurrentPath(pathParts.join('/'));
    };
    
    const formatBytes = (bytes?: number, decimals = 2) => {
        if (bytes === undefined || bytes === 0) return '0 Octets';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestion Électronique des Documents (GED)</h1>
                <p className="text-muted-foreground">Gérez les fichiers de votre espace de stockage.</p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Button variant="ghost" size="icon" onClick={() => handleNavigate('')} disabled={!currentPath}><Home className="h-4 w-4" /></Button>
                            {currentPath && <Button variant="ghost" size="icon" onClick={handleNavigateBack}><ArrowLeft className="h-4 w-4" /></Button>}
                            <span>/</span>
                            <span className="truncate">{currentPath || "Racine"}</span>
                        </div>
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <Button asChild>
                                <div>
                                    {uploadingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                    Téléverser un fichier
                                </div>
                            </Button>
                             <input id="file-upload" ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={!!uploadingFile} />
                        </label>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Nom</TableHead>
                                <TableHead>Taille</TableHead>
                                <TableHead>Dernière modification</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                            ) : items.length > 0 ? (
                                items.map(item => (
                                    <TableRow key={item.fullPath}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {item.type === 'folder' ? <Folder className="h-5 w-5 text-primary" /> : (
                                                    item.url?.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ?
                                                    <Image src={item.url} alt={item.name} width={40} height={40} className="rounded-md object-cover" />
                                                    : <FileIcon className="h-5 w-5 text-muted-foreground" />
                                                )}
                                                {item.type === 'folder' ? (
                                                    <button onClick={() => handleNavigate(item.fullPath)} className="font-medium hover:underline">{item.name}</button>
                                                ) : (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate" title={item.name}>{item.name}</a>
                                                )}
                                            </div>
                                        </TableCell>
                                         <TableCell>{formatBytes(item.size)}</TableCell>
                                        <TableCell>{item.updated ? format(new Date(item.updated), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {item.type === 'file' && (
                                                 <Button variant="ghost" size="icon" onClick={() => setFileToDelete(item)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Ce dossier est vide.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action supprimera définitivement le fichier <strong>{fileToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive hover:bg-destructive/90">
                           Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
    