export default function PrintLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="h-14 border-b border-[#1b1d1f]/5" />
      <div className="mx-auto grid max-w-3xl gap-10 px-[calc(10px+env(safe-area-inset-left,0px))] pb-20 pt-8 md:max-w-6xl md:grid-cols-[minmax(0,18rem)_1fr] md:px-6">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#1b1d1f]" />
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-white" />
          <div className="h-24 w-3/4 rounded bg-white" />
        </div>
      </div>
    </div>
  );
}
