"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
} from "lucide-react";
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
import ImageUpload from "@/components/image-upload";
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
import AdditionalImages from "@/components/additional-images";
import { useEffect, useState, useMemo } from "react";
import AppImage from "@/components/AppImage";

export type LandmarkWithCountry = Landmark & {
    country?: Country;
};

function ImageCell({
    currentLandmark,
    allLandmarks,
}: {
    currentLandmark: LandmarkWithCountry;
    allLandmarks: LandmarkWithCountry[];
}) {
    const router = useRouter();

    const initialIndex = useMemo(
        () => allLandmarks.findIndex((l) => l.id === currentLandmark.id),
        [currentLandmark.id, allLandmarks],
    );

    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setCurrentIndex(initialIndex);
        }
    };

    const activeLandmark = allLandmarks[currentIndex] || currentLandmark;

    const additionalImages = useMemo(() => {
        try {
            return activeLandmark.additional_images
                ? JSON.parse(activeLandmark.additional_images)
                : [];
        } catch (e) {
            console.error("Error parsing images:", e);
            return [];
        }
    }, [activeLandmark.additional_images]);

    const handleUploadSuccess = () => {
        toast.success("Изображението е обновено!");
    };

    const goToPrev = () =>
        currentIndex > 0 && setCurrentIndex((prev) => prev - 1);
    const goToNext = () =>
        currentIndex < allLandmarks.length - 1 &&
        setCurrentIndex((prev) => prev + 1);

    return (
        <div className="flex items-start">
            <Dialog onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <div className="group relative w-40 h-28 cursor-pointer rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all duration-300">
                        <div className="h-full w-full bg-muted">
                            <AppImage
                                src={
                                    currentLandmark.image_url ||
                                    "/placeholder.png"
                                }
                                fill
                                alt={currentLandmark.name || "Забележителност"}
                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                                Още опции
                            </span>
                        </div>
                    </div>
                </DialogTrigger>

                <DialogContent
                    onKeyDown={(e) => {
                        if (e.key === "ArrowRight") goToNext();
                        if (e.key === "ArrowLeft") goToPrev();
                    }}
                    className="max-w-4xl p-5 rounded-2xl shadow-2xl bg-white border-none"
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {activeLandmark.name}
                        </DialogTitle>
                        <DialogDescription>
                            Управлявайте основното изображение и галерията на
                            забележителността.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                                Предно изображение
                            </label>
                            <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-dashed border-muted bg-muted/30">
                                <ImageUpload
                                    aspectRatioClassName="h-96"
                                    image_url={activeLandmark.image_url || ""}
                                    url={`/api/landmarks/${activeLandmark.id}/upload`}
                                    deleteimage_url={`/api/landmarks/${activeLandmark.id}/upload`}
                                    onUploadSuccess={handleUploadSuccess}
                                    className="m-0"
                                />
                            </div>
                        </div>

                        <AdditionalImages
                            key={`gallery-${activeLandmark.id}`}
                            image_urls={additionalImages}
                            url={`/api/landmarks/${activeLandmark.id}/multiple-upload`}
                            containerClass="space-y-5 pt-5"
                            galleryGridClass="grid md:grid-cols-2 gap-5"
                        />
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
                                    currentIndex === allLandmarks.length - 1
                                }
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() =>
                                    router.push(
                                        `/admin/landmarks/${activeLandmark.id}`,
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

export const columns = (
    allLandmarks: LandmarkWithCountry[],
): ColumnDef<LandmarkWithCountry>[] => [
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
        cell: ({ row }) => (
            <ImageCell
                currentLandmark={row.original}
                allLandmarks={allLandmarks}
            />
        ),
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
                className="font-medium hover:underline"
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
                className="text-blue-600 hover:underline"
            >
                {row.original.country?.name}
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
                month: "long",
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
