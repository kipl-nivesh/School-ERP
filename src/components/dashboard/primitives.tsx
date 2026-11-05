import { Sparkles, ArrowUpRight, Construction } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatedCard } from '@/components/shared/animation';
import { Skeleton } from '@/components/ui/skeleton';
export function PageHeader({ eyebrow, title, description }: {
    eyebrow: string;
    title: string;
    description: string;
}) { return <div className="page-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>; }
export function StatCardPlaceholder({ title, icon: Icon, index }: {
    title: string;
    icon: LucideIcon;
    index: number;
}) { return <AnimatedCard className="placeholder-card"><div className="card-top"><span className={'icon-tile tone-' + index}><Icon size={21}/></span><span className="badge">Coming soon</span></div><h3>{title}</h3><p>Your {title.toLowerCase()} overview will live here.</p><div className="placeholder-line" aria-hidden="true"/><span className="card-caption">Planned workspace <ArrowUpRight size={14}/></span></AnimatedCard>; }
export function SectionCard({ title, children }: {
    title: string;
    children: React.ReactNode;
}) { return <section className="section-card"><div className="section-title"><h2>{title}</h2><Sparkles size={17}/></div>{children}</section>; }
export function EmptyState() { return <div className="empty-state"><span className="empty-icon"><Construction size={25}/></span><h3>Good things are on the way</h3><p>This space is ready for future school updates. There’s no live activity in this preview.</p><span className="badge">Coming in a future step</span></div>; }
export function LoadingSkeleton() { return <div role="status" aria-label="Loading workspace" className="loading-skeleton"><Skeleton className="h-5 w-2/5"/><Skeleton className="h-3 w-4/5"/><Skeleton className="h-3 w-3/5"/><span className="sr-only">Loading workspace</span></div>; }
