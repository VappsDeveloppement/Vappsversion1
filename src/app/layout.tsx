import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { initializeFirebase, getSdks } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';

// Helper function to convert hex to HSL, must be self-contained here.
const hexToHsl = (hex: string): string => {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return '0 0% 0%'; // fallback for invalid hex
  }

  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  
  const r_ = r / 255, g_ = g / 255, b_ = b / 255;
  const max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_: h = (g_ - b_) / d + (g_ < b_ ? 6 : 0); break;
      case g_: h = (b_ - r_) / d + 2; break;
      case b_: h = (r_ - g_) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

// This function can be expanded later if more dynamic metadata is needed
export async function generateMetadata(): Promise<Metadata> {
  // For now, we return static metadata, but we can fetch dynamic data here
  return {
    title: 'VApps Success Hub',
    description: 'Unlock your full potential with VApps professional and personal development coaching.',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeStyles = '';
  try {
    const { firestore } = initializeFirebase();
    const agencyDocRef = doc(firestore, 'agencies', 'vapps-agency');
    const agencyDocSnap = await getDoc(agencyDocRef);

    if (agencyDocSnap.exists()) {
        const personalization = agencyDocSnap.data()?.personalization;
        if (personalization) {
            themeStyles = `
                :root {
                    --primary: ${hexToHsl(personalization.primaryColor || '#2ff40a')};
                    --secondary: ${hexToHsl(personalization.secondaryColor || '#25d408')};
                    --background: ${hexToHsl(personalization.bgColor || '#ffffff')};
                    --sidebar-primary: ${hexToHsl(personalization.primaryColor || '#2ff40a')};
                }
            `;
        }
    }
  } catch (error) {
    console.error("Could not fetch theme colors on server:", error);
    // Use default colors if fetch fails
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        {themeStyles && <style>{themeStyles}</style>}
      </head>
      <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
