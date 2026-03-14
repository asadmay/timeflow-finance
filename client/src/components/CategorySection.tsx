interface CategorySectionProps {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}

export default function CategorySection({ title, children, empty }: CategorySectionProps) {
  if (empty) return null;
  return (
    <div className="mb-4">
      <div className="category-label mb-2 px-3">{title}</div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}
