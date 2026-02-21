"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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
import { Country, Landmark } from "@/lib/types";
import { createDragHandleColumn } from "@/components/data-table";
import AppImage from "@/components/AppImage";
import { useGalleryDialogLandmarkStore } from "@/app/[locale]/admin/landmarks/_stores/gallery-dialog-store";

export type LandmarkWithCountry = Landmark & {
    country?: Country;
};

function ActionCell({ landmark }: { landmark: LandmarkWithCountry }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (
            !confirm(
                "Сигурни ли сте, че искате да изтриете тази забележителност?",
            )
        )
            return;

        try {
            const res = await axios.delete(`/api/landmarks/${landmark.id}`);
            if (res.data.success) {
                router.refresh();
                toast.success("Забележителността е изтрита успешно!");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Грешка при изтриване");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Опции</DropdownMenuLabel>
                {landmark.country?.slug && (
                    <DropdownMenuItem
                        onClick={() =>
                            router.push(
                                `/${landmark.country?.slug}/landmarks/${landmark.slug}`,
                            )
                        }
                    >
                        Преглед в сайта
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() =>
                        router.push(`/admin/landmarks/${landmark.id}`)
                    }
                >
                    Редактиране
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 font-medium"
                    onClick={handleDelete}
                >
                    Изтриване
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const columns: ColumnDef<LandmarkWithCountry>[] = [
    createDragHandleColumn<LandmarkWithCountry>(),
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
    },
    {
        accessorKey: "image_url",
        header: "Изображение",
        cell: ({ row }) => {
            const landmark = row.original;
            const { onOpen } = useGalleryDialogLandmarkStore();

            return (
                <div
                    onClick={() => onOpen(landmark.id)}
                    className="group relative w-20 h-14 cursor-pointer rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-all"
                >
                    {landmark.image_url && landmark.name ? (
                        <AppImage
                            src={landmark.image_url}
                            fill
                            alt={landmark.name}
                            className="object-cover transition-transform group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="text-muted-foreground w-6 h-6" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            ГАЛЕРИЯ
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                className="p-0 hover:bg-transparent"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
            >
                Име <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <Link
                href={`/admin/landmarks/${row.original.id}`}
                className="font-medium hover:underline text-primary"
            >
                {row.getValue("name")}
            </Link>
        ),
    },
    {
        id: "country",
        accessorFn: (row) => row.country?.name,
        header: "Държава",
        cell: ({ row }) => (
            <Link
                href={`/admin/landmarks?country=${row.original.country?.slug}`}
                className="text-muted-foreground hover:text-primary transition-colors italic"
            >
                {row.original.country?.name || "Няма държава"}
            </Link>
        ),
    },
    {
        accessorKey: "created_at",
        header: "Създадено на",
        cell: ({ row }) => {
            const value = row.getValue("created_at") as string;
            if (!value) return "—";
            return new Date(value).toLocaleDateString("bg-BG", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        },
    },
    {
        id: "actions",
        header: "Опции",
        cell: ({ row }) => <ActionCell landmark={row.original} />,
    },
];
