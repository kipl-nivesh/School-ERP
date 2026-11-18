'use client';

import { Users, CalendarCheck, ClipboardList, GraduationCap, Wallet, Megaphone, ArrowUpRight } from 'lucide-react';
import { ParentSection } from './section';
import { ParentReveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';

export function ParentQuickAccess() {
  const links = [
    { title: 'My children', target: 'children', icon: Users, tone: 'indigo' },
    { title: 'Attendance', target: 'attendance', icon: CalendarCheck, tone: 'emerald' },
    { title: 'Learning progress', target: 'progress', icon: GraduationCap, tone: 'violet' },
    { title: 'Homework', target: 'homework', icon: ClipboardList, tone: 'amber' },
    { title: 'Fee details', target: 'fees', icon: Wallet, tone: 'rose' },
    { title: 'School notices', target: 'notices', icon: Megaphone, tone: 'sky' },
  ];

  return (
    <ParentSection id="parent-quick-access" title="A familiar place for everything" description="Jump to what matters to your family.">
      <div className="pd-quick-links">
        {links.map(({ title, target, icon: Icon, tone }) => (
          <ParentReveal key={target} hover>
            <a
              className={'pd-tone-' + tone}
              href={'#' + target}
              onClick={(e) => {
                e.preventDefault();
                navigateToModule(target);
              }}
            >
              <Icon size={21} />
              <span>{title}</span>
              <ArrowUpRight size={15} />
            </a>
          </ParentReveal>
        ))}
      </div>
    </ParentSection>
  );
}
