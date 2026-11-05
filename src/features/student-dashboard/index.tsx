import { StudentWelcomeBanner } from './components/student-welcome-banner';
import { StudentStatsGrid } from './components/student-stats-grid';
import { StudentTimetable } from './components/student-timetable';
import { StudentHomework } from './components/student-homework';
import { StudentAttendance } from './components/student-attendance';
import { StudentPerformance } from './components/student-performance';
import { StudentExams } from './components/student-exams';
import { StudentAchievements } from './components/student-achievements';
import { StudentLearningProgress } from './components/student-learning-progress';
import { StudentAnnouncements } from './components/student-announcements';
import { StudentQuickAccess } from './components/student-quick-access';
import { studentHomework,studentSubjects,studentProfile,studentMarks,studentAchievements } from './data/mock-dashboard';
import './student-dashboard.css';
export function StudentDashboard() {
  return <div className="student-demo"><StudentWelcomeBanner/><StudentStatsGrid/>
    <div className="sd-schoolday-grid"><StudentTimetable/><StudentHomework assignments={studentHomework} subjects={studentSubjects} referenceDate={studentProfile.referenceDate}/></div>
    <div className="sd-insights-grid"><StudentAttendance/><StudentPerformance marks={studentMarks} subjects={studentSubjects}/></div>
    <div className="sd-next-grid"><StudentExams/><StudentLearningProgress/></div>
    <StudentAchievements badges={studentAchievements}/><StudentAnnouncements/><StudentQuickAccess/>
    <p className="sd-endnote">A little curiosity goes a long way.<span>All people, records, and achievements shown are fictional.</span></p>
  </div>;
}
