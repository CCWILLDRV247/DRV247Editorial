export default function StoryLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5" />
      <div className="mx-auto max-w-3xl">
        <div className="h-[553px] animate-pulse bg-[#cfcfcf]" />
        <div className="space-y-4 px-7 py-10">
          <div className="h-24 animate-pulse rounded bg-[#eee]" />
          <div className="h-16 animate-pulse rounded bg-[#eee]" />
        </div>
      </div>
    </div>
  );
}
