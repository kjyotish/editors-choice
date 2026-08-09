export default function Loading() {
  return (
    <div className="min-h-screen px-3 py-6 sm:px-6 sm:py-8 md:px-12 md:py-12">
      <div className="mx-auto w-full max-w-6xl space-y-8" aria-busy="true" aria-label="Loading page">
        <div className="flex items-center justify-between gap-4">
          <div className="skeleton-block h-10 w-36 rounded-full" />
          <div className="skeleton-block h-10 w-24 rounded-full" />
        </div>

        <div className="space-y-4 pt-8">
          <div className="skeleton-block h-5 w-28 rounded-full" />
          <div className="skeleton-block h-11 w-full max-w-2xl rounded-2xl" />
          <div className="skeleton-block h-5 w-full max-w-xl rounded-full" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="space-y-4 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4"
            >
              <div className="skeleton-block aspect-square rounded-[18px]" />
              <div className="skeleton-block h-5 w-3/4 rounded-full" />
              <div className="skeleton-block h-4 w-full rounded-full" />
              <div className="skeleton-block h-4 w-5/6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
