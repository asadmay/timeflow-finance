interface CategorySectionProps {
  category: string;
  children: React.ReactNode;
}

export default function CategorySection({ category, children }: CategorySectionProps) {
  return (
    <div className="mb-4">
      <div className="category-label px-1 mb-1.5">{category || "Прочее"}</div>
      <div className="rounded-xl border border-border/30 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
