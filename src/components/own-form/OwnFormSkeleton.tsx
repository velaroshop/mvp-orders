// Loading placeholder of the order form: also what the server sends in the page HTML and what shows while the form's
// code is being loaded, so the page does not jump when the real form appears.
export default function OwnFormSkeleton() {
  return (
    <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-xl mx-auto">
        {/* Skeleton Header */}
        <div className="rounded-lg p-3 pt-5 mb-3 bg-zinc-200 animate-pulse">
          <div className="h-6 w-32 bg-zinc-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-6 w-24 bg-zinc-300 rounded" />
            <div className="h-6 w-4 bg-zinc-300 rounded" />
            <div className="h-8 w-28 bg-zinc-300 rounded" />
          </div>
          <div className="h-4 w-20 bg-zinc-300 rounded mx-auto mb-1" />
          <div className="h-3 w-48 bg-zinc-300 rounded mx-auto" />
        </div>
        {/* Skeleton Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="h-5 w-48 bg-zinc-200 rounded mx-auto mb-4 animate-pulse" />
          {/* Skeleton fields */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-3 animate-pulse">
              <div className="h-3 w-24 bg-zinc-200 rounded mb-1.5" />
              <div className="h-10 bg-zinc-100 border border-zinc-200 rounded-lg" />
            </div>
          ))}
          {/* Skeleton offers */}
          <div className="border-t border-zinc-200 pt-3 mt-3">
            <div className="h-5 w-44 bg-zinc-200 rounded mx-auto mb-3 animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-zinc-100 border border-zinc-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          {/* Skeleton button */}
          <div className="mt-4 h-12 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
