import { LoadingSkeleton } from '@/components/dashboard/primitives';
export default function Loading() {
  return <main className="loading-page" aria-busy="true">
    <p role="status" className="sr-only">Loading the fictional demo workspace.</p>
    <LoadingSkeleton />
  </main>;
}
