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
import { Cruise } from "@/lib/types";
import { createDragHandleColumn } from "@/components/data-table";
import ImageUpload from "@/components/image-upload";

export const columns: ColumnDef<Cruise>[] = [
    createDragHandleColumn<Cruise>(),
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

    {
        accessorKey: "image_url",
        meta: { label: "Изображение" },
        header: "Изображение",
        cell: ({ row }) => {
            const cruise = row.original;

            return (
                <div className="flex flex-col gap-2 min-w-30">
                    <div className="w-full max-w-50 origin-top">
                        <ImageUpload
                            aspectRatioClassName="h-28"
                            image_url={cruise.image_url || ""}
                            href={`/admin/cruises/${cruise.id}`}
                            deleteimage_url={`/api/cruises/${cruise.id}/upload`}
                            url={`/api/cruises/${cruise.id}/upload`}
                            onUploadSuccess={(newUrl: string) => {
                                cruise.image_url = newUrl;
                            }}
                            className="m-0"
                        />
                    </div>
                </div>
            );
        },
    },

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
                href={`/admin/cruises/${row.original.id}`}
                className="hover:underline"
            >
                {row.getValue("name")}
            </Link>
        ),
    },

    {
        accessorKey: "created_at",
        meta: {
            label: "Създадено",
        },
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
            const value = row.getValue("created_at") as string | null;
            if (!value) return "—";

            const date = new Date(value);
            return date.toLocaleDateString("bg-BG", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        },
    },

    {
        id: "actions",
        meta: {
            label: "Опции",
        },
        header: "Опции",
        cell: ({ row }) => {
            const airport = row.original;
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    const res = await axios.delete(
                        `/api/cruises/${airport.id}`,
                    );

                    if (res.data.success) {
                        router.refresh();
                        toast.success(
                            "Тази круизна компания беше успешно премахната!",
                        );
                    } else {
                        if (res.status === 403 && res.data.code === "slug") {
                            toast.error(res.data.error);
                        }
                    }
                } catch (err: any) {
                    if (err.response) {
                        toast.error(
                            err.response.data.error || "Грешка при изпращане",
                        );
                    } else {
                        console.error(err);
                        toast.error("Грешка при изпращане");
                    }
                }
            };

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Опции</DropdownMenuLabel>
                        {airport?.slug && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() =>
                                        router.push(
                                            `/${airport.slug as string}`,
                                        )
                                    }
                                >
                                    Преглед
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() =>
                                router.push(`/admin/cruises/${airport.id}`)
                            }
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
