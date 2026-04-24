import { SkeletonCard } from '@/components/ui/skeleton';

export default function CtvLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-7 w-40 rounded-md bg-slate-200 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
