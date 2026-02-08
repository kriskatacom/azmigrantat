import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DescriptionDialogProps {
    title?: string;
    description: string;
    triggerText?: string;
}

export function DescriptionDialog({
    title = "Описание",
    description,
    triggerText = "Научете повече за нас",
}: DescriptionDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"default"} size={"xl"}>
                    {triggerText}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div
                    className="text-editor max-h-[60vh] overflow-y-auto text-justify"
                    dangerouslySetInnerHTML={{ __html: description }}
                />
            </DialogContent>
        </Dialog>
    );
}
