
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useMemoFirebase } from "@/firebase";
import React, { useMemo, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { createUser } from "@/app/actions/user";
import { Textarea } from "@/components/ui/textarea";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'superadmin' | 'conseiller' | 'membre' | 'prospect' | 'dpo';
  dateJoined: string;
};

const passwordMatchRefine = (data: any) => data.password === data.confirmPassword;
const passwordMatchMessage = {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
};

const baseUserFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
});

const adminFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'superadmin', 'dpo'], { required_error: "Le rôle est requis." }),
}).refine(passwordMatchRefine, passwordMatchMessage);

const conseillerFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  confirmPassword: z.string(),
  role: z.literal('conseiller'),
}).refine(passwordMatchRefine, passwordMatchMessage);

const membreFormSchema = baseUserFormSchema.extend({
    address: z.string().min(1, "L'adresse est requise."),
    zipCode: z.string().min(1, "Le code postal est requis."),
    city: z.string().min(1, "La ville est requise."),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
    confirmPassword: z.string().optional(),
    socialSecurityNumber: z.string().optional(),
    franceTravailId: z.string().optional(),
    role: z.literal('membre'),
}).refine(data => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});


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
  const { toast } = useToast();

  const [adminSearch, setAdminSearch] = useState('');
  const [conseillerSearch, setConseillerSearch] = useState('');
  const [membreSearch, setMembreSearch] = useState('');
  const [prospectSearch, setProspectSearch] = useState('');
  
  const [isConseillerFormOpen, setIsConseillerFormOpen] = useState(false);
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [isMembreFormOpen, setIsMembreFormOpen] = useState(false);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!agency) return null;
    return query(collection(firestore, 'users'), where('agencyId', '==', agency.id));
  }, [agency, firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

  const isLoading = isAgencyLoading || areUsersLoading;

  const adminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "admin",
    },
  });

  const conseillerForm = useForm<z.infer<typeof conseillerFormSchema>>({
    resolver: zodResolver(conseillerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "conseiller",
    },
  });

  const membreForm = useForm<z.infer<typeof membreFormSchema>>({
    resolver: zodResolver(membreFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      zipCode: "",
      city: "",
      password: "",
      confirmPassword: "",
      socialSecurityNumber: "",
      franceTravailId: "",
      role: "membre",
    },
  });

  async function handleCreateUser(values: z.infer<typeof adminFormSchema> | z.infer<typeof conseillerFormSchema> | z.infer<typeof membreFormSchema>) {
    if (!agency) {
        toast({ title: "Erreur", description: "L'agence n'a pas été trouvée.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const result = await createUser({ ...values, agencyId: agency.id });

        if (result.success) {
            toast({ title: "Succès", description: "L'utilisateur a été ajouté." });
            if (values.role === 'conseiller') {
                conseillerForm.reset();
                setIsConseillerFormOpen(false);
            } else if (values.role === 'membre') {
                membreForm.reset();
                setIsMembreFormOpen(false);
            } else {
                adminForm.reset();
                setIsAdminFormOpen(false);
            }
        } else {
            toast({ title: "Erreur de création", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error creating user:", error);
        toast({ title: "Erreur inattendue", description: "Une erreur inattendue est survenue.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

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
  
  const admins = useMemo(() => filterUsers(users, ['admin', 'superadmin', 'dpo'], adminSearch), [users, adminSearch]);
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
              <TabsTrigger value="admins">Admins & DPO</TabsTrigger>
              <TabsTrigger value="conseillers">Conseillers</TabsTrigger>
              <TabsTrigger value="membres">Membres</TabsTrigger>
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
            </TabsList>

            <TabsContent value="admins">
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <Input 
                        placeholder="Rechercher un admin..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isAdminFormOpen} onOpenChange={setIsAdminFormOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter un Admin / DPO
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Ajouter un administrateur ou DPO</DialogTitle>
                                <DialogDescription>
                                    Créez un nouvel utilisateur avec un rôle d'administration.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...adminForm}>
                                <form onSubmit={adminForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={adminForm.control} name="firstName" render={({ field }) => (
                                            <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={adminForm.control} name="lastName" render={({ field }) => (
                                            <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={adminForm.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Mot de passe</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rôle</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un rôle" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="superadmin">Super Admin</SelectItem>
                                                    <SelectItem value="dpo">DPO</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Créer l'utilisateur
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
                <UserTable users={admins} isLoading={isLoading} emptyMessage="Aucun admin ou DPO trouvé." />
              </div>
            </TabsContent>

            <TabsContent value="conseillers">
                <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Rechercher un conseiller..."
                            value={conseillerSearch}
                            onChange={(e) => setConseillerSearch(e.target.value)}
                            className="max-w-sm"
                        />
                         <Dialog open={isConseillerFormOpen} onOpenChange={setIsConseillerFormOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un Conseiller
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Ajouter un conseiller</DialogTitle>
                                    <DialogDescription>
                                        Créez un nouvel utilisateur avec le rôle de conseiller.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...conseillerForm}>
                                    <form onSubmit={conseillerForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={conseillerForm.control} name="firstName" render={({ field }) => (
                                                <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={conseillerForm.control} name="lastName" render={({ field }) => (
                                                <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={conseillerForm.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel>Mot de passe</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <DialogFooter className="pt-4">
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Créer l'utilisateur
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <UserTable users={conseillers} isLoading={isLoading} emptyMessage="Aucun conseiller trouvé." />
                </div>
            </TabsContent>

            <TabsContent value="membres">
                 <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Rechercher un membre..."
                            value={membreSearch}
                            onChange={(e) => setMembreSearch(e.target.value)}
                            className="max-w-sm"
                        />
                         <Dialog open={isMembreFormOpen} onOpenChange={setIsMembreFormOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un Membre
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Ajouter un membre</DialogTitle>
                                    <DialogDescription>
                                        Créez un nouvel utilisateur avec le rôle de membre.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...membreForm}>
                                    <form onSubmit={membreForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={membreForm.control} name="firstName" render={({ field }) => (
                                                <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={membreForm.control} name="lastName" render={({ field }) => (
                                                <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={membreForm.control} name="address" render={({ field }) => (
                                            <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea placeholder="123 Rue de Paris" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={membreForm.control} name="zipCode" render={({ field }) => (
                                                <FormItem><FormLabel>Code postal</FormLabel><FormControl><Input placeholder="75001" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={membreForm.control} name="city" render={({ field }) => (
                                                <FormItem><FormLabel>Ville</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={membreForm.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel>Mot de passe (Optionnel)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="socialSecurityNumber" render={({ field }) => (
                                            <FormItem><FormLabel>N° Sécurité Sociale (Optionnel)</FormLabel><FormControl><Input placeholder="1 23 45..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="franceTravailId" render={({ field }) => (
                                            <FormItem><FormLabel>ID France Travail (Optionnel)</FormLabel><FormControl><Input placeholder="ID..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <DialogFooter className="pt-4">
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Créer le membre
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
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
