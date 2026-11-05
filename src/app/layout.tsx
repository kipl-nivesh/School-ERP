import type { Metadata } from 'next';
import { AnimationProvider } from '@/components/shared/animation';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Brightcamp · School workspace', template: '%s · Brightcamp' }, description: 'Single school ERP — Step 1 development preview.' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en" data-scroll-behavior="smooth"><body><AnimationProvider>{children}</AnimationProvider></body></html>; }

