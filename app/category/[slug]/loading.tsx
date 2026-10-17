export default function CategoryLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:max-w-6xl lg:max-w-[1080px] lg:pl-8 lg:pr-0">
        <div className="h-[553px] animate-pulse bg-[#cfcfcf] lg:h-[420px] lg:rounded-xl" />
        <div className="h-[500px] animate-pulse rounded-xl bg-[#cfcfcf] lg:h-[380px]" />
      </div>
    </div>
  );
}
