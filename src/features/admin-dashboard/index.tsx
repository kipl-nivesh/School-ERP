'use client';

import {
  Users,
  GraduationCap,
  ClipboardList,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  NotebookPen,
  FileText,
  Wallet,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  type LucideIcon,
} from 'lucide-react';
import { AdminWelcomeBanner } from './components/admin-welcome-banner';
import { AdminStatsGrid } from './components/admin-stats-grid';
import { AttendanceAnalytics } from './components/attendance-analytics';
import { FeeCollectionOverview } from './components/fee-collection-overview';
import { StudentDistributionChart } from './components/student-distribution-chart';
import { UpcomingEvents } from './components/upcoming-events';
import { RecentActivities } from './components/recent-activities';
import { QuickAccessGrid } from './components/quick-access-grid';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule, navigateToModule } from '@/lib/navigation/use-active-module';
import {
  mockSchool,
  studentDistribution,
  totalStudents,
  attendance,
  attendancePercent,
  formatINR,
  formatNumber,
  examSchedule,
  recentActivities,
  fees,
} from './data/mock-dashboard';
import './admin-dashboard.css';

export function AdminDashboard({ currentDate }: { currentDate: string }) {
  const [activeModule] = useActiveModule(roleModuleIds.admin, 'overview');

  return (
    <div className="admin-demo">
      {/* OVERVIEW MODULE */}
      {activeModule === 'overview' && (
        <div id="module-overview">
          <AdminWelcomeBanner currentDate={currentDate} />
          <AdminStatsGrid />
          <div className="ad-bottom-grid">
            <UpcomingEvents />
            <RecentActivities />
          </div>
          <QuickAccessGrid />
        </div>
      )}

      {/* STUDENTS MODULE */}
      {activeModule === 'students' && (
        <section id="students" aria-labelledby="students-heading" className="ad-module-view">
          <ModuleHeader
            category="People"
            title="Student Directory & Distribution"
            subtitle={`${formatNumber(totalStudents)} enrolled students across Classes I–XII`}
            icon={GraduationCap}
          />
          <StudentDistributionChart />
          <div className="ad-panel" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ad-icon" style={{ width: '32px', height: '32px' }}><Search size={16} /></span>
                <input
                  type="search"
                  placeholder="Search students by name, roll no, class..."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '12px', minWidth: '240px' }}
                  defaultValue=""
                  aria-label="Search students"
                />
              </div>
              <span className="ad-label"><Filter size={12} style={{ marginRight: '4px' }} /> Classes I–XII active</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    <th style={{ padding: '10px 12px' }}>Group</th>
                    <th style={{ padding: '10px 12px' }}>Grades</th>
                    <th style={{ padding: '10px 12px' }}>Enrolled</th>
                    <th style={{ padding: '10px 12px' }}>Sections</th>
                    <th style={{ padding: '10px 12px' }}>Attendance avg</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentDistribution.map((group) => (
                    <tr key={group.label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{group.label}</td>
                      <td style={{ padding: '12px' }}>{group.grades}</td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{group.students}</td>
                      <td style={{ padding: '12px' }}>{group.label === 'Primary' ? '15 sections' : '8 sections'}</td>
                      <td style={{ padding: '12px', color: 'var(--primary)' }}>96.2%</td>
                      <td style={{ padding: '12px' }}><span className="ad-label" style={{ color: 'var(--ad-green-ink)' }}>Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* STAFF MODULE */}
      {activeModule === 'staff' && (
        <section id="staff" aria-labelledby="staff-heading" className="ad-module-view">
          <ModuleHeader
            category="People"
            title="Staff Management & Faculty Directory"
            subtitle={`${mockSchool.teachers} teaching team members · All roles active`}
            icon={Users}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Teaching staff" value={String(mockSchool.teachers)} subtitle="Full-time faculty" accent="violet" />
            <MiniStat title="Administrative" value="12" subtitle="Accounts, office, IT" accent="indigo" />
            <MiniStat title="Teacher : Student" value="1 : 18" subtitle="Recommended ratio met" accent="emerald" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Faculty departments</h2>
                <p>Teaching assignments and department heads for {mockSchool.academicYear}</p>
              </div>
              <span className="ad-label">Verified staff</span>
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    <th style={{ padding: '10px 12px' }}>Department</th>
                    <th style={{ padding: '10px 12px' }}>Faculty count</th>
                    <th style={{ padding: '10px 12px' }}>Lead educator</th>
                    <th style={{ padding: '10px 12px' }}>Weekly periods</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { dept: 'Mathematics', count: 14, lead: 'Dr. Anita Roy', periods: 168 },
                    { dept: 'Sciences (Phy, Chem, Bio)', count: 18, lead: 'Prof. S. Nambiar', periods: 216 },
                    { dept: 'Languages & English', count: 16, lead: 'Ms. Rachel Thomas', periods: 192 },
                    { dept: 'Social Studies & Humanities', count: 12, lead: 'Mr. Arvind Joshi', periods: 144 },
                    { dept: 'Arts, Sports & Physical Ed', count: 8, lead: 'Coach M. Rawat', periods: 96 },
                  ].map(row => (
                    <tr key={row.dept} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{row.dept}</td>
                      <td style={{ padding: '12px' }}>{row.count} educators</td>
                      <td style={{ padding: '12px' }}>{row.lead}</td>
                      <td style={{ padding: '12px' }}>{row.periods} periods</td>
                      <td style={{ padding: '12px' }}><span className="ad-label" style={{ color: 'var(--ad-green-ink)' }}>Assigned</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ADMISSIONS MODULE */}
      {activeModule === 'admissions' && (
        <section id="admissions" aria-labelledby="admissions-heading" className="ad-module-view">
          <ModuleHeader
            category="People"
            title="Student Admissions & Enrollment"
            subtitle="Academic Year 2026–27 intake tracking and registration pipeline"
            icon={ClipboardList}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Inquiries received" value="284" subtitle="Current admissions cycle" accent="sky" />
            <MiniStat title="Applications submitted" value="168" subtitle="Documents verified" accent="indigo" />
            <MiniStat title="Admissions finalized" value="124" subtitle="Seats confirmed" accent="emerald" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Recent admission records</h2>
                <p>Sequential registration and class placement audit</p>
              </div>
              <span className="ad-label">Sequential ID active</span>
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    <th style={{ padding: '10px 12px' }}>Admission No.</th>
                    <th style={{ padding: '10px 12px' }}>Student name</th>
                    <th style={{ padding: '10px 12px' }}>Class / Section</th>
                    <th style={{ padding: '10px 12px' }}>Guardian</th>
                    <th style={{ padding: '10px 12px' }}>Date enrolled</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'BC-2026-1248', name: 'Kabir Sengupta', classSection: 'Class VI · A', guardian: 'Pooja Sengupta', date: '04 Nov 2026' },
                    { id: 'BC-2026-1247', name: 'Zoya Qureshi', classSection: 'Class I · B', guardian: 'Farhan Qureshi', date: '03 Nov 2026' },
                    { id: 'BC-2026-1246', name: 'Devika Nair', classSection: 'Class IX · C', guardian: 'Suresh Nair', date: '02 Nov 2026' },
                    { id: 'BC-2026-1245', name: 'Ishaan Verma', classSection: 'Class XI · Science', guardian: 'Rohan Verma', date: '31 Oct 2026' },
                  ].map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{row.name}</td>
                      <td style={{ padding: '12px' }}>{row.classSection}</td>
                      <td style={{ padding: '12px' }}>{row.guardian}</td>
                      <td style={{ padding: '12px' }}>{row.date}</td>
                      <td style={{ padding: '12px' }}><span className="ad-label" style={{ color: 'var(--ad-green-ink)' }}>Enrolled</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* CLASSES MODULE */}
      {activeModule === 'classes' && (
        <section id="classes" aria-labelledby="classes-heading" className="ad-module-view">
          <ModuleHeader
            category="Academics"
            title="Classes & Academic Management"
            subtitle="Academic structure, grade standards, and classroom sections"
            icon={BookOpen}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Classrooms" value="12" subtitle="Grade levels I to XII" accent="indigo" />
            <MiniStat title="Active sections" value="34" subtitle="Section cap 40 students" accent="sky" />
            <MiniStat title="Academic year" value="2026–27" subtitle="Term II in progress" accent="emerald" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Active classes and section allocations</h2>
                <p>Multi-section grade distribution for {mockSchool.academicYear}</p>
              </div>
              <span className="ad-label">Term II</span>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {[
                { grade: 'Primary (I–V)', sections: '15 sections', capacity: '520 max', enrolled: '480 students', classTeacher: 'Ms. D. Sharma' },
                { grade: 'Middle School (VI–VIII)', sections: '9 sections', capacity: '360 max', enrolled: '336 students', classTeacher: 'Mr. P. Khurana' },
                { grade: 'High School (IX–X)', sections: '6 sections', capacity: '280 max', enrolled: '264 students', classTeacher: 'Dr. M. Swaminathan' },
                { grade: 'Higher Secondary (XI–XII)', sections: '4 sections', capacity: '180 max', enrolled: '168 students', classTeacher: 'Prof. R. Mathur' },
              ].map(item => (
                <article key={item.grade} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--card)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{item.grade}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>{item.sections} · {item.capacity}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>Enrolled: <strong>{item.enrolled}</strong></span>
                    <span style={{ color: 'var(--primary)' }}>Coordinator: {item.classTeacher}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ATTENDANCE MODULE */}
      {activeModule === 'attendance' && (
        <section id="attendance" aria-labelledby="attendance-heading" className="ad-module-view">
          <ModuleHeader
            category="Academics"
            title="School Attendance Analytics"
            subtitle={`Daily school-wide tracking · ${attendancePercent.toFixed(1)}% presence rate`}
            icon={CalendarDays}
          />
          <div className="ad-analytics-grid">
            <AttendanceAnalytics />
            <div className="ad-panel">
              <header className="ad-section-header">
                <div>
                  <h2>5-Day Attendance Register</h2>
                  <p>School-wide presence history</p>
                </div>
                <span className="ad-label">Past 5 days</span>
              </header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attendance.map(day => (
                  <div key={day.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <strong style={{ fontSize: '12px' }}>{day.label} · {day.date}</strong>
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted-foreground)' }}>{formatNumber(day.present)} present · {day.absent} absent</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: day.present / totalStudents > 0.95 ? 'var(--ad-green-ink)' : 'var(--primary)' }}>
                      {((day.present / totalStudents) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TIMETABLE MODULE */}
      {activeModule === 'timetable' && (
        <section id="timetable" aria-labelledby="timetable-heading" className="ad-module-view">
          <ModuleHeader
            category="Academics"
            title="Timetable & Master Schedule"
            subtitle="Weekly period allocations, room assignments, and educator schedules"
            icon={CalendarCheck}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Daily periods" value="8" subtitle="40-min instructional slots" accent="indigo" />
            <MiniStat title="Rooms allocated" value="38" subtitle="Classrooms & science labs" accent="sky" />
            <MiniStat title="Zero conflicts" value="100%" subtitle="Schedule verified" accent="emerald" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Daily timetable period structure</h2>
                <p>Standard bell schedule for {mockSchool.academicYear}</p>
              </div>
              <span className="ad-label">Bell Schedule</span>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { period: 'Period 1', time: '08:30 – 09:10', type: 'Core instruction' },
                { period: 'Period 2', time: '09:10 – 09:50', type: 'Core instruction' },
                { period: 'Period 3', time: '09:50 – 10:30', type: 'Core instruction' },
                { period: 'Morning Break', time: '10:30 – 10:50', type: 'Recess' },
                { period: 'Period 4', time: '10:50 – 11:30', type: 'Laboratory & Practical' },
                { period: 'Period 5', time: '11:30 – 12:10', type: 'Languages & Arts' },
                { period: 'Lunch Break', time: '12:10 – 12:50', type: 'Midday meal' },
                { period: 'Period 6', time: '12:50 – 01:30', type: 'Elective studies' },
                { period: 'Period 7', time: '01:30 – 02:10', type: 'Social studies' },
                { period: 'Period 8', time: '02:10 – 02:50', type: 'Sports & Activities' },
              ].map(slot => (
                <div key={slot.period} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '10px', background: slot.type === 'Recess' || slot.type === 'Midday meal' ? 'var(--indigo-soft)' : 'var(--card)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)' }}>{slot.period}</span>
                  <strong style={{ display: 'block', fontSize: '13px', margin: '4px 0' }}>{slot.time}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{slot.type}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOMEWORK MODULE */}
      {activeModule === 'homework' && (
        <section id="homework" aria-labelledby="homework-heading" className="ad-module-view">
          <ModuleHeader
            category="Academics"
            title="Homework & Curriculum Assignments"
            subtitle="School-wide assignment monitoring and submission compliance"
            icon={NotebookPen}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Active assignments" value="48" subtitle="Across Classes I–XII" accent="violet" />
            <MiniStat title="Due this week" value="18" subtitle="Review deadlines" accent="amber" />
            <MiniStat title="Average submission" value="94.8%" subtitle="Timely turn-in rate" accent="emerald" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Grade-wise homework distribution</h2>
                <p>Instructional workload balance across school levels</p>
              </div>
              <span className="ad-label">Active Term II</span>
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    <th style={{ padding: '10px 12px' }}>Level</th>
                    <th style={{ padding: '10px 12px' }}>Open tasks</th>
                    <th style={{ padding: '10px 12px' }}>Key subjects</th>
                    <th style={{ padding: '10px 12px' }}>Estimated daily duration</th>
                    <th style={{ padding: '10px 12px' }}>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: 'Primary (I–V)', tasks: 12, subjects: 'Reading, Math, EVS', duration: '20–30 mins', comp: '96.5%' },
                    { level: 'Middle (VI–VIII)', tasks: 16, subjects: 'Algebra, Science, Hindi', duration: '45 mins', comp: '94.2%' },
                    { level: 'High School (IX–X)', tasks: 14, subjects: 'Physics, Geometry, Social', duration: '60 mins', comp: '95.1%' },
                    { level: 'Higher Sec (XI–XII)', tasks: 6, subjects: 'Calculus, Organic Chem', duration: '75 mins', comp: '93.4%' },
                  ].map(row => (
                    <tr key={row.level} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{row.level}</td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{row.tasks} tasks</td>
                      <td style={{ padding: '12px' }}>{row.subjects}</td>
                      <td style={{ padding: '12px' }}>{row.duration}</td>
                      <td style={{ padding: '12px', color: 'var(--ad-green-ink)', fontWeight: 600 }}>{row.comp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* EXAMS MODULE */}
      {activeModule === 'exams' && (
        <section id="exams" aria-labelledby="exams-heading" className="ad-module-view">
          <ModuleHeader
            category="Academics"
            title="Examinations & Academic Results"
            subtitle="Term assessments, evaluation schedules, and published marks audit"
            icon={FileText}
          />
          <div className="ad-stats-grid">
            <MiniStat title="Upcoming sessions" value={String(examSchedule.length)} subtitle="November assessments" accent="rose" />
            <MiniStat title="Passing percentage" value="98.2%" subtitle="Term I published results" accent="emerald" />
            <MiniStat title="Results published" value="100%" subtitle="Term I finalized" accent="indigo" />
          </div>
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Assessment schedule · November 2026</h2>
                <p>Four examination windows scheduled for this term</p>
              </div>
              <span className="ad-label">Term II Calendar</span>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {examSchedule.map(exam => (
                <div key={exam.title} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>{exam.date}</span>
                  <h3 style={{ fontSize: '13px', margin: '6px 0', fontWeight: 700 }}>{exam.title}</h3>
                  <span className="ad-label" style={{ color: 'var(--ad-violet-ink)' }}>Scheduled</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEES MODULE */}
      {activeModule === 'fees' && (
        <section id="fees" aria-labelledby="fees-heading" className="ad-module-view">
          <ModuleHeader
            category="Finance"
            title="Fee Structures & Collection Overview"
            subtitle={`${formatINR(fees.collected)} collected YTD · ${((fees.collected / (fees.collected + fees.pending)) * 100).toFixed(1)}% recovery rate`}
            icon={Wallet}
          />
          <FeeCollectionOverview />
          <div className="ad-panel" style={{ marginTop: '20px' }}>
            <header className="ad-section-header">
              <div>
                <h2>Class-wise fee structure summary</h2>
                <p>Standard tuition and laboratory dues for {mockSchool.academicYear}</p>
              </div>
              <span className="ad-label">Fixed Annual Slabs</span>
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    <th style={{ padding: '10px 12px' }}>Grade group</th>
                    <th style={{ padding: '10px 12px' }}>Term tuition</th>
                    <th style={{ padding: '10px 12px' }}>Lab & activity fee</th>
                    <th style={{ padding: '10px 12px' }}>Annual assessed</th>
                    <th style={{ padding: '10px 12px' }}>Collected %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { group: 'Classes I–V (Primary)', tuition: '₹12,000', lab: '₹2,000', assessed: '₹14,000', rate: '92.4%' },
                    { group: 'Classes VI–VIII (Middle)', tuition: '₹16,000', lab: '₹3,000', assessed: '₹19,000', rate: '89.6%' },
                    { group: 'Classes IX–X (Secondary)', tuition: '₹22,000', lab: '₹4,500', assessed: '₹26,500', rate: '88.1%' },
                    { group: 'Classes XI–XII (Sr Sec)', tuition: '₹28,000', lab: '₹6,000', assessed: '₹34,000', rate: '86.5%' },
                  ].map(row => (
                    <tr key={row.group} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{row.group}</td>
                      <td style={{ padding: '12px' }}>{row.tuition} / term</td>
                      <td style={{ padding: '12px' }}>{row.lab}</td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{row.assessed}</td>
                      <td style={{ padding: '12px', color: 'var(--ad-green-ink)', fontWeight: 600 }}>{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ANNOUNCEMENTS MODULE */}
      {activeModule === 'announcements' && (
        <section id="announcements" aria-labelledby="announcements-heading" className="ad-module-view">
          <ModuleHeader
            category="Operations"
            title="School Announcements & Circulars"
            subtitle="Campus noticeboard, urgent updates, and community broadcasts"
            icon={Megaphone}
          />
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Active circulars & notices</h2>
                <p>Broadcasts visible to students, faculty, and parents</p>
              </div>
              <span className="ad-label">School Noticeboard</span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { title: 'Parent–Teacher Connect Scheduled', date: '04 Nov 2026', scope: 'All Parents', content: 'PTM sessions will be conducted on Friday, 13 Nov. Slot confirmations are sent via child portals.' },
                { title: 'Annual Sports Day Registration Open', date: '01 Nov 2026', scope: 'Classes VI–XII', content: 'Track and field event trials commence next Monday. Contact the physical education department.' },
                { title: 'Winter School Uniform Advisory', date: '28 Oct 2026', scope: 'All Campus', content: 'Winter blazer and knitwear guidelines apply starting 15 November. Refer to the handbook.' },
              ].map(item => (
                <article key={item.title} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--background)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>{item.scope} · {item.date}</span>
                    <span className="ad-label">Broadcast</span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{item.title}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{item.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REPORTS MODULE */}
      {activeModule === 'reports' && (
        <section id="reports" aria-labelledby="reports-heading" className="ad-module-view">
          <ModuleHeader
            category="Analytics"
            title="Reports & Executive Analytics"
            subtitle="Consolidated academic, attendance, financial, and operational reports"
            icon={BarChart3}
          />
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Report generation catalogue</h2>
                <p>Standardized export definitions for school administration</p>
              </div>
              <span className="ad-label">Audit-ready</span>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {[
                { title: 'Academic Progress Report', desc: 'Grade-wise examination performance and subject mastery distributions', badge: 'Academics' },
                { title: 'Attendance Register Summary', desc: 'Monthly aggregate presence, excused leaves, and chronic absenteeism alerts', badge: 'Attendance' },
                { title: 'Fee Collection Reconciliation', desc: 'Settled receipts, outstanding dues, and aged balance analysis', badge: 'Finance' },
                { title: 'Faculty Workload & Period Audit', desc: 'Weekly instructional periods per teacher and timetable distribution', badge: 'Staff' },
              ].map(rep => (
                <div key={rep.title} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card)' }}>
                  <span className="ad-label" style={{ marginBottom: '8px' }}>{rep.badge}</span>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 6px' }}>{rep.title}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{rep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SETTINGS MODULE */}
      {activeModule === 'settings' && (
        <section id="settings" aria-labelledby="settings-heading" className="ad-module-view">
          <ModuleHeader
            category="Operations"
            title="School Settings & Configuration"
            subtitle="Institution profile, term dates, and administrative policy parameters"
            icon={Settings}
          />
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Institutional profile</h2>
                <p>Configured parameters for {mockSchool.name}</p>
              </div>
              <span className="ad-label">Verified School Profile</span>
            </header>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '12px' }}>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>School Name</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>{mockSchool.name}</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Academic Session</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>{mockSchool.academicYear}</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>School Timezone</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>Asia/Kolkata (IST)</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Affiliation Board</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>CBSE Affiliated</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Subscription Plan</dt><dd style={{ fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>Brightcamp Consolidated (₹1/student/day)</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Admin Two-Factor MFA</dt><dd style={{ fontWeight: 700, marginTop: '4px', color: 'var(--ad-green-ink)' }}>AAL2 / TOTP Enforced</dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* AUDIT MODULE */}
      {activeModule === 'audit' && (
        <section id="audit" aria-labelledby="audit-heading" className="ad-module-view">
          <ModuleHeader
            category="Operations"
            title="Administrative Security Audit Log"
            subtitle="Immutable event trail of administrative actions and authentication milestones"
            icon={ShieldCheck}
          />
          <div className="ad-panel">
            <header className="ad-section-header">
              <div>
                <h2>Recent administrative events</h2>
                <p>Logged events for security and compliance audits</p>
              </div>
              <span className="ad-label">Tamper-evident</span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActivities.map(act => (
                <div key={act.title + act.time} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <strong style={{ fontSize: '12px' }}>{act.title}</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted-foreground)' }}>{act.description}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <p className="ad-endnote">
        Thoughtfully connected. Beautifully simple. <span>All figures, schedules, and activities are fictional.</span>
      </p>
    </div>
  );
}

function ModuleHeader({ category, title, subtitle, icon: Icon }: { category: string; title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="ad-page-title" style={{ marginBottom: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button
            onClick={() => navigateToModule('overview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 0, background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0 }}
            aria-label="Back to overview"
          >
            <ArrowLeft size={14} /> Overview
          </button>
          <span style={{ color: 'var(--muted-foreground)' }}>/</span>
          <span className="eyebrow" style={{ margin: 0 }}>{category}</span>
        </div>
        <h1 id={`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-heading`} tabIndex={-1} style={{ fontSize: '24px', letterSpacing: '-0.7px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div className="ad-icon" style={{ width: '44px', height: '44px' }}>
        <Icon size={22} />
      </div>
    </div>
  );
}

function MiniStat({ title, value, subtitle, accent }: { title: string; value: string; subtitle: string; accent: string }) {
  return (
    <div className="ad-stat" style={{ padding: '16px' }}>
      <span className="ad-stat-dot" style={{ background: `var(--ad-${accent}-ink)` }} />
      <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600 }}>{title}</span>
      <strong style={{ display: 'block', fontSize: '24px', fontWeight: 800, margin: '4px 0', color: `var(--ad-${accent}-ink)` }}>{value}</strong>
      <p style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{subtitle}</p>
    </div>
  );
}
