"use client";

/**
 * DataTable — headless TanStack Table v8 wired to the project's .astu-table
 * CSS and design token system.
 *
 * Features:
 *  • Column sorting (click header) with visual ▲ / ▼ / ⇅ indicators
 *  • Column visibility toggle (dropdown, "Columns" button)
 *  • Global search input (client-side filter across all visible string columns)
 *  • Page-size selector (10 / 25 / 50 / 100)
 *  • Numbered pagination bar (prev · 1 2 … n · next)
 *  • Optional bulk row selection with a contextual bulk-action bar
 *
 * Usage:
 *   const columns = useMemo<ColumnDef<MyRow>[]>(() => [...], []);
 *   <DataTable
 *     columns={columns}
 *     data={rows}
 *     // optional — server-side pagination; omit for client-side
 *     manualPagination={{ page, pageSize, total, onPage, onPageSize }}
 *     // optional — server-side filter; omit to use built-in client search
 *     searchValue={search} onSearchChange={setSearch}
 *     // optional — bulk actions shown when rows are selected
 *     bulkActions={(rows) => <Button onClick={() => …}>Export {rows.length}</Button>}
 *     // optional — right side of the toolbar
 *     toolbarRight={<Button size="sm">+ New</Button>}
 *   />
 */

import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ *
 * Public re-exports so callers only need to import from this file
 * ------------------------------------------------------------------ */
export type { ColumnDef, Row };

/* ------------------------------------------------------------------ *
 * Props
 * ------------------------------------------------------------------ */
export interface ManualPagination {
  /** 1-based current page */
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Provide to hand pagination control to the server. Omit for client-side. */
  manualPagination?: ManualPagination;
  /** Controlled global search (use for server-side filtering). */
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Renders inside the toolbar, right side */
  toolbarRight?: ReactNode;
  /**
   * When provided, rows become selectable and this callback receives the
   * selected row objects plus a `clearSelection` function. The returned node
   * is rendered in a floating bulk-action bar above the table.
   */
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => ReactNode;
  /** Extra content below the pagination bar */
  footer?: ReactNode;
  /** CSS class on the outer wrapper */
  className?: string;
  /** Disable the built-in client-side global filter (useful when filtering server-side) */
  disableClientSearch?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/* ------------------------------------------------------------------ *
 * Sort indicator icon
 * ------------------------------------------------------------------ */
function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")  return <ChevronUp   className="ml-1 inline h-3 w-3 shrink-0 text-primary" />;
  if (sorted === "desc") return <ChevronDown className="ml-1 inline h-3 w-3 shrink-0 text-primary" />;
  return <ChevronsUpDown className="ml-1 inline h-3 w-3 shrink-0 opacity-30" />;
}

/* ------------------------------------------------------------------ *
 * Pagination number bar
 * Renders: « ‹ 1 2 … 7 8 › »
 * ------------------------------------------------------------------ */
function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  /* Build the visible page numbers with a "…" ellipsis */
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    const nums: (number | "…")[] = [1];
    if (left > 2) nums.push("…");
    for (let i = left; i <= right; i++) nums.push(i);
    if (right < totalPages - 1) nums.push("…");
    nums.push(totalPages);
    return nums;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: count + page size */}
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{start}–{end}</span>
          {" "}of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { onPageSize(Number(v)); onPage(1); }}
          >
            <SelectTrigger className="h-7 w-16 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-0.5">
        <NavBtn onClick={() => onPage(1)}          disabled={page <= 1} title="First page">
          <ChevronsLeft  className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={() => onPage(page - 1)}   disabled={page <= 1} title="Previous page">
          <ChevronLeft   className="h-3.5 w-3.5" />
        </NavBtn>

        {pageNumbers().map((n, i) =>
          n === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground select-none">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={cn(
                "flex h-7 min-w-[28px] items-center justify-center rounded px-2 text-xs transition-colors",
                n === page
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-surface-2 text-foreground"
              )}
            >
              {n}
            </button>
          )
        )}

        <NavBtn onClick={() => onPage(page + 1)}     disabled={page >= totalPages} title="Next page">
          <ChevronRight  className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={() => onPage(totalPages)}   disabled={page >= totalPages} title="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </NavBtn>
      </div>
    </div>
  );
}

