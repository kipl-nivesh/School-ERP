import { RecoveryForm } from './recovery-form';
export const dynamic = 'force-dynamic';
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const query = await searchParams;
  const code = typeof query.code === 'string' && /^[a-zA-Z0-9_-]{16,256}$/.test(query.code) ? query.code : '';
  return <RecoveryForm code={code} />;
}
