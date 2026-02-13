"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createDragHandleColumn } from "@/components/data-table";
import { Offer } from "@/lib/types";
import { deleteOfferAction } from "./actions";

export const columns: ColumnDef<Offer>[] = [
    createDragHandleColumn<Offer>(),

    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },

    // 🖼 Изображение
    {
        accessorKey: "image",
        header: "Изображение",
        meta: { label: "Изображение" },
        cell: ({ row }) => {
            const ad = row.original;
            const [loading, setLoading] = useState(true);

            if (!ad.image) {
                return (
                    <div className="w-24 h-16 flex items-center justify-center text-sm rounded">
                        N/A
                    </div>
                );
            }

            return (
                <div className="relative w-30 h-20 rounded-lg overflow-hidden border">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-500" />
                        </div>
                    )}

                    <Link href={`/users/entrepreneurs/offers/${ad.id}`}>
                        <Image
                            src={ad.image}
                            alt={ad.name}
                            fill
                            className={`object-cover transition-opacity duration-500 ${
                                loading ? "opacity-0" : "opacity-100"
                            }`}
                            onLoad={() => setLoading(false)}
                            onError={() => setLoading(false)}
                            unoptimized
                        />
                    </Link>
                </div>
            );
        },
    },

    // 📝 Име
    {
        accessorKey: "name",
        meta: { label: "Име" },
        header: ({ column }) => (
            <button
                className="flex items-center hover:bg-background duration-300 cursor-pointer w-full px-2 py-1"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
            >
                <span>Име</span>
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </button>
        ),
        cell: ({ row }) => (
            <Link
                href={`/users/entrepreneurs/offers/${row.original.id}`}
                className="hover:underline"
            >
                {row.getValue("name")}
            </Link>
        ),
    },

    // 🏢 Компания (ако правиш JOIN)
    {
        accessorKey: "company_name",
        header: "Компания",
        meta: { label: "Компания" },
        cell: ({ row }) => {
            const ad = row.original;

            if (!ad.company_id) return "—";

            return (
                <Link
                    href={`/users/entrepreneurs/companies`}
                    className="hover:underline"
                >
                    {ad.company_name || `#${ad.company_id}`}
                </Link>
            );
        },
    },

    // 📌 Статус
    {
        accessorKey: "status",
        header: "Статус",
        meta: { label: "Статус" },
        cell: ({ row }) => {
            const status = row.getValue("status") as string;

            // Превод на български
            const statusBg = {
                active: "Активна",
                pending: "Очаква",
                draft: "Чернова",
                canceled: "Отменена",
            };

            const variant =
                status === "active"
                    ? "default"
                    : status === "pending"
                      ? "secondary"
                      : status === "draft"
                        ? "outline"
                        : "destructive";

            return (
                <Badge variant={variant}>
                    {statusBg[status as keyof typeof statusBg]}
                </Badge>
            );
        },
    },

    // 📅 Създадено
    {
        accessorKey: "created_at",
        meta: { label: "Дата на създаване" },
        header: ({ column }) => (
            <button
                className="flex items-center hover:bg-background duration-300 cursor-pointer w-full px-2 py-1"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
            >
                <span>Създадено</span>
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </button>
        ),
        cell: ({ row }) => {
            const value = row.getValue("created_at") as string;
            const date = new Date(value);

            return date.toLocaleDateString("bg-BG", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        },
    },

    // ⚙️ Actions
    {
        id: "actions",
        header: "Опции",
        meta: { label: "Опции" },
        cell: ({ row }) => {
            const ad = row.original;
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    deleteOfferAction(ad.id);
                    toast.success("Обявата беше изтрита успешно!");
                    router.refresh();
                } catch (err: any) {
                    toast.error(
                        err.response?.data?.error || "Грешка при изтриване",
                    );
                }
            };

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Опции</DropdownMenuLabel>

                        <DropdownMenuItem
                            onClick={() => router.push(`/users/entrepreneurs/offers/${ad.id}`)}
                        >
                            Редактиране
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={handleDelete}
                        >
                            Изтриване
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