function NavBtn({
  children,
  disabled,
  onClick,
  title,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Main component
 * ------------------------------------------------------------------ */
export function DataTable<TData>({
  columns: columnDefs,
  data,
  manualPagination,
  searchValue: controlledSearch,
  onSearchChange,
  searchPlaceholder = "Search…",
  toolbarRight,
  bulkActions,
  footer,
  className,
  disableClientSearch = false,
}: DataTableProps<TData>) {
  /* ── Local state ── */
  const [sorting,         setSorting]         = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection,    setRowSelection]    = useState<RowSelectionState>({});
  const [localSearch,     setLocalSearch]     = useState("");
  const [localPageSize,   setLocalPageSize]   = useState(
    manualPagination?.pageSize ?? 25
  );

  const isServerPaginated  = !!manualPagination;
  const isServerSearch     = controlledSearch !== undefined;
  const searchInput        = isServerSearch ? controlledSearch : localSearch;
  const selectable         = !!bulkActions;

  /* ── Selection column (prepended when bulkActions is provided) ── */
  const selectionCol: ColumnDef<TData, unknown> = {
    id: "__select__",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    size: 40,
  };

  const columns = selectable ? [selectionCol, ...columnDefs] : columnDefs;

  /* ── Table instance ── */
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter: disableClientSearch ? undefined : localSearch,
      ...(isServerPaginated
        ? { pagination: { pageIndex: manualPagination.page - 1, pageSize: manualPagination.pageSize } }
        : { pagination: { pageIndex: 0, pageSize: localPageSize } }),
    },
    enableRowSelection: selectable,
    onSortingChange:          setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange:     setRowSelection,
    onGlobalFilterChange:     disableClientSearch ? undefined : setLocalSearch,
    getCoreRowModel:          getCoreRowModel(),
    getSortedRowModel:        getSortedRowModel(),
    getFilteredRowModel:      disableClientSearch ? undefined : getFilteredRowModel(),
    getPaginationRowModel:    isServerPaginated   ? undefined : getPaginationRowModel(),
    manualPagination:         isServerPaginated,
    manualFiltering:          disableClientSearch,
    pageCount:                isServerPaginated
      ? Math.ceil(manualPagination.total / manualPagination.pageSize)
      : undefined,
  });

  /* ── Derived ── */
  const selectedRows    = table.getSelectedRowModel().rows.map((r) => r.original);
  const hasSelection    = selectedRows.length > 0;
  const currentPage     = isServerPaginated ? manualPagination.page : table.getState().pagination.pageIndex + 1;
  const currentPageSize = isServerPaginated ? manualPagination.pageSize : localPageSize;
  const totalPages      = isServerPaginated
    ? Math.ceil(manualPagination.total / manualPagination.pageSize)
    : table.getPageCount();
  const totalRows       = isServerPaginated ? manualPagination.total : table.getFilteredRowModel().rows.length;

  function handlePageChange(p: number) {
    if (isServerPaginated) {
      manualPagination.onPage(p);
    } else {
      table.setPageIndex(p - 1);
    }
  }

  function handlePageSizeChange(s: number) {
    if (isServerPaginated) {
      manualPagination.onPageSize(s);
    } else {
      setLocalPageSize(s);
      table.setPageSize(s);
      table.setPageIndex(0);
    }
  }

  function handleSearchChange(v: string) {
    if (isServerSearch) {
      onSearchChange?.(v);
    } else {
      setLocalSearch(v);
      // reset to page 1 on filter change
      if (!isServerPaginated) table.setPageIndex(0);
    }
  }

  /* ── Hideable columns (exclude __select__ and columns with enableHiding:false) ── */
  const hideableColumns = table
    .getAllColumns()
    .filter((c) => c.getCanHide());

  return (
    <div className={cn("astu-card overflow-hidden", className)}>
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 border-b border-border bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Column visibility toggle */}
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Columns3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="text-xs capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {/* Use the column's meta label or fall back to id */}
                    {(col.columnDef.meta as { label?: string } | undefined)?.label ?? col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {toolbarRight}
        </div>
      </div>

      {/* ── Bulk action bar — floats above the table when rows selected ── */}
      {selectable && hasSelection && (
        <div className="flex items-center justify-between border-b border-primary/30 bg-accent px-4 py-2">
          <span className="text-xs font-semibold text-primary">
            {selectedRows.length} row{selectedRows.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions!(selectedRows, () => table.resetRowSelection())}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => table.resetRowSelection()}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="astu-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted  = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                      className={cn(canSort && "cursor-pointer select-none hover:text-foreground")}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon sorted={sorted} />}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  No results match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-selected={row.getIsSelected() || undefined}
                  className={cn(
                    row.getIsSelected() && "bg-accent/60"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination bar ── */}
      <PaginationBar
        page={currentPage}
        totalPages={totalPages}
        total={totalRows}
        pageSize={currentPageSize}
        onPage={handlePageChange}
        onPageSize={handlePageSizeChange}
      />

      {footer && (
        <div className="flex items-center justify-end border-t border-border bg-surface px-4 py-2.5">
          {footer}
        </div>
      )}
    </div>
  );
}
