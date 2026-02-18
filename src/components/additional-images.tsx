"use client";

import { useState, useRef, DragEvent } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { FaSave, FaTimes } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { CircleProgress } from "@/components/circle-progress";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";

type Props = {
    image_urls?: string[];
    url: string;
    isWithBaseName?: boolean;
    onUploadSuccess?: (urls: string[]) => void;
    onDeleteSuccess?: (urls: string[]) => void;
};

export default function ModernImageUpload({
    image_urls = [],
    url,
    isWithBaseName,
    onUploadSuccess,
    onDeleteSuccess,
}: Props) {
    const [images, setImages] = useState<string[]>(image_urls);
    const [files, setFiles] = useState<File[]>([]);
    const [progresses, setProgresses] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState<boolean[]>(
        image_urls.map(() => true),
    );
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 📁 Избор на файлове
    const handleFiles = (selectedFiles: File[]) => {
        if (!selectedFiles.length) return;
        setFiles((prev) => [...prev, ...selectedFiles]);
        setProgresses((prev) => [...prev, ...selectedFiles.map(() => 0)]);
        setImageLoading((prev) => [...prev, ...selectedFiles.map(() => true)]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        handleFiles(selected);
    };

    // 🖱 Drag & Drop handlers
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
        setLoading(true);
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
                    setProgresses(files.map(() => percent));
                },
            });

            const uploaded: string[] = res.data.urls;
            setImages((prev) => [...prev, ...uploaded]);
            onUploadSuccess?.([...images, ...uploaded]);
            setFiles([]);
            setProgresses([]);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setLoading(false);
        }
    };

    // ❌ Remove image
    const removeImage = async (imgUrl: string, idx: number) => {
        setLoading(true);
        try {
            await axios.delete(`${url}?image_url=${encodeURIComponent(imgUrl)}`);
            const updated = images.filter((i) => i !== imgUrl);
            setImages(updated);
            setImageLoading((prev) => prev.filter((_, i) => i !== idx));
            onDeleteSuccess?.(updated);
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 px-5">
            {/* Image gallery */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {images.map((imgUrl, idx) => (
                    <div
                        key={idx}
                        className="relative w-full h-64 rounded-lg overflow-hidden shadow-md group"
                    >
                        {imageLoading[idx] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-accent z-10">
                                <Loader2 className="animate-spin w-8 h-8 text-primary" />
                            </div>
                        )}

                        <Image
                            src={imgUrl}
                            alt={`Image ${idx}`}
                            fill
                            className={cn(
                                "object-cover transition-opacity duration-500",
                                imageLoading[idx] ? "opacity-0" : "opacity-100",
                            )}
                            onLoad={() =>
                                setImageLoading((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = false;
                                    return copy;
                                })
                            }
                            unoptimized
                        />

                        {/* Delete overlay */}
                        <Button
                            variant={"secondary"}
                            size={"lg"}
                            onClick={() => removeImage(imgUrl, idx)}
                            disabled={loading}
                            className="absolute top-5 right-5"
                            title="Премахване на снимката"
                        >
                            {loading ? (
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

                {/* Circular progress */}
                {progresses.map((p, idx) => (
                    <div
                        key={`progress-${idx}`}
                        className="relative w-full h-64 flex items-center justify-center rounded-lg bg-accent"
                    >
                        <CircleProgress value={p} />

                        {/* Percentage label */}
                        <span className="absolute text-sm font-medium text-foreground">
                            {p}%
                        </span>
                    </div>
                ))}
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
                disabled={loading || files.length === 0}
                variant={"secondary"}
                size="lg"
            >
                {loading ? (
                    <Loader2 className="repeat-infinite animate-spin" />
                ) : (
                    <FaSave />
                )}
                <span>
                    {loading ? "Качване..." : "Качване на изображенията"}
                </span>
            </Button>
        </div>
    );
}
