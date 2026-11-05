import { GraduationCap } from 'lucide-react';
export function Brand({ compact = false }: {
    compact?: boolean;
}) { return <div className="brand"><span className="brand-mark"><GraduationCap size={25}/></span>{!compact && <span>brightcamp<span className="brand-sub">SCHOOL WORKSPACE</span></span>}</div>; }
