export default function Loading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5 bg-white" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:max-w-6xl">
        <div className="h-[553px] animate-pulse bg-[#cfcfcf]" />
        <div className="h-32 animate-pulse rounded bg-[#eee]" />
        <div className="h-[500px] animate-pulse rounded-xl bg-[#cfcfcf]" />
      </div>
    </div>
  );
}
