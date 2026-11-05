import { CalendarDays, GraduationCap, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { teacherProfile, formatTeacherDate, formatTeacherTime } from '../data/mock-dashboard';
import { TeacherIllustration } from './teacher-illustration';
import { TeacherReveal } from './motion';
export function TeacherWelcomeBanner() {
  return <>
    <div className="td-page-heading"><div><span className="eyebrow">A LITTLE INSPIRATION, EVERY DAY</span><h1>My teaching workspace</h1></div><span className="td-snapshot"><CalendarDays size={15}/>{formatTeacherDate(teacherProfile.referenceDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
    <div className="td-demo-notice"><span className="td-demo-badge"><span/>Demo data</span><p>Fictional teacher & school records · Sample day at {formatTeacherTime(teacherProfile.referenceTime)} IST. Statuses are fixed to this snapshot.</p></div>
    <TeacherReveal className="td-welcome"><div className="td-welcome-copy"><span className="td-academic-year"><GraduationCap size={16}/>Academic year {teacherProfile.academicYear}</span><h2>Hello, {teacherProfile.displayName}.<br/><span>Small moments. Lasting impact.</span></h2><p>Bring a little wonder to the classroom today.<br/>Your space to teach, encourage, and help every learner grow.</p><span className="td-assigned"><Sparkles size={14}/>Homeroom · {teacherProfile.homeroom}</span><div className="td-welcome-actions"><Button disabled><CalendarDays size={16}/>Take attendance <span>Soon</span></Button><Button variant="outline" disabled><Plus size={16}/>Create homework <span>Soon</span></Button></div></div><div className="td-welcome-art"><TeacherIllustration/></div></TeacherReveal>
  </>;
}
