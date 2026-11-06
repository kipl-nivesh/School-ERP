'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';

// =============================================================================
// Status Badges
// =============================================================================

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-500';

  if (['active', 'paid', 'present', 'published', 'settled'].includes(normalized)) {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dot = 'bg-emerald-500';
  } else if (['partial', 'late', 'on_leave', 'important'].includes(normalized)) {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
    dot = 'bg-amber-500';
  } else if (['absent', 'overdue', 'suspended', 'terminated', 'urgent', 'withdrawn'].includes(normalized)) {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    dot = 'bg-rose-500';
  } else if (['pending', 'draft', 'unpaid', 'closed'].includes(normalized)) {
    bg = 'bg-sky-50 text-sky-700 border-sky-200';
    dot = 'bg-sky-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
    </span>
  );
}

// =============================================================================
// Search & Filter Toolbar
// =============================================================================

export function SearchFilterBar({
  searchPlaceholder = 'Search...',
  onSearch,
  filterOptions,
  selectedFilter,
  onFilterChange,
  actionButton,
}: {
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  filterOptions?: { label: string; value: string }[];
  selectedFilter?: string;
  onFilterChange?: (v: string) => void;
  actionButton?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                onSearch?.('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filterOptions && filterOptions.length > 0 && (
          <div className="relative">
            <select
              value={selectedFilter || 'all'}
              onChange={e => onFilterChange?.(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              {filterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        )}
      </div>

      {actionButton && <div className="flex items-center gap-2">{actionButton}</div>}
    </div>
  );
}

// =============================================================================
// Pagination Controls
// =============================================================================

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  totalItems,
}: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  totalItems?: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100 text-xs text-slate-500">
      <div>
        {totalItems !== undefined && <span>Showing page {page} of {totalPages} ({totalItems} records)</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 py-1 font-medium">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Empty & Loading States
// =============================================================================

export function EmptySectionState({
  title = 'No records found',
  description = 'Try adjusting your search criteria or add a new entry.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-4">
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Clock className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}

// =============================================================================
// Simple Modal Dialog
// =============================================================================

export function ModalDialog({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Stat Card
// =============================================================================

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone = 'indigo',
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  }[tone];

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <span className={`p-2 rounded-lg border ${colors}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}
