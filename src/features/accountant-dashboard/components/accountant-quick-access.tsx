'use client';

import { Wallet, Receipt, Clock3, BriefcaseBusiness, FileBarChart, Bell, ArrowUpRight } from 'lucide-react';
import { FinanceSection } from './section';
import { FinanceReveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';

const targetModuleMap: Record<string, string> = {
  collections: 'collections',
  payments: 'collections',
  outstanding: 'ledger',
  expenses: 'invoices',
  reports: 'reports',
  alerts: 'overview',
};

export function AccountantQuickAccess() {
  const links = [
    { title: 'Fee collections', target: 'collections', icon: Wallet, tone: 'emerald' },
    { title: 'Payment history', target: 'payments', icon: Receipt, tone: 'indigo' },
    { title: 'Student fee ledger', target: 'outstanding', icon: Clock3, tone: 'amber' },
    { title: 'Invoices & cash flow', target: 'expenses', icon: BriefcaseBusiness, tone: 'violet' },
    { title: 'Financial reports', target: 'reports', icon: FileBarChart, tone: 'sky' },
    { title: 'Alerts', target: 'alerts', icon: Bell, tone: 'rose' },
  ];

  return (
    <FinanceSection id="accountant-quick-access" title="Find the detail you need" description="Quick access · Select a financial module to open its view.">
      <div className="ac-quick-links">
        {links.map(({ title, target, icon: Icon, tone }) => {
          const mod = targetModuleMap[target] || 'overview';
          return (
            <FinanceReveal key={target} hover>
              <a
                className={'ac-tone-' + tone}
                href={'#' + mod}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToModule(mod);
                }}
              >
                <Icon size={21} />
                <span>{title}</span>
                <ArrowUpRight size={15} />
              </a>
            </FinanceReveal>
          );
        })}
      </div>
    </FinanceSection>
  );
}
