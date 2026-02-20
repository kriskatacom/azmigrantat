"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { FaTimes } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AppImage from "./AppImage";
import { useRouter } from "next/navigation";

export type AdditionalFormData = {
    name: string;
    value: string;
};

type Props = {
    image_url?: string;
    url: string;
    href?: string;
    deleteimage_url?: string;
    onUploadSuccess?: (newUrl: string) => void;
    onDeleteSuccess?: Function;
    additionalFormData?: AdditionalFormData[];
    className?: string;
    aspectRatioClassName?: string;
};

export default function ImageUpload({
    image_url,
    url,
    href,
    deleteimage_url,
    onUploadSuccess,
    onDeleteSuccess,
    additionalFormData,
    className = "mx-5",
    aspectRatioClassName = "h-80",
}: Props) {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [image, setImage] = useState<string | null>(image_url || null);
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [isShow, setIsShow] = useState(!image_url);

    useEffect(() => {
        if (image) setImageLoading(true);
    }, [image]);

    useEffect(() => {
        setImage(image_url || null);
        setIsShow(!image_url);
    }, [image_url]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        if (!selectedFile) return;

        setFile(selectedFile);
        setProgress(0);
        setImage(null);
        setImageLoading(true);

        setTimeout(() => {
            upload(selectedFile);
        }, 100);
    };

    const upload = async (fileToUpload?: File) => {
        const fileToUse = fileToUpload || file;
        if (!fileToUse) return;

        const formData = new FormData();
        formData.append("image", fileToUse);
        additionalFormData?.forEach((item) =>
            formData.append(item.name, item.value),
        );

        try {
            setLoading(true);
            setProgress(0);

            const res = await axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    setProgress(Math.round((event.loaded * 100) / event.total));
                },
            });

            const newUrl = res.data.url;
            setImage(newUrl);
            setIsShow(false);

            router.refresh();

            onUploadSuccess && onUploadSuccess(newUrl);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setLoading(false);
        }
    };

    const removeImage = async () => {
        setLoading(true);
        try {
            const dataToSend = additionalFormData?.reduce(
                (acc, field) => {
                    acc[field.name] = field.value;
                    return acc;
                },
                {} as Record<string, any>,
            );

            await axios.delete(deleteimage_url ?? url, { data: dataToSend });
            router.refresh();
            onDeleteSuccess && onDeleteSuccess();
        } catch (err) {
            console.error("Грешка при изтриване на снимката", err);
        } finally {
            setImage(null);
            setFile(null);
            setProgress(0);
            setIsShow(true);
            setLoading(false);
        }
    };

    return (
        <div
            className={cn(
                "relative rounded-md space-y-5 duration-300",
                className,
            )}
        >
            {/* Progress Bar */}
            {progress > 0 && isShow && !image && (
                <div className="w-full h-3 rounded overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Uploaded Image */}
            {image && (
                <div
                    className={cn(
                        "relative w-full rounded-lg overflow-hidden border",
                        aspectRatioClassName,
                    )}
                >
                    {href ? (
                        <Link href={href} className="block w-full h-full">
                            <AppImage
                                src={`${image}?t=${Date.now()}`}
                                alt="Uploaded"
                                fill
                                className={cn(
                                    "w-full h-full object-cover transition-opacity duration-500 hover:opacity-80",
                                    imageLoading ? "opacity-0" : "opacity-100",
                                )}
                            />
                        </Link>
                    ) : (
                        <AppImage
                            src={`${image}?t=${Date.now()}`}
                            alt="Uploaded"
                            fill
                            className={cn(
                                "w-full h-full object-cover transition-opacity duration-500",
                                imageLoading ? "opacity-0" : "opacity-100",
                            )}
                        />
                    )}

                    {deleteimage_url && (
                        <Button
                            onClick={removeImage}
                            disabled={loading}
                            className="absolute top-2 right-2"
                            title="Премахване на снимката"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <FaTimes />
                            )}
                        </Button>
                    )}
                </div>
            )}

            {/* File Select + Upload */}
            {isShow && (
                <>
                    <label
                        className={cn(
                            "flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            aspectRatioClassName,
                        )}
                    >
                        <span className="text-muted-foreground text-center text-wrap">
                            {file
                                ? file.name
                                : "Изберете изображение или го пуснете в тази секция."}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>
                </>
            )}
        </div>
    );
}