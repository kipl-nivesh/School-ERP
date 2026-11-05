import { connection } from 'next/server';
import { AdminDashboard } from '@/features/admin-dashboard';
export const metadata = { title: 'Admin overview' };
export default async function Page() {
  await connection();
  const currentDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  return <AdminDashboard currentDate={currentDate}/>;
}
