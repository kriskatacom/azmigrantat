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
import { City, Country } from "@/lib/types";
import { createDragHandleColumn } from "@/components/data-table";
import ImageUpload from "@/components/image-upload";

export type CityWithCountry = City & {
    country?: Country;
};

export const columns: ColumnDef<CityWithCountry>[] = [
    createDragHandleColumn<CityWithCountry>(),
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
            const city = row.original;

            return (
                <div className="flex flex-col gap-2 min-w-30">
                    <div className="w-full max-w-50 origin-top">
                        <ImageUpload
                            aspectRatioClassName="h-28"
                            image_url={city.image_url || ""}
                            href={`/admin/cities/${city.id}`}
                            deleteimage_url={`/api/cities/${city.id}/upload`}
                            url={`/api/cities/${city.id}/upload`}
                            onUploadSuccess={(newUrl: string) => {
                                city.image_url = newUrl;
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
                href={`/admin/cities/${row.original.id}`}
                className="hover:underline"
            >
                {row.getValue("name")}
            </Link>
        ),
    },

    {
        id: "country",
        accessorFn: (row) => row.country?.name,
        meta: { label: "Държава" },
        header: ({ column }) => (
            <button
                className="flex items-center hover:bg-background duration-300 w-full px-2 py-1"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
            >
                <span>Държава</span>
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </button>
        ),
        cell: ({ row }) => (
            <Link
                href={`/admin/cities?country=${row.original.country?.slug}`}
                className="text-blue-500 hover:underline"
            >
                {row.original.country?.name}
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
            const country = row.original;
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    const res = await axios.delete(`/api/cities/${country.id}`);

                    if (res.data.success) {
                        router.refresh();
                        toast.success("Този град беше успешно премахнат!");
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
                        {country?.slug && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() =>
                                        router.push(
                                            `/${country.slug as string}`,
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
                                router.push(`/admin/cities/${country.id}`)
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