"use client";

import { useState, useRef, DragEvent } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { FaSave, FaTimes } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { CircleProgress } from "@/components/circle-progress";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import AppImage from "./AppImage";

type Props = {
    image_urls?: string[];
    url: string;
    isWithBaseName?: boolean;
    galleryGridClass?: string;
    containerClass?: string;
    onUploadSuccess?: (urls: string[]) => void;
    onDeleteSuccess?: (urls: string[]) => void;
};

export default function ModernImageUpload({
    image_urls = [],
    url,
    isWithBaseName,
    galleryGridClass = "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
    containerClass = "space-y-5 px-5",
    onUploadSuccess,
    onDeleteSuccess,
}: Props) {
    const [images, setImages] = useState<string[]>(image_urls);
    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // 📁 Добавяне на файлове
    const handleFiles = (selectedFiles: File[]) => {
        if (!selectedFiles.length) return;
        setFiles((prev) => [...prev, ...selectedFiles]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        handleFiles(selected);
    };

    // 🖱 Drag & Drop
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        handleFiles(droppedFiles);
    };

    // ☁️ Upload
    const upload = async () => {
        if (!files.length) return;

        setIsUploading(true);
        setProgress(0);

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        if (isWithBaseName) {
            formData.append("with_base_name", "yes");
        }

        try {
            const res = await axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    const percent = Math.round(
                        (event.loaded * 100) / event.total,
                    );
                    setProgress(percent);
                },
            });

            const uploaded: string[] = res.data.urls;

            setImages((prev) => {
                const updated = [...prev, ...uploaded];
                onUploadSuccess?.(updated);
                return updated;
            });

            setFiles([]);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    // ❌ Remove image
    const removeImage = async (imgUrl: string) => {
        setDeletingUrl(imgUrl);

        try {
            await axios.delete(
                `${url}?image_url=${encodeURIComponent(imgUrl)}`,
            );

            setImages((prev) => {
                const updated = prev.filter((i) => i !== imgUrl);
                onDeleteSuccess?.(updated);
                return updated;
            });
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setDeletingUrl(null);
        }
    };

    const isSingleImage = images.length === 1 && !isUploading;

    return (
        <div className={containerClass}>
            <div
                className={cn(
                    galleryGridClass,
                    isSingleImage &&
                        "grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1",
                )}
            >
                {images.map((imgUrl, idx) => (
                    <div
                        key={imgUrl}
                        className={cn(
                            "relative w-full rounded-lg overflow-hidden shadow-md group transition-all duration-300",
                            isSingleImage ? "h-125" : "h-64",
                        )}
                    >
                        <AppImage
                            src={imgUrl}
                            alt={`Image ${idx}`}
                            fill
                            className="object-cover w-full h-full"
                        />

                        <Button
                            variant="default"
                            size="lg"
                            onClick={() => removeImage(imgUrl)}
                            disabled={!!deletingUrl || isUploading}
                            className="absolute top-2 right-2"
                            title="Премахване на снимката"
                        >
                            {deletingUrl === imgUrl ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <FaTimes />
                            )}
                        </Button>
                    </div>
                ))}

                {images.length === 0 && files.length === 0 && (
                    <div className="text-muted-foreground">
                        Няма добавени изображения в галерията
                    </div>
                )}

                {/* Upload progress preview */}
                {isUploading && (
                    <div className="relative w-full h-64 flex items-center justify-center rounded-lg bg-accent">
                        <CircleProgress value={progress} />
                        <span className="absolute text-sm font-medium text-foreground">
                            {progress}%
                        </span>
                    </div>
                )}
            </div>

            {/* Drag & Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    "flex flex-col items-center justify-center h-40 gap-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none",
                    isDragging
                        ? "border-primary bg-accent"
                        : "border-muted hover:border-primary/50",
                )}
            >
                <span className="text-muted-foreground text-lg text-center px-4">
                    {files.length
                        ? files.map((f) => f.name).join(", ")
                        : "Изберете или пуснете изображения тук"}
                </span>

                <span className="text-sm text-muted-foreground">
                    JPG, PNG, WEBP, GIF
                </span>

                <input
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    multiple
                    className="hidden"
                    ref={inputRef}
                    onChange={handleFileChange}
                />
            </div>

            {/* Upload button */}
            <Button
                onClick={upload}
                disabled={isUploading || files.length === 0}
                variant="secondary"
                size="lg"
                className="gap-2"
            >
                {isUploading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <FaSave />
                )}
                <span>
                    {isUploading ? "Качване..." : "Качване на изображенията"}
                </span>
            </Button>
        </div>
    );
}
