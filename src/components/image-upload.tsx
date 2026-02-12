"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FaSave, FaTimes } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdditionalFormData = {
    name: string;
    value: string;
};

type Props = {
    image_url?: string;
    url: string;
    deleteimage_url?: string;
    onUploadSuccess?: Function;
    onDeleteSuccess?: Function;
    additionalFormData?: AdditionalFormData[];
    className?: string;
};

export default function ImageUpload({
    image_url,
    url,
    deleteimage_url,
    onUploadSuccess,
    onDeleteSuccess,
    additionalFormData,
    className = "mx-5"
}: Props) {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [image, setImage] = useState<string | null>(
        image_url || null,
    );
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [isShow, setIsShow] = useState(!image_url);

    useEffect(() => {
        if (image) setImageLoading(true);
    }, [image]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        setProgress(0);
        setImage(null);
        setImageLoading(true);
    };

    const upload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        if (additionalFormData && additionalFormData.length > 0) {
            additionalFormData.forEach((item) => {
                formData.append(item.name, item.value);
            });
        }

        try {
            setLoading(true);
            setProgress(0);

            const res = await axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const percent = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total,
                    );
                    setProgress(percent);
                },
            });

            setImage(res.data.url);
            setIsShow(false);
            onUploadSuccess && onUploadSuccess();
            router.refresh();
        } catch (error) {
            console.error("Upload error:", error);
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
            const res = await axios.delete(deleteimage_url ?? url, {
                data: dataToSend,
            });
            if (res.data.success) {
                console.log("Снимката е изтрита успешно!");
                onDeleteSuccess && onDeleteSuccess();
            }
        } catch (err) {
            console.error("Грешка при изтриване на снимката", err);
        }

        setImage(null);
        setFile(null);
        setProgress(0);
        setIsShow(true);
        setLoading(false);
    };

    return (
        <div
            className={cn(
                "relative max-w-sm rounded-md space-y-5 duration-300",
                className,
            )}
        >
            {/* Progress Bar */}
            {progress > 0 && isShow && !image && (
                <div className="w-full h-3 rounded overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}

            {/* Uploaded Image */}
            {image && (
                <div className="relative w-full h-80 rounded-lg overflow-hidden border">
                    {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="h-8 w-8 animate-spin rounded-full border-4 border-t-blue-500" />
                        </div>
                    )}

                    <Image
                        src={image}
                        alt="Uploaded"
                        fill
                        className={`w-full h-full object-cover transition-opacity duration-500 ${
                            imageLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                        unoptimized
                    />

                    {/* Remove Button */}
                    <Button
                        variant={"secondary"}
                        size={"xl"}
                        onClick={removeImage}
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
            )}

            {/* File Select + Upload */}
            {isShow && (
                <>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-80 cursor-pointer hover:border-blue-500 transition-colors">
                        <span className="text-muted-foreground text-lg px-5 text-center">
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

                    <Button
                        onClick={upload}
                        variant={"secondary"}
                        size={"xl"}
                        disabled={!file || loading}
                    >
                        {loading ? (
                            <Loader2 className="repeat-infinite animate-spin" />
                        ) : (
                            <FaSave />
                        )}
                        <span>
                            {loading
                                ? "Качване..."
                                : "Качване на изображението"}
                        </span>
                    </Button>
                </>
            )}
        </div>
    );
}
