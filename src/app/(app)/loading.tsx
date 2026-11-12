export default function AppLoading() {
  return (
    <div className="grid gap-4">
      <div className="h-10 w-72 animate-pulse rounded-full bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[28px] bg-slate-200" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-[32px] bg-slate-200" />
    </div>
  );
}
