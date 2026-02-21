"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import ImageUpload from "@/components/image-upload";
import AdditionalImages from "@/components/additional-images";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Country, Embassy } from "@/lib/types";
import { useGalleryDialogEmbassyStore } from "../_stores/gallery-dialog-store";
import { getEmbassyByIdAction } from "../_actions";

type GalleryDialogProps = {
    allEmbassyIds: number[];
};

export default function GalleryDialog({ allEmbassyIds }: GalleryDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentEmbassy, setCurrentEmbassy] = useState<Embassy | null>(null);
    const [currentCountry, setCurrentCountry] = useState<Country | null>(null);

    const { isOpen, activeId, onClose, allIds, setActiveId, setAllIds } =
        useGalleryDialogEmbassyStore();

    const currentIndex = allIds?.indexOf(activeId!) ?? -1;

    const fetchEmbassy = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const response = await getEmbassyByIdAction(id);
            if (response.embassy) {
                setCurrentEmbassy(response.embassy);
                setCurrentCountry(response.country);
            }
        } catch (error) {
            console.error("Error fetching embassy:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeId && isOpen) {
            fetchEmbassy(activeId);
        }
        setAllIds(allEmbassyIds);
    }, [activeId, isOpen, fetchEmbassy, allEmbassyIds]);

    const goToNext = useCallback(() => {
        if (currentIndex < allIds.length - 1) {
            setActiveId(allIds[currentIndex + 1]);
        }
    }, [currentIndex, allIds, setActiveId]);

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setActiveId(allIds[currentIndex - 1]);
        }
    }, [currentIndex, allIds, setActiveId]);

    const handleUploadSuccess = () => {
        if (activeId) fetchEmbassy(activeId);
    };

    const handleClose = () => {
        onClose();
        setCurrentEmbassy(null);
        router.refresh();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                onKeyDown={(e) => {
                    if (e.key === "ArrowRight") goToNext();
                    if (e.key === "ArrowLeft") goToPrev();
                }}
                className="max-w-4xl p-5 rounded-2xl shadow-2xl bg-white border-none outline-none"
            >
                <DialogTitle className="sr-only">
                    Галерия на посолството
                </DialogTitle>
                {loading && !currentEmbassy ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : currentEmbassy ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">
                                <div className="flex items-center justify-between pr-5">
                                    <span>
                                        {currentEmbassy.heading ??
                                            currentEmbassy.name}
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {currentIndex + 1} / {allIds.length}
                                    </span>
                                </div>
                            </DialogTitle>
                            <div>
                                <strong>Държава</strong>: {currentCountry?.name || "-"}
                            </div>
                            <DialogDescription>
                                Управлявайте основното изображение и галерията.
                                Използвайте стрелките (← →) за навигация.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-2 mt-4">
                                <label className="text-lg font-bold uppercase text-muted-foreground ml-1">
                                    Предно изображение
                                </label>
                                <div className="w-full h-80 rounded-lg overflow-hidden border-2 border-dashed border-muted bg-muted/30 relative">
                                    <ImageUpload
                                        aspectRatioClassName="h-80"
                                        image_url={
                                            currentEmbassy.image_url || ""
                                        }
                                        url={`/api/embassies/${currentEmbassy.id}/upload`}
                                        deleteimage_url={`/api/embassies/${currentEmbassy.id}/upload`}
                                        onUploadSuccess={handleUploadSuccess}
                                        className="m-0"
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2 mt-4">
                                    <label className="text-lg font-bold uppercase text-muted-foreground ml-1">
                                        Знаме
                                    </label>
                                    <div className="w-full h-80 rounded-lg overflow-hidden border-2 border-dashed border-muted bg-muted/30 relative">
                                        <ImageUpload
                                            aspectRatioClassName="h-80"
                                            image_url={
                                                currentEmbassy.logo || ""
                                            }
                                            url={`/api/embassies/${currentEmbassy.id}/logo-upload`}
                                            deleteimage_url={`/api/embassies/${currentEmbassy.id}/logo-upload`}
                                            onUploadSuccess={
                                                handleUploadSuccess
                                            }
                                            className="m-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <label className="text-lg font-bold uppercase text-muted-foreground ml-1">
                                        Герб
                                    </label>
                                    <div className="w-full h-80 rounded-lg overflow-hidden border-2 border-dashed border-muted bg-muted/30 relative">
                                        <ImageUpload
                                            aspectRatioClassName="h-80"
                                            image_url={
                                                currentEmbassy.right_heading_image ||
                                                ""
                                            }
                                            url={`/api/embassies/${currentEmbassy.id}/right-heading-image-upload`}
                                            deleteimage_url={`/api/embassies/${currentEmbassy.id}/right-heading-image-upload`}
                                            onUploadSuccess={
                                                handleUploadSuccess
                                            }
                                            className="m-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={goToPrev}
                                    size={"xl"}
                                    disabled={currentIndex <= 0 || loading}
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin text-primary" />
                                    ) : (
                                        <ChevronLeft className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={goToNext}
                                    size={"xl"}
                                    disabled={
                                        currentIndex >= allIds.length - 1 ||
                                        loading
                                    }
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin text-primary" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            <Button
                                size={"xl"}
                                onClick={() =>
                                    router.push(
                                        `/admin/embassies/${currentEmbassy.id}`,
                                    )
                                }
                                className="w-full sm:w-auto"
                            >
                                Пълен редактор
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="p-10 text-center">
                        Не бяха намерени данни.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
