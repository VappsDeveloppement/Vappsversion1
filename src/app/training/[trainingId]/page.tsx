
import React from 'react';
import { notFound } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TrainingDetailsClient } from './training-details-client';
import type { Training, TrainingModule } from '@/app/dashboard/e-learning/[trainingId]/page';

async function getTrainingData(trainingId: string) {
    if (!trainingId) return null;
    try {
        const { firestore } = initializeFirebase();
        const trainingRef = doc(firestore, 'trainings', trainingId);
        const trainingSnap = await getDoc(trainingRef);

        if (!trainingSnap.exists() || !trainingSnap.data().isPublic) {
            return null;
        }

        const trainingData = { id: trainingSnap.id, ...trainingSnap.data() } as Training;

        let modules: TrainingModule[] = [];
        if (trainingData.moduleIds && trainingData.moduleIds.length > 0) {
            const modulesQuery = query(
                collection(firestore, 'training_modules'),
                where('__name__', 'in', trainingData.moduleIds)
            );
            const modulesSnapshot = await getDocs(modulesQuery);
            const fetchedModules = modulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TrainingModule));
            // Ensure modules are in the correct order
            modules = trainingData.moduleIds.map(id => fetchedModules.find(m => m.id === id)).filter(Boolean) as TrainingModule[];
        }

        return { training: trainingData, modules };
    } catch (error) {
        console.error("Error fetching training data on server:", error);
        return null;
    }
}

export default async function TrainingDetailsPage({ params }: { params: { trainingId: string } }) {
  const { trainingId } = params;
  const data = await getTrainingData(trainingId);

  if (!data) {
    notFound();
  }

  return <TrainingDetailsClient training={data.training} modules={data.modules} />;
}
