import { SkeletonCard } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-7 w-48 rounded-md bg-slate-200 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
