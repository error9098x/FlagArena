import { Button } from "@/components/ui/button";
export function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  if (total <= limit) return null;
  const pages = Math.ceil(total / limit);
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-4 mt-6"
    >
      <Button
        type="button"
        variant="outline"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
