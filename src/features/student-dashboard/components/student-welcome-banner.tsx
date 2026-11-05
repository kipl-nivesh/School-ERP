import { CalendarDays, GraduationCap, ArrowUpRight, BookOpen, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { studentProfile } from '../data/mock-dashboard';
import { formatStudentDate,formatStudentTime } from '../lib/calculations';
import { StudentIllustration } from './student-illustration';
import { StudentReveal } from './motion';
export function StudentWelcomeBanner() {
  return <><div className="sd-page-heading"><div><span className="eyebrow">A WORLD OF THINGS TO DISCOVER</span><h1>My learning space</h1></div><span className="sd-snapshot"><CalendarDays size={15}/>{formatStudentDate(studentProfile.referenceDate,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span></div>
    <div className="sd-demo-note"><span className="sd-demo-badge"><span/>Demo data</span><p>Fictional student records · Sample day: {formatStudentDate(studentProfile.referenceDate)}, {formatStudentTime(studentProfile.referenceTime)} IST. Schedules and countdowns use this fixed date.</p></div>
    <StudentReveal className="sd-welcome"><div className="sd-welcome-copy"><span className="sd-class-year"><GraduationCap size={16}/><span>{studentProfile.className} {studentProfile.section}</span><i/><span>Academic year {studentProfile.academicYear}</span></span><h2>Hey, {studentProfile.firstName}!<br/><span>Your next chapter looks bright.</span></h2><p>Keep learning, keep growing.<br/>There’s a little discovery in every school day.</p><div className="sd-welcome-actions"><Button asChild><a href="#student-homework"><BookOpen size={16}/>View homework<ArrowUpRight size={15}/></a></Button><Button asChild variant="outline"><a href="#student-timetable"><Clock3 size={16}/>View timetable</a></Button></div><span className="sd-welcome-caption">Small steps. New ideas. Your own pace.</span></div><div className="sd-welcome-art"><StudentIllustration/></div></StudentReveal></>;
}

