import { CalendarDays, GraduationCap, Plus, ArrowUpRight, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockSchool, formatDemoDate } from '../data/mock-dashboard';
import { Reveal } from './motion';
export function AdminWelcomeBanner({ currentDate }: { currentDate: string }) {
  return <><div className="ad-page-title"><div><span className="eyebrow">THE BIG PICTURE</span><h1>School overview</h1></div><div className="ad-date"><CalendarDays size={15}/><span>{currentDate}</span></div></div>
    <div className="ad-demo-note"><span className="ad-demo-badge"><span/>Demo data</span><p>Fictional school records · Snapshot {formatDemoDate(mockSchool.snapshotDate, { day: 'numeric', month: 'long', year: 'numeric' })}. No live data or workflows.</p></div>
    <Reveal className="ad-welcome"><div className="ad-welcome-content"><span className="ad-year"><GraduationCap size={15}/>Academic year {mockSchool.academicYear}</span><h2>Hello, Admin.<br/><span>Let’s make today a great day.</span></h2><p>Here’s what’s happening at your school today.</p><div className="ad-welcome-actions"><Button disabled><Plus size={16}/>Add student<span className="ad-button-soon">Soon</span></Button><Button variant="outline" disabled><CalendarDays size={16}/>Take attendance<span className="ad-button-soon">Soon</span></Button></div></div><div className="ad-welcome-art" aria-hidden="true"><div className="ad-art-ring"/><div className="ad-art-book"><BookOpen size={55}/><span>A LITTLE CURIOSITY.<br/>A WORLD OF POSSIBILITY.</span></div><span className="ad-art-cap"><GraduationCap size={35}/></span><span className="ad-art-spark"><Sparkles size={26}/></span><span className="ad-art-arrow"><ArrowUpRight size={22}/></span></div></Reveal></>;
}
