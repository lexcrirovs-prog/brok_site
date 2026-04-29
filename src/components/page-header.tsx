export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      {children}
    </div>
  );
}
