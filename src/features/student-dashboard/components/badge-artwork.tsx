import type { BadgeId } from '../types';
// Original vector badge compositions; the labels next to them convey their meaning.
export function BadgeArtwork({id}:{id:BadgeId}) {
  const symbols={
    attendance:<><rect x="24" y="23" width="32" height="29" rx="5"/><path d="M24 32h32M33 20v8m14-8v8m-9 9 3 5 5 1-4 4 1 5-5-3-4 3 1-5-4-4 5-1 2-5Z"/></>,
    homework:<><rect x="27" y="21" width="28" height="34" rx="4"/><path d="M32 21v34M24 28h6m-6 7h6m-6 7h6m7 0 4 4 8-10"/></>,
    science:<><path d="M34 21h12m-10 0v14L25 51c-2 3 0 5 3 5h24c3 0 5-2 3-5L44 35V21M30 43h20"/><circle cx="37" cy="48" r="1"/><circle cx="43" cy="52" r="1"/><path d="m51 23 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/></>,
    reading:<><path d="M40 28c-6-5-12-6-20-4v29c8-2 14-1 20 4 6-5 12-6 20-4V24c-8-2-14-1-20 4Zm0 0v29M26 33l8 2m-8 5 8 2m12-7 8-2m-8 9 8-2"/></>,
    mathematics:<><rect x="25" y="20" width="30" height="38" rx="5"/><path d="M31 27h18v8H31zM32 43h6m-3-3v6m8-3h6m-17 8h6m5 0h6"/></>,
  };
  return <svg className="sd-badge-art" viewBox="0 0 80 84" aria-hidden="true" focusable="false"><path className="sd-badge-ribbon" d="m22 52-4 30 14-8 9 6 2-25m14-3 5 30-14-8-9 6-2-25"/><path className="sd-badge-seal" d="m40 5 8 6 10-1 4 10 9 5-2 11 6 8-7 9-1 10-11 3-7 9-9-4-10 4-6-9-11-3-1-10-7-9 6-9-2-10 9-5 4-10 10 1 8-6Z"/><circle cx="40" cy="39" r="25" className="sd-badge-center"/><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{symbols[id]}</g></svg>;
}
