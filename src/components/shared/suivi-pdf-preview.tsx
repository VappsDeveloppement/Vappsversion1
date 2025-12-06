
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Mail, Phone } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { VitaeAnalysisBlock } from '@/components/shared/vitae-analysis-block';
import { PrismeAnalysisBlock } from '@/components/shared/prisme-analysis-block';
import { useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import Image from 'next/image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


// Types (must be self-contained or imported)
type FollowUp = {
    id: string;
    clientName: string;
    modelName: string;
};
type QuestionModel = {
    id: string;
    name: string;
    questions?: any[];
};

// This is the component that was missing.
export const ResultDisplayBlock = ({ block, answer, suivi }: { block: any, answer: any, suivi: FollowUp }) => {
    switch (block.type) {
        case 'scale':
            const scaleAnswers = answer || {};
            const chartData = block.questions.map((q: any) => ({
                subject: q.text,
                A: scaleAnswers[q.id] || 0,
                fullMark: 10,
            }));
            
            return (
                <Card>
                    <CardHeader><CardTitle>{block.title || "Échelle"}</CardTitle></CardHeader>
                    <CardContent>
                        {block.questions.length > 1 ? (
                             <div data-html2canvas-ignore="true">
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
                                        <PolarRadiusAxis angle={30} domain={[0, 10]} />
                                        <Radar name={suivi.clientName} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    </RadarChart>
                                </ResponsiveContainer>
                             </div>
                        ) : block.questions.map((q: any) => (
                             <div key={q.id}>
                                <p>{q.text}: <strong>{scaleAnswers[q.id] || 'N/A'}/10</strong></p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            );
        case 'free-text':
            return (
                <Card><CardHeader><CardTitle>{block.question}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap">{answer || 'Non répondu'}</p></CardContent></Card>
            );
        case 'report':
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent>
                        <h4 className="font-semibold mb-2">Compte rendu</h4>
                        <p className="whitespace-pre-wrap mb-4">{answer?.text || 'Non rédigé'}</p>
                        {answer?.partners?.length > 0 && <>
                            <h4 className="font-semibold mb-2">Partenaires associés</h4>
                            <div className="space-y-2">
                                {answer.partners.map((p: any) => (
                                    <div key={p.id} className="text-sm p-3 border rounded-lg bg-muted">
                                        <p className="font-bold">{p.name}</p>
                                        <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                                            {p.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{p.email}</p>}
                                            {p.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{p.phone}</p>}
                                            {p.specialties && p.specialties.length > 0 && <p><strong>Spéc:</strong> {p.specialties.join(', ')}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>}
                    </CardContent>
                </Card>
            );
        case 'scorm':
            const calculateScormResult = (scormBlock: any, scormAnswers: any): any | null => {
                 if (!scormBlock.questions || !scormBlock.results || !scormAnswers) return null;
                const questionIds = scormBlock.questions.map((q: any) => q.id);
                if (questionIds.some((qId: string) => !scormAnswers[qId])) {
                    return null;
                }
            
                const valueCounts: Record<string, number> = {};
                for (const qId of questionIds) {
                    const answerId = scormAnswers[qId];
                    if (!answerId) continue;
                    const question = scormBlock.questions.find((q: any) => q.id === qId);
                    const answerData = question?.answers.find((a:any) => a.id === answerId);
                    if (answerData?.value) {
                        valueCounts[answerData.value] = (valueCounts[answerData.value] || 0) + 1;
                    }
                }
            
                if (Object.keys(valueCounts).length === 0) return null;
            
                const dominantValue = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                return scormBlock.results.find((r: any) => r.value === dominantValue) || null;
            };

            const scormResult = calculateScormResult(block, answer);
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent>
                         {scormResult ? (
                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: scormResult.text }} />
                        ) : 'Résultat non calculé.'}
                    </CardContent>
                </Card>
             );
        case 'qcm':
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {(block.questions || []).map((q: any) => {
                             const selectedAnswerId = answer?.[q.id];
                             const selectedAnswer = q.answers.find((a:any) => a.id === selectedAnswerId);
                             return (
                                 <div key={q.id}>
                                     <p className="font-semibold">{q.text}</p>
                                     <p className="text-sm text-muted-foreground">Réponse: {selectedAnswer?.text || 'Non répondu'}</p>
                                      {selectedAnswer?.resultText && (
                                        <div className="mt-2 text-sm prose dark:prose-invert max-w-none border-l-2 pl-4" dangerouslySetInnerHTML={{ __html: selectedAnswer.resultText}}/>
                                      )}
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            );
        case 'prisme':
            return (
                <Card><CardHeader><CardTitle>Analyse Prisme</CardTitle></CardHeader>
                    <CardContent>
                         {answer?.drawnCards?.length > 0 ? (
                            <div className="space-y-4">
                                {answer.drawnCards.map((item: any, index: React.Key | null | undefined) => (
                                    <div key={index} className="flex gap-4 p-4 border rounded-lg bg-background">
                                        <div className="flex-shrink-0">
                                            {item.card.imageUrl ? <Image src={item.card.imageUrl} alt={item.card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{item.position.meaning}</p>
                                            <h4 className="text-lg font-bold">{item.card.name}</h4>
                                            <p className="text-sm">{item.card.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : 'Aucun tirage effectué.'}
                    </CardContent>
                </Card>
            );
        case 'vitae':
            return (
                <Card>
                    <CardHeader><CardTitle>Analyse Vitae</CardTitle></CardHeader>
                    <CardContent>
                        <VitaeAnalysisBlock savedAnalysis={answer} onSaveAnalysis={() => {}} onSaveBlock={async () => {}} readOnly />
                    </CardContent>
                </Card>
            );
        case 'aura':
            const renderSuggestions = (title: string, data: { products: any[], protocoles: any[] }, key: any) => {
                 if (!data || (!data.products?.length && !data.protocoles?.length)) {
                    return null;
                }
                return (
                    <div key={key} className="mb-4">
                        <h4 className="font-semibold text-primary">{title}</h4>
                        {data.products && data.products.length > 0 && <p className="text-sm"><b>Produits:</b> {data.products.map((p: any) => p.title).join(', ')}</p>}
                        {data.protocoles && data.protocoles.length > 0 && <p className="text-sm"><b>Protocoles:</b> {data.protocoles.map((p: any) => p.name).join(', ')}</p>}
                    </div>
                );
             };

            if (!answer) {
                return (
                    <Card>
                        <CardHeader><CardTitle>Analyse AURA</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">Analyse non effectuée.</p></CardContent>
                    </Card>
                );
            }

            return (
                <Card>
                    <CardHeader><CardTitle>Analyse AURA</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                             <h3 className="font-bold text-lg mb-2">Correspondance par Pathologie</h3>
                             {answer.byPathology && answer.byPathology.length > 0 ? answer.byPathology.map((item: any) => renderSuggestions(item.pathology, { products: item.products, protocoles: item.protocoles }, item.pathology)) : <p className="text-sm text-muted-foreground">Aucune.</p>}
                        </div>
                         <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Adapté au Profil Holistique</h3>
                            {renderSuggestions('', answer.byHolisticProfile, 'holistic')}
                        </div>
                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Cohérence Parfaite</h3>
                             {renderSuggestions('', answer.perfectMatch, 'perfect')}
                        </div>
                    </CardContent>
                </Card>
            );
        default:
             const unknownAnswerText = answer ? JSON.stringify(answer, null, 2) : "Non répondu";
            return (
                <Card>
                    <CardHeader><CardTitle>{(block as any).title || block.type}</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded-md">{unknownAnswerText}</pre>
                    </CardContent>
                </Card>
            );
    }
};

const OffscreenChartRenderer = ({ blocks, answers, suivi }: { blocks: any[], answers: Record<string, any>, suivi: FollowUp }) => {
    return (
        <div style={{ position: 'absolute', left: '-9999px', top: '0px', width: '600px', zIndex: -100 }}>
            {blocks
                .filter(block => block.type === 'scale' && block.questions.length > 1)
                .map(block => {
                    const scaleAnswers = answers[block.id] || {};
                    const chartData = block.questions.map((q: any) => ({
                        subject: q.text,
                        A: scaleAnswers[q.id] || 0,
                        fullMark: 10,
                    }));
                    return (
                        <div key={`chart-offscreen-${block.id}`} id={`chart-${block.id}`} style={{ width: '600px', height: '400px', backgroundColor: 'white', padding: '20px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} />
                                    <Radar name={suivi.clientName} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })
            }
        </div>
    );
};

export const PdfPreviewModal = ({ isOpen, onOpenChange, suivi, model, liveAnswers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, suivi: FollowUp, model: QuestionModel | null, liveAnswers: Record<string, any> }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: currentUserData } = useDoc(userDocRef);

    const handleExportPdf = async () => {
        if (!suivi || !model || !currentUserData) return;
        
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const docJs = new jsPDF();
        let yPos = 20;

        docJs.setFontSize(22);
        docJs.text(`Suivi pour ${suivi.clientName}`, docJs.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
        yPos += 8;
        docJs.setFontSize(14);
        docJs.text(`Modèle: ${suivi.modelName}`, docJs.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
        yPos += 15;

        for (const block of model.questions || []) {
            if (yPos > 250) {
                docJs.addPage();
                yPos = 20;
            }
            docJs.setFontSize(16);
            docJs.setFont('helvetica', 'bold');
            const title = (block as any).title || (block.type === 'free-text' ? (block as any).question : `Bloc ${block.type}`);
            docJs.text(title, 15, yPos);
            yPos += 10;
            docJs.setFont('helvetica', 'normal');

            const answer = liveAnswers[block.id];
            
            switch (block.type) {
                case 'scale':
                    const chartElement = document.getElementById(`chart-${block.id}`);
                    if (block.questions.length > 1 && chartElement) {
                        try {
                            const canvas = await html2canvas(chartElement, { useCORS: true, logging: false, removeContainer: true, foreignObjectRendering: false, container: document.body });
                            const imgData = canvas.toDataURL('image/png');
                            if (docJs.internal.pageSize.height - yPos < 90) {
                                docJs.addPage();
                                yPos = 20;
                            }
                            docJs.addImage(imgData, 'PNG', 15, yPos, 180, 80);
                            yPos += 90;
                        } catch(e) {
                             console.error("Failed to render chart to canvas, printing text fallback.", e);
                            block.questions.forEach((q: any) => {
                                const value = answer?.[q.id] || 0;
                                const text = `${q.text}: ${value}/10`;
                                if (docJs.internal.pageSize.height - yPos < 10) { docJs.addPage(); yPos = 20; }
                                docJs.text(text, 15, yPos);
                                yPos += 8;
                            });
                        }
                    } else {
                        block.questions.forEach((q: any) => {
                            const value = answer?.[q.id] || 0;
                            const text = `${q.text}: ${value}/10`;
                            if (docJs.internal.pageSize.height - yPos < 10) { docJs.addPage(); yPos = 20; }
                            docJs.text(text, 15, yPos);
                            yPos += 8;
                        });
                    }
                    break;
                case 'report':
                    if (answer?.text) {
                        const reportLines = docJs.splitTextToSize(answer.text, 180);
                        docJs.text(reportLines, 15, yPos);
                        yPos += reportLines.length * 7 + 5;
                    }
                    if (answer?.partners?.length > 0) {
                        if (docJs.internal.pageSize.height - yPos < 30) { docJs.addPage(); yPos = 20; }
                        autoTable(docJs, { head: [['Nom', 'Spécialités']], body: answer.partners.map((p: any) => [p.name, p.specialties?.join(', ') || '']), startY: yPos });
                        yPos = (docJs as any).lastAutoTable.finalY + 10;
                    }
                    break;
                case 'qcm':
                case 'scorm':
                    const isScorm = block.type === 'scorm';
                    let finalResultText: string | null = null;
                    if(isScorm && answer) {
                        const valueCounts: Record<string, number> = {};
                        block.questions.forEach((q:any) => {
                            const ansId = answer[q.id];
                            if(ansId) {
                                const ans = q.answers.find((a:any) => a.id === ansId);
                                if(ans && ans.value) valueCounts[ans.value] = (valueCounts[ans.value] || 0) + 1;
                            }
                        });
                        const dominantValue = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b, '');
                        finalResultText = block.results?.find((r:any) => r.value === dominantValue)?.text || null;
                    }

                    (block.questions || []).forEach((q: any) => {
                        const selectedAnswerId = answer?.[q.id];
                        const selectedAnswer = q.answers.find((a:any) => a.id === selectedAnswerId);
                        
                        docJs.setFontSize(11);
                        docJs.setFont('helvetica', 'bold');
                        const questionLines = docJs.splitTextToSize(q.text, 180);
                        docJs.text(questionLines, 15, yPos);
                        yPos += questionLines.length * 6;

                        docJs.setFontSize(10);
                        docJs.setFont('helvetica', 'normal');
                        docJs.text(`Réponse : ${selectedAnswer?.text || 'Non répondu'}`, 20, yPos);
                        yPos += 6;

                        if (selectedAnswer?.resultText) {
                            const resultLines = docJs.splitTextToSize(selectedAnswer.resultText, 170);
                            docJs.text(resultLines, 20, yPos);
                            yPos += resultLines.length * 6;
                        }
                        yPos += 4;
                    });
                     if (isScorm && finalResultText) {
                        docJs.setFontSize(12);
                        docJs.setFont('helvetica', 'bold');
                        docJs.text("Résultat Final:", 15, yPos);
                        yPos += 8;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = finalResultText;
                        const textContent = tempDiv.textContent || tempDiv.innerText || "";
                        const lines = docJs.splitTextToSize(textContent, 180);
                        docJs.setFont('helvetica', 'normal');
                        docJs.text(lines, 15, yPos);
                        yPos += lines.length * 7 + 5;
                    }
                    break;
                 case 'prisme':
                    if (answer?.drawnCards?.length > 0) {
                       answer.drawnCards.forEach((item: any) => {
                           if (yPos > 240) { docJs.addPage(); yPos = 20; }
                           docJs.setFontSize(10);
                           docJs.setFont('helvetica', 'bold');
                           docJs.text(`${item.position.positionNumber}. ${item.position.meaning}:`, 15, yPos);
                           yPos += 6;
                           docJs.setFont('helvetica', 'normal');
                           docJs.text(`Carte: ${item.card.name}`, 20, yPos);
                           yPos += 10;
                       });
                    } else {
                        docJs.text("Aucun tirage effectué.", 15, yPos); yPos += 10;
                    }
                    break;
                case 'vitae':
                case 'aura':
                     const renderJsonAsList = (title: string, data: any) => {
                        if (!data) return;
                        if (Array.isArray(data) && data.length === 0) return;
                        if (typeof data === 'object' && Object.keys(data).length === 0) return;
                        
                        docJs.setFontSize(12);
                        docJs.setFont('helvetica', 'bold');
                        docJs.text(title, 15, yPos);
                        yPos += 8;
                        docJs.setFontSize(10);
                        docJs.setFont('helvetica', 'normal');

                        if (block.type === 'aura') {
                             if(data.byPathology) {
                                data.byPathology.forEach((item: any) => {
                                    const products = item.products?.map((p: any) => p.title).join(', ') || 'Aucun';
                                    const protocoles = item.protocoles?.map((p: any) => p.name).join(', ') || 'Aucun';
                                    
                                    const pathLines = docJs.splitTextToSize(`- ${item.pathology}:`, 180);
                                    docJs.text(pathLines, 20, yPos); yPos += pathLines.length * 6;

                                    const prodLines = docJs.splitTextToSize(`  Produits: ${products}`, 170);
                                    docJs.text(prodLines, 25, yPos); yPos += prodLines.length * 6;

                                    const protLines = docJs.splitTextToSize(`  Protocoles: ${protocoles}`, 170);
                                    docJs.text(protLines, 25, yPos); yPos += protLines.length * 6;
                                });
                             }
                        } else { // VITA
                             if (data.score) { docJs.text(`- Score de correspondance: ${data.score}%`, 20, yPos); yPos += 6; }
                             if (data.matching?.length) { 
                                const lines = docJs.splitTextToSize(`- Points forts: ${data.matching.join(', ')}`, 170);
                                docJs.text(lines, 20, yPos);
                                yPos += lines.length * 6;
                             }
                             if (data.missing?.length) { 
                                const lines = docJs.splitTextToSize(`- Points faibles: ${data.missing.join(', ')}`, 170);
                                docJs.text(lines, 20, yPos);
                                yPos += lines.length * 6;
                             }
                        }
                    };
                    renderJsonAsList('Analyse', answer);
                    yPos += 5;
                    break;
                default:
                    const answerText = answer !== undefined ? JSON.stringify(answer, null, 2) : "Non répondu";
                    const lines = docJs.splitTextToSize(answerText, 180);
                    docJs.text(lines, 15, yPos);
                    yPos += lines.length * 7 + 5;
                    break;
            }
            yPos += 5;
        }

        docJs.save(`Suivi_${suivi.clientName.replace(' ', '_')}_${new Date().toLocaleDateString()}.pdf`);
    };

    if (!model) return null;

    return (
        <>
            <OffscreenChartRenderer blocks={model.questions || []} answers={liveAnswers} suivi={suivi} />
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Aperçu du Suivi - {suivi.clientName}</DialogTitle>
                        <DialogDescription>Modèle: {suivi.modelName}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-6" id="pdf-content">
                            {model.questions?.map(block => {
                                const answer = liveAnswers[block.id];
                                return <ResultDisplayBlock key={block.id} block={block} answer={answer} suivi={suivi} />;
                            })}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handleExportPdf}>
                            <Download className="mr-2 h-4 w-4" /> Télécharger en PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
