"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FaSave, FaTimes } from "react-icons/fa";
import { Loader2 } from "lucide-react";

type Props = {
    imageUrl?: string;
    url: string;
    deleteImageUrl?: string;
    onUploadSuccess?: Function;
    onDeleteSuccess?: Function;
};

export default function ImageUpload(props: Props) {
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(
        props.imageUrl || null
    );
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [isShow, setIsShow] = useState(!props.imageUrl);

    useEffect(() => {
        if (imageUrl) setImageLoading(true);
    }, [imageUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        setProgress(0);
        setImageUrl(null);
        setImageLoading(true);
    };

    const upload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        try {
            setLoading(true);
            setProgress(0);

            const res = await axios.post(props.url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const percent = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setProgress(percent);
                },
            });

            setImageUrl(res.data.url);
            setIsShow(false);
            props.onUploadSuccess && props.onUploadSuccess();
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setLoading(false);
        }
    };

    const removeImage = async () => {
        setLoading(true);

        try {
            const res = await axios.delete(props.deleteImageUrl ?? props.url);
            if (res.data.success) {
                console.log("Снимката е изтрита успешно!");
                props.onDeleteSuccess && props.onDeleteSuccess();
            }
        } catch (err) {
            console.error("Грешка при изтриване на снимката", err);
        }

        setImageUrl(null);
        setFile(null);
        setProgress(0);
        setIsShow(true);
        setLoading(false);
    };

    return (
        <div className="relative max-w-sm m-5 rounded-md space-y-5 duration-300">
            {/* Progress Bar */}
            {progress > 0 && isShow && !imageUrl && (
                <div className="w-full h-3 rounded overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}

            {/* Uploaded Image */}
            {imageUrl && (
                <div className="relative w-full h-80 rounded-lg overflow-hidden border">
                    {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="h-8 w-8 animate-spin rounded-full border-4 border-t-blue-500" />
                        </div>
                    )}

                    <Image
                        src={imageUrl}
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
                        {loading ? <Loader2 className="repeat-infinite animate-spin" /> : <FaSave />}
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