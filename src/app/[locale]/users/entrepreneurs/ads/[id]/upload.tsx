import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/image-upload";
import { Ad } from "@/lib/types";

type ImageUploadProps = {
    ad: Ad;
};

export default function Upload({ ad }: ImageUploadProps) {
    return (
        <div className="p-5">
            <Card className="w-full">
                <CardContent>
                    <CardTitle className="text-2xl mb-5">
                        Качване на изображение
                    </CardTitle>
                    {ad?.id && (
                        <ImageUpload
                            image_url={ad.image as string}
                            url={ad?.id ? `/api/ads/${ad.id}/upload` : ""}
                            className="mx-0"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
