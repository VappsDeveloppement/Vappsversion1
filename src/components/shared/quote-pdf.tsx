
'use client';

import React from 'react';
import { useAgency } from '@/context/agency-provider';

type Quote = {
  id: string;
  quoteNumber: string;
  clientInfo: { name: string; id: string; email: string; };
  issueDate: string;
  expiryDate?: string;
  total: number;
  subtotal: number;
  tax: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  items: any[];
  notes?: string;
}

interface QuotePDFProps {
  quote: Quote;
}

export const QuotePDF = React.forwardRef<HTMLDivElement, QuotePDFProps>(({ quote }, ref) => {
    const { personalization } = useAgency();

    if (!personalization) return null;

    const { legalInfo } = personalization;
    const isVatSubject = legalInfo?.isVatSubject ?? false;
    const fullAddress = [legalInfo?.addressStreet, legalInfo?.addressZip, legalInfo?.addressCity].filter(Boolean).join(', ');
    
    return (
        <div ref={ref} className="bg-white text-gray-800 p-12 text-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif' }}>
            {/* En-tête */}
            <header className="flex justify-between items-start pb-8 mb-8 border-b">
                <div>
                     <h1 className="text-xl font-bold text-gray-900">{legalInfo?.companyName || 'Votre Agence'}</h1>
                     <p className="text-gray-600 mt-2">{legalInfo?.addressStreet}</p>
                     <p className="text-gray-600">{legalInfo?.addressZip} {legalInfo?.addressCity}</p>
                     <p className="text-gray-600 mt-2">{legalInfo?.email}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-900">DEVIS</h2>
                    <p className="text-gray-600 mt-2">
                        N° {quote.quoteNumber}
                    </p>
                </div>
            </header>

            {/* Informations Client & Dates */}
            <section className="flex justify-between items-start mb-10">
                 <div>
                    <h3 className="text-gray-500 font-semibold mb-2">Devis pour :</h3>
                    <p className="font-bold text-base">{quote.clientInfo.name}</p>
                    <p className="text-gray-600">{quote.clientInfo.email}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-600">
                         <span className="font-semibold">Date du devis :</span> {new Date(quote.issueDate).toLocaleDateString('fr-FR')}
                    </p>
                    {quote.expiryDate && (
                         <p className="text-gray-600">
                            <span className="font-semibold">Valide jusqu'au :</span> {new Date(quote.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                    )}
                </div>
            </section>

            {/* Tableau des articles */}
             <section className="my-10">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-[50%]">Description</th>
                            <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase">Qté</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase">P.U. HT</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase">Total HT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {quote.items.map((item, index) => (
                             <tr key={index}>
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{item.unitPrice.toFixed(2)} €</td>
                                <td className="p-3 text-right">{item.total.toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </section>

             {/* Totaux */}
             <section className="my-10 flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total HT</span>
                        <span className="font-medium">{quote.subtotal.toFixed(2)} €</span>
                    </div>
                    {isVatSubject && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">TVA ({quote.tax}%)</span>
                            <span className="font-medium">{(quote.subtotal * (quote.tax / 100)).toFixed(2)} €</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3">
                        <span>Total {isVatSubject ? 'TTC' : ''}</span>
                        <span>{quote.total.toFixed(2)} €</span>
                    </div>
                </div>
             </section>

            {/* Notes */}
             {quote.notes && (
                <section className="my-10 pt-6 border-t border-gray-200">
                    <h4 className="text-gray-500 font-semibold uppercase tracking-wider text-xs mb-3">Notes</h4>
                    <p className="text-gray-600 text-xs whitespace-pre-wrap">{quote.notes}</p>
                </section>
             )}

            {/* Pied de page */}
             <footer className="absolute bottom-10 left-12 right-12 text-center text-[10px] text-gray-500">
                <p>
                    {legalInfo?.companyName}
                    {legalInfo?.structureType && ` - ${legalInfo.structureType}`}
                    {legalInfo?.capital && ` au capital de ${legalInfo.capital}€`}
                    {fullAddress && ` - ${fullAddress}`}
                </p>
                <p>
                    {legalInfo?.siret && `SIRET: ${legalInfo.siret}`}
                    {legalInfo?.apeNaf && ` - Code NAF: ${legalInfo.apeNaf}`}
                    {legalInfo?.isVatSubject ? ` - TVA: ${legalInfo?.vatNumber}` : ' - TVA non applicable, art. 293 B du CGI'}
                </p>
             </footer>
        </div>
    );
});

QuotePDF.displayName = 'QuotePDF';
