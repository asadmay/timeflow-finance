interface CategorySectionProps {
  title: string;
  total?: number;
  totalDisplay?: string;
  totalColor?: string;
  children: React.ReactNode;
  empty?: boolean;
}

export default function CategorySection({ title, total, totalDisplay, totalColor, children, empty }: CategorySectionProps) {
  if (empty) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-3">
        <div className="category-label">{title}</div>
        {totalDisplay && (
          <div className={`text-sm font-semibold ${totalColor ? totalColor : 'text-muted-foreground'}`}>
            {totalDisplay}
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}
