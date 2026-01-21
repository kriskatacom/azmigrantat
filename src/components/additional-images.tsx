"use client";

import { useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { FaTimes } from "react-icons/fa";

type Props = {
    imageUrls?: string[];
    url: string;
    deleteImageUrl?: string;
    onUploadSuccess?: (urls: string[]) => void;
    onDeleteSuccess?: (urls: string[]) => void;
};

export default function ImageUpload({
    imageUrls = [],
    url,
    onUploadSuccess,
    onDeleteSuccess,
}: Props) {
    const [files, setFiles] = useState<File[]>([]);
    const [images, setImages] = useState<string[]>(imageUrls);
    const [progresses, setProgresses] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState<boolean[]>(
        imageUrls.map(() => true)
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
        if (!selectedFiles.length) return;

        setFiles(selectedFiles);
        setProgresses(selectedFiles.map(() => 0));
        setImageLoading((prev) => [...prev, ...selectedFiles.map(() => true)]);
    };

    const upload = async () => {
        if (!files.length) return;

        setLoading(true);
        setProgresses(files.map(() => 0));

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        try {
            const res = await axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    const percent = Math.round(
                        (event.loaded * 100) / event.total
                    );
                    setProgresses(files.map(() => percent));
                },
            });

            const uploadedUrls: string[] = res.data.urls;
            setImages((prev) => [...prev, ...uploadedUrls]);
            onUploadSuccess && onUploadSuccess([...images, ...uploadedUrls]);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setFiles([]);
            setProgresses([]);
            setLoading(false);
        }
    };

    const removeImage = async (imgUrl: string, index: number) => {
        setLoading(true);
        let updated: string[] = [];

        try {
            await axios.delete(`${url}?imageUrl=${encodeURIComponent(imgUrl)}`);
            updated = images.filter((i) => i !== imgUrl);
            setImages(updated);
            setImageLoading((prev) => prev.filter((_, idx) => idx !== index));
            onDeleteSuccess && onDeleteSuccess(updated);
        } catch (err) {
            console.error("Грешка при изтриване на снимката", err);
        }

        setImages(updated);
        setImageLoading((prev) => prev.filter((_, idx) => idx !== index));
        setFiles([]);
        setProgresses([]);
        setLoading(false);
    };

    return (
        <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-5">
                {images.map((imgUrl, idx) => (
                    <div
                        key={idx}
                        className="relative h-80 rounded-lg overflow-hidden border"
                    >
                        {imageLoading[idx] && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="h-8 w-8 animate-spin rounded-full border-4 border-t-blue-500" />
                            </div>
                        )}
                        <Image
                            src={imgUrl}
                            alt="Uploaded"
                            fill
                            className={`object-cover w-full h-full transition-opacity duration-500 ${
                                imageLoading[idx] ? "opacity-0" : "opacity-100"
                            }`}
                            onLoad={() =>
                                setImageLoading((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = false;
                                    return copy;
                                })
                            }
                        />
                        {/* Remove Button */}
                        <Button
                            variant={"secondary"}
                            size={"xl"}
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

                <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed rounded cursor-pointer hover:border-blue-500">
                    <span className="text-muted-foreground text-lg text-center">
                        {files.length
                            ? files.map((f) => f.name).join(", ")
                            : "Изберете изображения или ги пуснете в тази секция."}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>

                {progresses.map((p, idx) => (
                    <div
                        key={`progress-${idx}`}
                        className="w-full h-full flex items-center justify-center px-5 rounded-lg"
                    >
                        <div className="bg-primary w-full h-2 rounded overflow-hidden z-40">
                            <div
                                className="bg-blue-500 h-full transition-all"
                                style={{ width: `${p}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {files.length > 0 && (
                <Button
                    onClick={upload}
                    disabled={loading}
                    size={"xl"}
                    className="mt-4"
                >
                    {loading
                        ? "Качване..."
                        : `Качване на ${files.length} снимки`}
                </Button>
            )}
        </>
    );
}