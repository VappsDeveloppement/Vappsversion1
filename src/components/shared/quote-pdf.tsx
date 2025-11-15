
'use client';

import React from 'react';
import { Logo } from './logo';
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
    const { agency, personalization } = useAgency();

    if (!agency || !personalization) return null;

    const isVatSubject = personalization.legalInfo?.isVatSubject ?? false;
    
    return (
        <div ref={ref} className="bg-white text-black p-12" style={{ width: '210mm', minHeight: '297mm' }}>
            <header className="flex justify-between items-start pb-8 border-b-2 border-gray-200">
                <div>
                     <h1 className="text-4xl font-bold text-gray-800">{personalization.legalInfo?.companyName || 'Votre Agence'}</h1>
                     <p className="text-gray-500 mt-2">{personalization.legalInfo?.addressStreet}</p>
                     <p className="text-gray-500">{personalization.legalInfo?.addressZip} {personalization.legalInfo?.addressCity}</p>
                     <p className="text-gray-500">{personalization.legalInfo?.email}</p>
                     <p className="text-gray-500">{personalization.legalInfo?.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-extrabold text-gray-300">DEVIS</h2>
                    <p className="text-gray-600 mt-2">
                        <span className="font-semibold">N°:</span> {quote.quoteNumber}
                    </p>
                    <p className="text-gray-600">
                         <span className="font-semibold">Date:</span> {new Date(quote.issueDate).toLocaleDateString('fr-FR')}
                    </p>
                </div>
            </header>

            <section className="my-10">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-gray-500 font-semibold uppercase tracking-wider text-sm mb-3">Facturé à</h3>
                        <p className="font-bold text-lg">{quote.clientInfo.name}</p>
                        <p className="text-gray-600">{quote.clientInfo.email}</p>
                    </div>
                </div>
            </section>

             <section className="my-10">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600 uppercase w-[50%]">Description</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600 uppercase">Qté</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600 uppercase">P.U. HT</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600 uppercase">Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quote.items.map((item, index) => (
                             <tr key={index} className="border-b border-gray-100">
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{item.unitPrice.toFixed(2)} €</td>
                                <td className="p-3 text-right">{item.total.toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </section>

             <section className="my-10 flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Sous-total HT</span>
                        <span className="font-medium">{quote.subtotal.toFixed(2)} €</span>
                    </div>
                    {isVatSubject && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">TVA ({quote.tax}%)</span>
                            <span className="font-medium">{(quote.subtotal * (quote.tax / 100)).toFixed(2)} €</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-xl border-t-2 border-gray-200 pt-3">
                        <span>Total {isVatSubject ? 'TTC' : ''}</span>
                        <span>{quote.total.toFixed(2)} €</span>
                    </div>
                </div>
             </section>

             {quote.notes && (
                <section className="my-10 pt-6 border-t-2 border-gray-200">
                    <h4 className="text-gray-500 font-semibold uppercase tracking-wider text-sm mb-3">Notes</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{quote.notes}</p>
                </section>
             )}

             <footer className="absolute bottom-12 left-12 right-12 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
                <p>{personalization.legalInfo?.companyName} - {fullAddress}</p>
                <p>SIRET: {personalization.legalInfo?.siret} - {personalization.legalInfo?.isVatSubject ? `TVA: ${personalization.legalInfo?.vatNumber}` : 'TVA non applicable, art. 293 B du CGI'}</p>
             </footer>
        </div>
    );
});

QuotePDF.displayName = 'QuotePDF';
