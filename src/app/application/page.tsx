import { LoginForm } from '@/components/shared/login-form';
import Image from 'next/image';
import { Logo } from '@/components/shared/logo';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { CtaSection } from '@/components/shared/cta-section';
import { WhiteLabelSection } from '@/components/shared/white-label-section';
import { Footer } from '@/components/shared/footer';
import { HomePageSelector } from '@/components/shared/home-page-selector';

export default function ApplicationPage() {
  return <HomePageSelector />;
}
