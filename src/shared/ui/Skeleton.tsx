interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-border/50 ${className}`}
      aria-hidden="true"
    />
  );
}

export function MainPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="로딩 중">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-12 rounded-lg" />
          <Skeleton className="h-8 w-12 rounded-lg" />
        </div>
      </div>

      {/* Member Card */}
      <div className="rounded-2xl bg-surface-elevated p-4">
        <Skeleton className="h-5 w-16 mb-3" />
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-14 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>
      </div>

      {/* Sessions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <div className="rounded-2xl bg-surface-elevated p-4">
          <Skeleton className="h-5 w-12 mb-4" />
          <Skeleton className="h-10 w-full rounded-lg mb-3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SettlementPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="로딩 중">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Transfer Summary */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      {/* Detail */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      {/* Share button */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
