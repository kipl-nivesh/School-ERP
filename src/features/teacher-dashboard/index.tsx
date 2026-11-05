import { TeacherWelcomeBanner } from './components/teacher-welcome-banner';
import { TeacherStatsGrid } from './components/teacher-stats-grid';
import { TeacherTimetable } from './components/teacher-timetable';
import { TeacherClasses } from './components/teacher-classes';
import { TeacherAttendance } from './components/teacher-attendance';
import { TeacherHomework } from './components/teacher-homework';
import { TeacherExams } from './components/teacher-exams';
import { TeacherPerformance } from './components/teacher-performance';
import { TeacherAnnouncements } from './components/teacher-announcements';
import { TeacherQuickAccess } from './components/teacher-quick-access';
import './teacher-dashboard.css';
export function TeacherDashboard() {
  return <div className="teacher-demo"><TeacherWelcomeBanner/><TeacherStatsGrid/>
    <div className="td-teaching-grid"><TeacherTimetable/><TeacherClasses/></div>
    <div className="td-learning-grid"><TeacherAttendance/><TeacherPerformance/></div>
    <div className="td-assignment-grid"><TeacherHomework/><TeacherExams/></div>
    <TeacherAnnouncements/><TeacherQuickAccess/>
    <p className="td-endnote">A little encouragement can change a whole school day.<span>All people, records, and activities shown are fictional.</span></p>
  </div>;
}
