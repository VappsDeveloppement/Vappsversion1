

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';

type Counselor = {
    id: string;
    firstName: string;
    lastName: string;
    publicTitle?: string;
    city?: string;
    photoUrl?: string;
    publicProfileName?: string;
};

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function DirectorySection() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [shuffledCounselors, setShuffledCounselors] = useState<Counselor[]>([]);

    const counselorsQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'users'), where('role', '==', 'conseiller'));
    }, [firestore]);

    const { data: counselors, isLoading } = useCollection<Counselor>(counselorsQuery);

    useEffect(() => {
        if (counselors) {
            setShuffledCounselors(shuffleArray(counselors));
        }
    }, [counselors]);

    const filteredCounselors = useMemo(() => {
        if (!shuffledCounselors) return [];
        
        let displayCounselors = searchTerm ? counselors || [] : shuffledCounselors;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            displayCounselors = displayCounselors.filter(counselor =>
                counselor.city?.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        if (!searchTerm) {
          return displayCounselors.slice(0, 9);
        }

        return displayCounselors;

    }, [counselors, shuffledCounselors, searchTerm]);


    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Trouver votre conseiller</h2>
                    <p className="text-lg text-muted-foreground mt-2">
                        Découvrez les profils de nos experts et trouvez celui qui vous correspond.
                    </p>
                </div>

                <div className="max-w-md mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par ville..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {[...Array(6)].map((_, i) => (
                           <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                       ))}
                    </div>
                ) : filteredCounselors.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCounselors.map((counselor) => (
                            <Card key={counselor.id} className="flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
                                <CardContent className="p-6 flex-1 flex flex-col items-center">
                                    <Avatar className="w-24 h-24 mb-4 border-2 border-primary">
                                        <AvatarImage src={counselor.photoUrl || undefined} alt={`${counselor.firstName} ${counselor.lastName}`} />
                                        <AvatarFallback className="text-3xl">
                                            {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="font-bold text-xl">{counselor.firstName} {counselor.lastName}</h3>
                                    <p className="text-primary font-medium text-sm mb-2">{counselor.publicTitle || 'Conseiller'}</p>
                                    {counselor.city && (
                                        <div className="flex items-center text-muted-foreground text-sm gap-1">
                                            <MapPin className="h-4 w-4" />
                                            <span>{counselor.city}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-4">
                                    <Button asChild className="w-full" disabled={!counselor.publicProfileName}>
                                        <Link href={counselor.publicProfileName ? `/c/${counselor.publicProfileName}` : '#'}>
                                            Voir le profil
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground">Aucun conseiller ne correspond à votre recherche.</p>
                )}
            </div>
        </section>
    );
}
