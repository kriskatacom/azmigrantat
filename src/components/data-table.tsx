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

import type { Row } from "@tanstack/react-table";

// ==============================
// DnD Kit
// ==============================
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// ==============================
// Icons
// ==============================
import { ChevronDown, Loader2 } from "lucide-react";

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
import { RiDragMove2Fill } from "react-icons/ri";
import { useSidebar } from "./main-sidebar/sidebar-context";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Identifiable = {
    id: string | number;
};

declare module "@tanstack/react-table" {
    interface ColumnMeta<TData, TValue> {
        label?: string;
    }
}

type DataTableProps<TData extends Identifiable> = {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    onBulkDelete?: (ids: Array<string | number>) => Promise<void>;
    onReorder?: (reorderedData: TData[]) => void;
};

// Drag handle column definition
export function createDragHandleColumn<
    TData extends Identifiable,
>(): ColumnDef<TData> {
    return {
        id: "drag-handle",
        header: () => null,
        cell: ({ row }) => <DragHandle rowId={row.original.id} />,
        enableSorting: false,
        enableHiding: false,
        size: 40,
    };
}

// Drag handle component
function DragHandle({ rowId }: { rowId: string | number }) {
    const { attributes, listeners } = useSortable({ id: rowId });

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
        >
            <RiDragMove2Fill className="h-4 w-4 text-muted-foreground" />
        </Button>
    );
}

// Sortable row component
function SortableRow<TData extends Identifiable>({
    row,
    children,
}: {
    row: Row<TData>;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.original.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            data-state={row.getIsSelected() && "selected"}
            className={isDragging ? "bg-muted" : ""}
        >
            {children}
        </TableRow>
    );
}

export function DataTable<TData extends Identifiable>({
    columns,
    data,
    onBulkDelete,
    onReorder,
}: DataTableProps<TData>) {
    const { collapsed } = useSidebar();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [internalData, setInternalData] = React.useState<TData[]>(() => data);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = internalData.findIndex(
                (item) => item.id === active.id,
            );
            const newIndex = internalData.findIndex(
                (item) => item.id === over.id,
            );

            const newData = arrayMove(internalData, oldIndex, newIndex);
            setInternalData(newData);
            onReorder?.(newData);
        }
    };

    const rowIds = React.useMemo(
        () => internalData.map((item) => item.id),
        [internalData],
    );
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Вземаме текущите стойности от URL
    const pageIndexFromUrl = Math.max(
        0,
        Number(searchParams.get("page") ?? 1) - 1,
    );
    const pageSizeFromUrl = Number(searchParams.get("limit") ?? 10);

    const [pageIndex, setPageIndex] = React.useState(pageIndexFromUrl);
    const [pageSize, setPageSize] = React.useState(pageSizeFromUrl);

    // Инициализация само при mount
    React.useEffect(() => {
        setPageIndex(pageIndexFromUrl);
        setPageSize(pageSizeFromUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        (row: Row<TData>, columnId: string, filterValue: string) => {
            const searchValue = filterValue.toLowerCase();

            return row.getAllCells().some((cell) => {
                const value = cell.getValue();
                if (value === null || value === undefined) return false;

                return String(value).toLowerCase().includes(searchValue);
            });
        },
        [],
    );

    const handlePaginationChange = React.useCallback(
        (newPageIndex: number, newPageSize?: number) => {
            const params = new URLSearchParams(window.location.search);
            params.set("page", String(newPageIndex + 1)); // +1 за URL
            if (newPageSize !== undefined) {
                params.set("limit", String(newPageSize));
            }

            router.push(`${pathname}?${params.toString()}`, { scroll: false });

            setPageIndex(newPageIndex);
            if (newPageSize !== undefined) setPageSize(newPageSize);
        },
        [pathname, router],
    );

    const table = useReactTable({
        data,
        columns,
        getRowId: (row) => String(row.id),
        state: {
            pagination: { pageIndex, pageSize },
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        manualPagination: false, // оставяме TanStack да управлява slice на данните
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        getPaginationRowModel: getPaginationRowModel(),
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

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full p-5 space-y-5">
            <div className="bg-background flex items-center p-5 rounded-md border gap-5">
                {/* Търсене */}
                <Input
                    placeholder="Търсене..."
                    value={globalFilter ?? ""}
                    onChange={(e) => {
                        const value = e.target.value;
                        setGlobalFilter(value);
                        // Рестартираме до първа страница в URL и стейта
                        handlePaginationChange(0);
                    }}
                    className="max-w-md"
                />

                {/* Bulk delete */}
                {table.getSelectedRowModel().rows.length > 0 && (
                    <Button
                        variant="destructive"
                        size="lg"
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
                            size="lg"
                            className="flex items-center gap-2 bg-transparent"
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
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <div
                    className={cn(
                        collapsed ? "max-w-[100vw]" : "max-w-[81.5vw]",
                        "duration-300 bg-background overflow-auto rounded-md border",
                    )}
                >
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead
                                                key={header.id}
                                                style={{
                                                    width:
                                                        header.id ===
                                                        "drag-handle"
                                                            ? 50
                                                            : undefined,
                                                }}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column
                                                              .columnDef.header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <SortableContext
                            items={rowIds}
                            strategy={verticalListSortingStrategy}
                        >
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <SortableRow key={row.id} row={row}>
                                            {row
                                                .getVisibleCells()
                                                .map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column
                                                                .columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </TableCell>
                                                ))}
                                        </SortableRow>
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
                        </SortableContext>
                    </Table>
                </div>
            </DndContext>
            <div className="bg-background flex items-center justify-end rounded-md border space-x-5 p-5">
                <div className="text-muted-foreground flex-1 text-sm">
                    Избрани са {table.getFilteredSelectedRowModel().rows.length}{" "}
                    от {table.getFilteredRowModel().rows.length} реда.
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center justify-between px-5">
                        {/* Лява страна */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Select
                                value={String(pageSize)}
                                onValueChange={(value: string) =>
                                    handlePaginationChange(0, Number(value))
                                }
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
                    </div>

                    <div className="flex items-center space-x-1">
                        {/* Първа страница */}
                        <Button
                            disabled={pageIndex === 0}
                            size="xl"
                            onClick={() => {
                                handlePaginationChange(0);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                        >
                            Първа
                        </Button>

                        {/* Видими страници около текущата */}
                        {visiblePages.map((page) => (
                            <Button
                                key={page}
                                variant={
                                    page === pageIndex ? "default" : "outline"
                                }
                                size="xl"
                                onClick={() => {
                                    handlePaginationChange(page);
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                            >
                                {page + 1}
                            </Button>
                        ))}

                        {/* Последна страница */}
                        <Button
                            size="xl"
                            disabled={pageIndex === pageCount - 1}
                            onClick={() => {
                                handlePaginationChange(pageCount - 1);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                        >
                            Последна
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
