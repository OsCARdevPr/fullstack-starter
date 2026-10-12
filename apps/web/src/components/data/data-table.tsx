import type { ReactNode } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Applied to the header and every cell of the column (width, alignment, `hidden md:table-cell`). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** `undefined` until the first load finishes. */
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  /** Shown instead of the rows when there are none to show. */
  error?: unknown;
  onRetry?: () => void;
  /** Shown when there are no rows, e.g. an `EmptyState` with a "New" button. */
  empty?: ReactNode;
}

/** A table from a column list, with loading, error and empty states built in. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  empty,
}: DataTableProps<T>) {
  const status = (content: ReactNode) => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns.length} className="whitespace-normal">
        {content}
      </TableCell>
    </TableRow>
  );

  let body: ReactNode;
  if (rows?.length) {
    body = rows.map((row) => (
      <TableRow key={getRowId(row)}>
        {columns.map((column) => (
          <TableCell key={column.id} className={column.className}>
            {column.cell(row)}
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (error) {
    body = status(<ErrorState error={error} onRetry={onRetry} />);
  } else if (isLoading || !rows) {
    body = status(<LoadingState />);
  } else {
    body = status(empty ?? <EmptyState title="No results" />);
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{body}</TableBody>
      </Table>
    </div>
  );
}
