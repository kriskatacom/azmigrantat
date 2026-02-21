"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal, Pen, SaveIcon } from "lucide-react";
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
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Country, Embassy } from "@/lib/types";
import { createDragHandleColumn } from "@/components/data-table";
import ImageUpload from "@/components/image-upload";
import { FaTimes } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

export type EmbassyWithCountry = Embassy & {
    country?: Country;
};

type Props = {
    embassy: Embassy;
};

function ImageCell({
    currentEmbassy,
    allEmbassies,
}: {
    currentEmbassy: EmbassyWithCountry;
    allEmbassies: EmbassyWithCountry[];
}) {
    const router = useRouter();

    const initialIndex = useMemo(
        () => allEmbassies.findIndex((l) => l.id === currentEmbassy.id),
        [currentEmbassy.id, allEmbassies],
    );

    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Дефинираме активния обект на базата на индекса
    const activeLandmark = allEmbassies[currentIndex] || currentEmbassy;

    const handleUploadSuccess = (newUrl: string, field: string) => {
        // Обновяваме локално обекта в масива, за да се отрази веднага в UI
        (activeLandmark as any)[field] = newUrl;
        toast.success("Изображението е обновено!");
        router.refresh();
    };

    const goToPrev = () =>
        currentIndex > 0 && setCurrentIndex((prev) => prev - 1);
    const goToNext = () =>
        currentIndex < allEmbassies.length - 1 &&
        setCurrentIndex((prev) => prev + 1);

    return (
        <div className="flex items-start">
            <Dialog
                onOpenChange={(open) => !open && setCurrentIndex(initialIndex)}
            >
                <DialogTrigger asChild>
                    <div className="group relative w-40 h-28 cursor-pointer rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all duration-300">
                        <ImageUpload
                            aspectRatioClassName="h-28"
                            image_url={currentEmbassy.image_url || ""}
                            url={`/api/embassies/${currentEmbassy.id}/upload`}
                            onUploadSuccess={(newUrl: string) => {
                                currentEmbassy.image_url = newUrl;
                            }}
                            className="m-0 transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-medium bg-website-dark px-2 py-1 rounded-full backdrop-blur-sm">
                                Още опции
                            </span>
                        </div>
                    </div>
                </DialogTrigger>

                <DialogContent className="max-w-4xl p-6 rounded-2xl shadow-2xl bg-white border-none">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                            {/* Добавихме името на текущото посолство за яснота */}
                            Управление на: {activeLandmark.name}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm mt-1">
                            Тук можете да качите основното изображение, логото и
                            заглавното изображение.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Добавяме ключ (key), който зависи от activeLandmark.id. 
                        Това кара React да рендерира чисто нови ImageUpload компоненти при смяна на посолството. */}
                    <div className="space-y-6" key={activeLandmark.id}>
                        <div className="w-full mt-4 space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                                Предно изображение
                            </label>
                            <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-dashed border-muted hover:border-primary/50 transition-colors bg-muted/30">
                                <ImageUpload
                                    aspectRatioClassName="h-96"
                                    image_url={activeLandmark.image_url || ""}
                                    url={`/api/embassies/${activeLandmark.id}/upload`}
                                    deleteimage_url={`/api/embassies/${activeLandmark.id}/upload`}
                                    onUploadSuccess={(newUrl: string) =>
                                        handleUploadSuccess(newUrl, "image_url")
                                    }
                                    className="m-0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 mt-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    Лого (ляво)
                                </label>
                                <div className="h-40 rounded-lg overflow-hidden border-2 border-dashed border-muted hover:border-primary/50 transition-colors bg-muted/30">
                                    <ImageUpload
                                        aspectRatioClassName="h-40"
                                        image_url={activeLandmark.logo || ""}
                                        url={`/api/embassies/${activeLandmark.id}/upload`}
                                        deleteimage_url={`/api/embassies/${activeLandmark.id}/upload`}
                                        onUploadSuccess={(newUrl: string) =>
                                            handleUploadSuccess(newUrl, "logo")
                                        }
                                        className="m-0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    Заглавно изображение (дясно)
                                </label>
                                <div className="h-40 rounded-lg overflow-hidden border-2 border-dashed border-muted hover:border-primary/50 transition-colors bg-muted/30">
                                    <ImageUpload
                                        aspectRatioClassName="h-40"
                                        image_url={
                                            activeLandmark.right_heading_image ||
                                            ""
                                        }
                                        url={`/api/embassies/${activeLandmark.id}/upload`}
                                        deleteimage_url={`/api/embassies/${activeLandmark.id}/upload`}
                                        onUploadSuccess={(newUrl: string) =>
                                            handleUploadSuccess(
                                                newUrl,
                                                "right_heading_image",
                                            )
                                        }
                                        className="m-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={goToPrev}
                                size={"xl"}
                                disabled={currentIndex === 0}
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={goToNext}
                                size={"xl"}
                                disabled={
                                    currentIndex === allEmbassies.length - 1
                                }
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() =>
                                    router.push(
                                        `/admin/embassies/${activeLandmark.id}`,
                                    )
                                }
                                size={"xl"}
                            >
                                Пълен редактор
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const columns = (
    allEmbassies: EmbassyWithCountry[],
): ColumnDef<EmbassyWithCountry>[] => [
    createDragHandleColumn<EmbassyWithCountry>(),
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
        header: "Изображение",
        cell: ({ row }) => (
            <ImageCell
                currentEmbassy={row.original}
                allEmbassies={allEmbassies}
            />
        ),
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
                href={`/admin/embassies/${row.original.id}`}
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
                href={`/admin/embassies?country=${row.original.country?.slug}`}
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
            const embassy = row.original;
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    const res = await axios.delete(
                        `/api/embassies/${embassy.id}`,
                    );

                    if (res.data.success) {
                        router.refresh();
                        toast.success(
                            "Това посолство беше успешно премахнато!",
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
                        {embassy.country?.slug && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() =>
                                        router.push(
                                            `/${embassy.country?.slug}/embassies/${embassy.slug}`,
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
                                router.push(`/admin/embassies/${embassy.id}`)
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