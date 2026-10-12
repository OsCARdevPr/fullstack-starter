import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

export interface DataPaginationProps {
  /** Current page, 1-based. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** The first, last and neighboring pages; `null` marks a gap. */
function visiblePages(page: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let candidate = 1; candidate <= totalPages; candidate++) {
    const shown = candidate === 1 || candidate === totalPages || Math.abs(candidate - page) <= 1;
    if (shown) pages.push(candidate);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

/** Page buttons under a list. Renders nothing when everything fits on one page. */
export function DataPagination({ page, totalPages, onPageChange }: DataPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            aria-label="Go to previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </Button>
        </PaginationItem>
        {visiblePages(page, totalPages).map((candidate, index) => (
          // Gaps have no page number, so the position is their stable identity.
          <PaginationItem key={candidate ?? `gap-${index}`}>
            {candidate === null ? (
              <PaginationEllipsis />
            ) : (
              <Button
                variant={candidate === page ? "outline" : "ghost"}
                size="icon"
                aria-label={`Page ${candidate}`}
                aria-current={candidate === page ? "page" : undefined}
                onClick={() => onPageChange(candidate)}
              >
                {candidate}
              </Button>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button
            variant="ghost"
            aria-label="Go to next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRight data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
