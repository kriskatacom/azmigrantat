"use client";

// ==============================
// React
// ==============================
import * as React from "react";

// ==============================
// TanStack Table
// ==============================
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table";

import type { Row, Table as ReactTable } from "@tanstack/react-table";

// ==============================
// Icons
// ==============================
import { ChevronDown, Loader2 } from "lucide-react";
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";

// ==============================
// UI Components (shadcn/ui)
// ==============================
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

type Identifiable = {
    id: string | number;
};

declare module "@tanstack/react-table" {
    interface ColumnMeta<TData, TValue> {
        label?: string;
    }
}

type DataTableProps<TData extends Identifiable> = {
    columns: ColumnDef<TData, any>[] | ColumnDef<any>[];
    data: any;
    onBulkDelete?: (ids: Array<string | number>) => Promise<void>;
};

export function DataTable<TData extends Identifiable>({
    columns,
    data,
    onBulkDelete,
}: DataTableProps<TData>) {
    const router = useRouter();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [isDeleting, setIsDeleting] = React.useState(false);

    const searchableColumns = React.useMemo(
        () =>
            columns
                .filter(
                    (col: any) =>
                        col.accessorKey &&
                        col.id !== "select" &&
                        col.id !== "actions",
                )
                .map((col: any) => col.accessorKey),
        [columns],
    );

    const globalSearchFilter = React.useCallback(
        (row: any, _: string, value: string) => {
            const search = String(value).toLowerCase();
            return searchableColumns.some((columnId: any) => {
                const cellValue = row.getValue(columnId);
                return String(cellValue ?? "")
                    .toLowerCase()
                    .includes(search);
            });
        },
        [searchableColumns],
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
            pagination,
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: globalSearchFilter,
    });

    const PAGE_RANGE = 3;
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;

    const startPage = Math.max(0, currentPage - PAGE_RANGE);
    const endPage = Math.min(pageCount - 1, currentPage + PAGE_RANGE);

    const visiblePages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i,
    );

    const selectedRows: Row<TData>[] = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);

    const handleBulkDelete = async () => {
        if (table.getSelectedRowModel().rows.length === 0) return;

        try {
            setIsDeleting(true);

            if (onBulkDelete) {
                await onBulkDelete(
                    table
                        .getSelectedRowModel()
                        .rows.map((row) => row.original.id),
                );
            }

            table.resetRowSelection();
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="w-full p-5">
            <div className="flex items-center mb-5 gap-2">
                {/* Търсене */}
                <Input
                    placeholder="Търсене..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="max-w-md"
                />

                {/* Bulk delete */}
                {table.getSelectedRowModel().rows.length > 0 && (
                    <Button
                        variant="destructive"
                        size="xl"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2"
                    >
                        {isDeleting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {isDeleting
                            ? "Изтриване..."
                            : `Премахване на (${
                                  table.getSelectedRowModel().rows.length
                              }) елемента`}
                    </Button>
                )}

                {/* Spacer */}
                <div className="ml-auto" />

                {/* Колони */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="xl"
                            className="flex items-center gap-2"
                        >
                            Колони <ChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value: boolean) =>
                                        column.toggleVisibility(!!value)
                                    }
                                >
                                    {column.columnDef.meta?.label ?? column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Все още няма намерени резултати.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="text-muted-foreground flex-1 text-sm">
                    Избрани са {table.getFilteredSelectedRowModel().rows.length}{" "}
                    от {table.getFilteredRowModel().rows.length} реда.
                </div>
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center justify-between p-5">
                        {/* Лява страна */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Select
                                value={String(
                                    table.getState().pagination.pageSize,
                                )}
                                onValueChange={(value: string) => {
                                    table.setPageSize(Number(value));
                                    table.setPageIndex(0);
                                }}
                            >
                                <SelectTrigger className="w-30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 20, 50, 100].map((size) => (
                                        <SelectItem
                                            key={size}
                                            value={String(size)}
                                        >
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Дясна страна – pagination */}
                        <div className="flex items-center space-x-1">
                            {/* тук си остава твоят pagination код */}
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                table.setPageIndex(0);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <FaAnglesLeft />
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                table.previousPage();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <FaAngleLeft />
                        </Button>

                        {/* Видими страници около текущата */}
                        {visiblePages.map((page) => (
                            <Button
                                key={page}
                                variant={
                                    page === currentPage ? "default" : "outline"
                                }
                                size="lg"
                                onClick={() => {
                                    table.setPageIndex(page);
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                            >
                                {page + 1}
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                table.nextPage();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            disabled={!table.getCanNextPage()}
                        >
                            <FaAngleRight />
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                table.setPageIndex(pageCount - 1);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            disabled={!table.getCanNextPage()}
                        >
                            <FaAnglesRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
