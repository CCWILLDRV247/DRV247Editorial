export default function StoryLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5" />
      <div className="mx-auto max-w-3xl">
        <div className="h-[553px] animate-pulse bg-[#cfcfcf] lg:h-[420px] lg:rounded-xl" />
        <div className="space-y-3 px-7 pt-6 pb-10">
          <div className="h-3 w-40 animate-pulse rounded bg-[#eee]" />
          <div className="h-10 w-11/12 animate-pulse rounded bg-[#eee]" />
          <div className="h-16 w-full animate-pulse rounded bg-[#eee]" />
        </div>
      </div>
    </div>
  );
}
