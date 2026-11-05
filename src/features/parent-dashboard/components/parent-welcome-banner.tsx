import { Heart, ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parentProfile } from '../data/mock-dashboard';
import { ParentIllustration } from './parent-illustration';
import { ParentReveal } from './motion';
export function ParentWelcomeBanner() {
  return <><div className="pd-page-heading"><div><span className="pd-eyebrow">FAMILY & SCHOOL, CONNECTED</span><h1>Parent overview</h1><p>A little closer to every school day.</p></div><span className="pd-demo"><Sparkles size={14}/>Demo Data · {parentProfile.academicYear}</span></div>
    <ParentReveal className="pd-welcome"><div className="pd-welcome-copy"><span className="pd-kicker"><Heart size={15}/>Good things grow together</span><h2>Hello, {parentProfile.name.split(' ')[0]}.<br/>Welcome to their world.</h2><p>Stay connected with your child’s learning journey. A little encouragement at home makes a world of difference.</p><div className="pd-hero-actions"><Button asChild><a href="#parent-children">Meet your learners<ArrowUpRight size={15}/></a></Button><a className="pd-secondary-link" href="#parent-notices">Around the school <ArrowUpRight size={15}/></a></div><small>Fictional parent: {parentProfile.name} · Academic year {parentProfile.academicYear}</small></div><ParentIllustration/></ParentReveal>
    <p className="pd-snapshot">Fictional snapshot · 4 November 2026, 10:20 AM IST. All dates, balances, and learning records are demo data.</p></>;
}
