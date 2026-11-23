import { Heart, ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parentProfile } from '../data/mock-dashboard';
import { ParentIllustration } from './parent-illustration';
import { ParentReveal } from './motion';
import type { ParentSessionData } from '../types';

export function ParentWelcomeBanner({ sessionData }: { sessionData?: ParentSessionData | null }) {
  const isLive = Boolean(sessionData);

  return (
    <>
      <div className="pd-page-heading">
        <div>
          <span className="pd-eyebrow">FAMILY & SCHOOL, CONNECTED</span>
          <h1>Parent overview</h1>
          <p>A little closer to every school day.</p>
        </div>
        {isLive ? (
          <span className="pd-demo" style={{ background: '#059669', color: '#fff', borderColor: '#047857' }}>
            <ShieldCheck size={14} /> Verified Portal · {sessionData?.schoolName}
          </span>
        ) : (
          <span className="pd-demo">
            <Sparkles size={14} /> Demo Data · {parentProfile.academicYear}
          </span>
        )}
      </div>

      <ParentReveal className="pd-welcome">
        <div className="pd-welcome-copy">
          <span className="pd-kicker">
            <Heart size={15} /> Good things grow together
          </span>
          <h2>
            Hello, {isLive ? sessionData?.displayName.split(' ')[0] : parentProfile.name.split(' ')[0]}.<br />
            Welcome to {isLive ? sessionData?.student.name : 'their'}&apos;s world.
          </h2>
          <p>
            {isLive
              ? `Stay connected with ${sessionData?.student.fullName}'s learning journey at ${sessionData?.schoolName}. Academic records and fee summaries verified.`
              : 'Stay connected with your child’s learning journey. A little encouragement at home makes a world of difference.'}
          </p>
          <div className="pd-hero-actions">
            <Button asChild>
              <a href="#parent-children">Meet your learners <ArrowUpRight size={15} /></a>
            </Button>
            <a className="pd-secondary-link" href="#parent-notices">Around the school <ArrowUpRight size={15} /></a>
          </div>
          <small>
            {isLive
              ? `Verified Guardian: ${sessionData?.displayName} (${sessionData?.email}) · Linked Child: ${sessionData?.student.fullName} (${sessionData?.student.registrationNumber})`
              : `Fictional parent: ${parentProfile.name} · Academic year ${parentProfile.academicYear}`}
          </small>
        </div>
        <ParentIllustration />
      </ParentReveal>

      <p className="pd-snapshot">
        {isLive
          ? `Authenticated cloud session · Linked exclusively to ${sessionData?.student.fullName} (${sessionData?.student.registrationNumber}) · Row Level Security active.`
          : 'Fictional snapshot · 4 November 2026, 10:20 AM IST. All dates, balances, and learning records are demo data.'}
      </p>
    </>
  );
}
