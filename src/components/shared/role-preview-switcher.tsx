'use client';
import { useRouter } from 'next/navigation';
import { roles, roleDetails, type Role } from '@/config/roles';
export function RolePreviewSwitcher({ role }: {
    role: Role;
}) { const router = useRouter(); if (process.env.NODE_ENV !== 'development')
    return null; return <label className="role-switcher"><span>Development preview · switch role</span><select value={role} onChange={e => router.push('/' + e.target.value + '/dashboard')}>{roles.map(r => <option key={r} value={r}>{roleDetails[r].title}</option>)}</select></label>; }
