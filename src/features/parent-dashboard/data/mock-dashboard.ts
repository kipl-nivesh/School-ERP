import type { Attendance, Child, ChildId, Notice } from '../types';

export const parentProfile = { name: 'Priya Kumar', academicYear: '2026–27', referenceDate: '2026-11-04', referenceTime: '10:20', timeZone: 'Asia/Kolkata' } as const;
export const months = [{id:'2026-07',label:'Jul'},{id:'2026-08',label:'Aug'},{id:'2026-09',label:'Sep'},{id:'2026-10',label:'Oct'},{id:'2026-11',label:'Nov'}];
// Fictional instructional calendar, not a real holiday calendar. Two sample school Saturdays.
function attendance(childId: ChildId, absent: string[], leave: string[]): Attendance[] {
  const records: Attendance[] = [];
  for (let cursor=Date.UTC(2026,6,1);cursor<=Date.parse(parentProfile.referenceDate+'T00:00:00Z');cursor+=86400000) {
    const day=new Date(cursor), date=day.toISOString().slice(0,10);
    if ([0,6].includes(day.getUTCDay())&&!['2026-10-10','2026-10-24'].includes(date)) continue;
    records.push({childId,date,status:absent.includes(date)?'Absent':leave.includes(date)?'Leave':'Present'});
  }
  return records;
}
export const schoolNotices: Notice[] = [
  {id:'sports',title:'A day for school spirit',date:'2026-11-20',category:'Community',description:'Sports Day brings our school together for teamwork, movement, and encouragement.'},
  {id:'library',title:'Find a story to share',date:'2026-11-09',category:'Community',description:'Library Week invites families to discover a favourite book together.'},
];
export const children: Child[] = [
  {
    id:'aarav',name:'Aarav Kumar',firstName:'Aarav',initials:'AK',className:'VIII A',rollNumber:'12',teacher:'Ms Aanya Rao',tone:'indigo',
    attendance:attendance('aarav',['2026-07-16','2026-08-12','2026-09-08','2026-09-23','2026-10-08'],[]),
    marks:[
      {childId:'aarav',id:'a-math',subject:'Mathematics',obtained:82,maximum:100,date:'2026-10-23'},
      {childId:'aarav',id:'a-english',subject:'English',obtained:78,maximum:100,date:'2026-10-26'},
      {childId:'aarav',id:'a-science',subject:'Science',obtained:87,maximum:100,date:'2026-10-27'},
      {childId:'aarav',id:'a-social',subject:'Social Science',obtained:74,maximum:100,date:'2026-10-28'},
      {childId:'aarav',id:'a-computing',subject:'Computer Science',obtained:92,maximum:100,date:'2026-10-30'},
    ],
    homework:[
      {childId:'aarav',id:'a-algebra',title:'Algebra practice',subject:'Mathematics',teacher:'Ms Aanya Rao',dueDate:'2026-11-03'},
      {childId:'aarav',id:'a-worksheet',title:'Science worksheet',subject:'Science',teacher:'Mr Rohan Shah',dueDate:'2026-11-05'},
      {childId:'aarav',id:'a-map',title:'Map discovery journal',subject:'Social Science',teacher:'Mr Dev Verma',dueDate:'2026-11-09'},
      {childId:'aarav',id:'a-reading',title:'A chapter, a new perspective',subject:'English',teacher:'Ms Meera Sen',dueDate:'2026-11-04',completedDate:'2026-11-03'},
      {childId:'aarav',id:'a-logic',title:'Little logic challenges',subject:'Computer Science',teacher:'Mr Karan Das',dueDate:'2026-11-03',completedDate:'2026-11-02'},
      {childId:'aarav',id:'a-geometry',title:'Geometry sketchbook',subject:'Mathematics',teacher:'Ms Aanya Rao',dueDate:'2026-11-06',completedDate:'2026-11-03'},
    ],
    installments:[
      {childId:'aarav',id:'a-term1',title:'Term I tuition',amount:30000,dueDate:'2026-07-10'},
      {childId:'aarav',id:'a-term2',title:'Term II tuition',amount:30000,dueDate:'2026-11-15'},
      {childId:'aarav',id:'a-transport',title:'Transport · term II',amount:6000,dueDate:'2026-11-20'},
      {childId:'aarav',id:'a-resources',title:'Learning resources',amount:2000,dueDate:'2026-10-31'},
    ],
    payments:[
      {childId:'aarav',id:'DEMO-A01',installmentId:'a-term1',amount:30000,date:'2026-07-08',method:'Sample bank transfer'},
      {childId:'aarav',id:'DEMO-A02',installmentId:'a-term2',amount:20000,date:'2026-11-02',method:'Sample bank transfer'},
    ],
    timetable:[
      {childId:'aarav',period:1,subject:'Mathematics',teacher:'Ms Aanya Rao',start:'08:30',end:'09:15',room:'204'},
      {childId:'aarav',period:2,subject:'English',teacher:'Ms Meera Sen',start:'09:20',end:'10:05',room:'204'},
      {childId:'aarav',period:3,subject:'Science',teacher:'Mr Rohan Shah',start:'10:15',end:'11:00',room:'Science lab'},
      {childId:'aarav',period:4,subject:'Mathematics',teacher:'Ms Aanya Rao',start:'11:15',end:'12:00',room:'204'},
      {childId:'aarav',period:5,subject:'Social Science',teacher:'Mr Dev Verma',start:'12:05',end:'12:50',room:'204'},
      {childId:'aarav',period:6,subject:'Computer Science',teacher:'Mr Karan Das',start:'13:00',end:'13:45',room:'Computer lab'},
    ],
    exams:[
      {childId:'aarav',id:'a-test-math',title:'Unit Test II',subject:'Mathematics',date:'2026-11-10',start:'09:00',end:'10:00'},
      {childId:'aarav',id:'a-test-science',title:'Unit Test II',subject:'Science',date:'2026-11-11',start:'09:00',end:'10:00'},
      {childId:'aarav',id:'a-test-english',title:'Unit Test II',subject:'English',date:'2026-11-13',start:'09:00',end:'10:00'},
    ],
    notices:[
      {childId:'aarav',id:'a-ptm',title:'Class VIII A family meeting',date:'2026-11-07',category:'Academics',description:'Meet Ms Aanya Rao to talk through Aarav’s learning goals. Sample slot: 10:00 AM IST.'},
      {childId:'aarav',id:'a-revision',title:'A little revision, each day',date:'2026-11-06',category:'Academics',description:'Class VIII A Unit Test II starts 10 November. The exam schedule below has the sample dates.'},
      {childId:'aarav',id:'a-fee',title:'A note on learning resources',date:'2026-11-04',category:'Reminder',description:'The sample ₹2,000 resources installment was due 31 October. The fee overview shows the full breakdown.'},
    ],
    reading:[1,2,3,4].map(n=>({childId:'aarav' as const,id:'a-chapter-'+n,title:'The curious traveller · chapter '+n,date:'2026-11-03'})),readingTarget:6,
  },
  {
    id:'ananya',name:'Ananya Kumar',firstName:'Ananya',initials:'AN',className:'V B',rollNumber:'08',teacher:'Ms Nisha Patel',tone:'rose',
    attendance:attendance('ananya',['2026-07-20','2026-09-14'],['2026-08-18','2026-10-12']),
    marks:[
      {childId:'ananya',id:'n-math',subject:'Mathematics',obtained:44,maximum:50,date:'2026-10-22'},
      {childId:'ananya',id:'n-english',subject:'English',obtained:47,maximum:50,date:'2026-10-23'},
      {childId:'ananya',id:'n-evs',subject:'Environmental Studies',obtained:46,maximum:50,date:'2026-10-26'},
      {childId:'ananya',id:'n-hindi',subject:'Hindi',obtained:43,maximum:50,date:'2026-10-27'},
    ],
    homework:[
      {childId:'ananya',id:'n-fractions',title:'Fractions in the kitchen',subject:'Mathematics',teacher:'Ms Nisha Patel',dueDate:'2026-11-05'},
      {childId:'ananya',id:'n-nature',title:'My neighbourhood nature journal',subject:'Environmental Studies',teacher:'Mr Arjun Iyer',dueDate:'2026-11-08'},
    ],
    installments:[
      {childId:'ananya',id:'n-term1',title:'Term I tuition',amount:24000,dueDate:'2026-07-10'},
      {childId:'ananya',id:'n-term2',title:'Term II tuition',amount:24000,dueDate:'2026-11-18'},
    ],
    payments:[{childId:'ananya',id:'DEMO-N01',installmentId:'n-term1',amount:24000,date:'2026-07-07',method:'Sample bank transfer'}],
    timetable:[
      {childId:'ananya',period:1,subject:'English',teacher:'Ms Tara Bose',start:'08:40',end:'09:20',room:'105'},
      {childId:'ananya',period:2,subject:'Mathematics',teacher:'Ms Nisha Patel',start:'09:25',end:'10:05',room:'105'},
      {childId:'ananya',period:3,subject:'Environmental Studies',teacher:'Mr Arjun Iyer',start:'10:15',end:'10:55',room:'Nature room'},
      {childId:'ananya',period:4,subject:'Hindi',teacher:'Ms Kavya Jain',start:'11:10',end:'11:50',room:'105'},
      {childId:'ananya',period:5,subject:'Art & craft',teacher:'Ms Leena Roy',start:'12:00',end:'12:40',room:'Art studio'},
    ],
    exams:[
      {childId:'ananya',id:'n-test-evs',title:'Discovery Check',subject:'Environmental Studies',date:'2026-11-12',start:'09:30',end:'10:15'},
      {childId:'ananya',id:'n-test-hindi',title:'Language Check',subject:'Hindi',date:'2026-11-16',start:'09:30',end:'10:15'},
    ],
    notices:[{childId:'ananya',id:'n-walk',title:'Class V B nature walk',date:'2026-11-06',category:'Academics',description:'Ananya’s class will explore the school garden with Mr Arjun Iyer. Bring a notebook and water bottle.'}],
    reading:[1,2,3,4,5].map(n=>({childId:'ananya' as const,id:'n-chapter-'+n,title:'Garden stories · chapter '+n,date:'2026-11-02'})),readingTarget:5,
  },
];
