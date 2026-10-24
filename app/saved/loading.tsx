export default function SavedLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5" />
      <div className="mx-auto max-w-3xl px-7 py-10 md:max-w-6xl">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="h-[500px] animate-pulse rounded-xl bg-[#eee] lg:h-[380px]" />
          <div className="h-[500px] animate-pulse rounded-xl bg-[#eee] lg:h-[380px]" />
        </div>
      </div>
    </div>
  );
}
