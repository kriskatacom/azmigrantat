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

import { useGalleryDialogLandmarkStore } from "@/app/[locale]/admin/landmarks/_stores/gallery-dialog-store";
import { getLandmarkByIdAction } from "@/app/[locale]/admin/landmarks/_actions";
import { Landmark } from "@/lib/types";

type GalleryDialogProps = {
    allLandmarkIds: number[];
};

export default function GalleryDialog({ allLandmarkIds }: GalleryDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentLandmark, setCurrentLandmark] = useState<Landmark | null>(
        null,
    );

    const { isOpen, activeId, onClose, allIds, setActiveId, setAllIds } =
        useGalleryDialogLandmarkStore();

    const currentIndex = allIds?.indexOf(activeId!) ?? -1;

    const fetchLandmark = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const response = await getLandmarkByIdAction(id);
            if (response.data) {
                setCurrentLandmark(response.data);
            }
        } catch (error) {
            console.error("Error fetching landmark:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeId && isOpen) {
            fetchLandmark(activeId);
        }
        setAllIds(allLandmarkIds);
    }, [activeId, isOpen, fetchLandmark, allLandmarkIds]);

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
        if (activeId) fetchLandmark(activeId);
    };

    const handleClose = () => {
        onClose();
        setCurrentLandmark(null);
        router.refresh();
    }

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
                    Галерия на забележителността
                </DialogTitle>
                {loading && !currentLandmark ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : currentLandmark ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                                <div>
                                    <span>{currentLandmark.name}</span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {currentIndex + 1} / {allIds.length}
                                    </span>
                                </div>
                            </DialogTitle>
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
                                            currentLandmark.image_url || ""
                                        }
                                        url={`/api/landmarks/${currentLandmark.id}/upload`}
                                        deleteimage_url={`/api/landmarks/${currentLandmark.id}/upload`}
                                        onUploadSuccess={handleUploadSuccess}
                                        className="m-0"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="text-lg font-bold uppercase text-muted-foreground ml-1">
                                    Галерия
                                </label>
                                <AdditionalImages
                                    key={`gallery-${currentLandmark.id}`}
                                    image_urls={
                                        currentLandmark.additional_images
                                            ? JSON.parse(
                                                  currentLandmark.additional_images,
                                              ) || []
                                            : []
                                    }
                                    url={`/api/landmarks/${currentLandmark.id}/multiple-upload`}
                                    containerClass="space-y-4 pt-2"
                                    galleryGridClass="grid grid-cols-1 md:grid-cols-2 gap-4"
                                />
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
                                        `/admin/landmarks/${currentLandmark.id}`,
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
