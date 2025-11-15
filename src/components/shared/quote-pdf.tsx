
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
        <div ref={ref} className="bg-white text-[#333]" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", padding: '40px' }}>
            {/* En-tête */}
            <header className="flex justify-between items-start mb-16">
                <div>
                     <h1 className="text-3xl font-bold text-gray-800 mb-2">{legalInfo?.companyName || 'VApps'}</h1>
                     <p className="text-xs text-gray-500">{legalInfo?.addressStreet}</p>
                     <p className="text-xs text-gray-500">{legalInfo?.addressZip} {legalInfo?.addressCity}</p>
                     <p className="text-xs text-gray-500 mt-2">{legalInfo?.email}</p>
                     <p className="text-xs text-gray-500">{legalInfo?.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-bold text-gray-200">DEVIS</h2>
                    <p className="text-xs text-gray-500 mt-2">
                        <span className="font-semibold">N°:</span> {quote.quoteNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                        <span className="font-semibold">Date:</span> {new Date(quote.issueDate).toLocaleDateString('fr-FR')}
                    </p>
                     {quote.expiryDate && (
                         <p className="text-xs text-gray-500">
                            <span className="font-semibold">Valide jusqu'au :</span> {new Date(quote.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                    )}
                </div>
            </header>
            
            <hr className="mb-8 border-gray-200" />

            {/* Informations Client */}
            <section className="mb-10">
                 <h3 className="text-xs text-gray-400 font-bold uppercase mb-2">Facturé à</h3>
                 <p className="font-bold text-base text-gray-800">{quote.clientInfo.name}</p>
                 <p className="text-xs text-gray-500">{quote.clientInfo.email}</p>
            </section>

            {/* Tableau des articles */}
             <section className="my-10">
                <table className="w-full text-sm">
                    <thead >
                        <tr className="bg-gray-50">
                            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase w-[50%]">Description</th>
                            <th className="p-3 text-center text-xs font-semibold text-gray-400 uppercase">Qté</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-400 uppercase">P.U. HT</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-400 uppercase">Total HT</th>
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

             {/* Totaux */}
             <section className="my-10 flex justify-end">
                <div className="w-full max-w-xs space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Sous-total HT</span>
                        <span className="font-medium text-gray-700">{quote.subtotal.toFixed(2)} €</span>
                    </div>
                    {isVatSubject && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">TVA ({quote.tax}%)</span>
                            <span className="font-medium text-gray-700">{(quote.subtotal * (quote.tax / 100)).toFixed(2)} €</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-gray-800 border-t border-gray-200 pt-3">
                        <span>Total {isVatSubject ? 'TTC' : ''}</span>
                        <span>{quote.total.toFixed(2)} €</span>
                    </div>
                </div>
             </section>
             
             <div className="flex-grow"></div>

            {/* Notes */}
             {quote.notes && (
                <section className="my-10 pt-6">
                    <h4 className="text-xs text-gray-400 font-bold uppercase mb-2">Notes</h4>
                    <p className="text-xs text-gray-500 whitespace-pre-wrap">{quote.notes}</p>
                </section>
             )}

            {/* Pied de page */}
             <footer className="absolute bottom-10 left-10 right-10 text-center text-[9px] text-gray-400">
                 <p>
                    {legalInfo?.companyName}
                    {fullAddress && ` - ${fullAddress}`}
                </p>
                <p>
                    {legalInfo?.siret && `SIRET: ${legalInfo.siret}`}
                    {legalInfo?.isVatSubject ? ` - TVA: ${legalInfo?.vatNumber}` : ' - TVA non applicable, art. 293 B du CGI'}
                </p>
             </footer>
        </div>
    );
});

QuotePDF.displayName = 'QuotePDF';
