import { UserPlus, CalendarCheck, Wallet, ClipboardList, UserRoundPen } from 'lucide-react';
import { recentActivities } from '../data/mock-dashboard';
import { Reveal } from './motion';
import { DashboardSection } from './section';
const icons={admission:UserPlus,attendance:CalendarCheck,payment:Wallet,exam:ClipboardList,teacher:UserRoundPen};
export function RecentActivities(){return <DashboardSection title="The little things, all in view" subtitle="Sample activity · 4 November 2026, IST" badge="Demo timeline"><ol className="ad-activity-list">{recentActivities.map((item,index)=>{const Icon=icons[item.kind];return <li key={item.kind}><Reveal index={index} className={'ad-activity ad-tone-'+item.accent}><span className="ad-activity-icon"><Icon size={17}/></span><div><h3>{item.title}</h3><p>{item.description}</p></div><time dateTime={item.timestamp}>{item.time}</time></Reveal></li>;})}</ol></DashboardSection>;}
