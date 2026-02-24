import { Card, CardContent, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/image-upload";
import { Offer } from "@/lib/types";

type ImageUploadProps = {
    offer: Offer;
};

export default function Upload({ offer }: ImageUploadProps) {
    return (
        <div className="p-5">
            <Card className="w-full">
                <CardContent>
                    <CardTitle className="text-2xl mb-5">
                        Качване на изображение
                    </CardTitle>
                    {offer?.id && (
                        <ImageUpload
                            image_url={offer.image as string}
                            deleteimage_url={offer?.id ? `/api/offers/${offer.id}/upload` : ""}
                            url={offer?.id ? `/api/offers/${offer.id}/upload` : ""}
                            className="mx-0"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
