import { AppDialog } from "@/components/app-dialog";
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
        <AppDialog
            title={title}
            size="lg"
            trigger={
                <Button variant="default" size="xl">
                    {triggerText}
                </Button>
            }
            footer={
                <Button variant="outline" size="xl">
                    Затваряне
                </Button>
            }
        >
            <div
                className="text-editor"
                dangerouslySetInnerHTML={{ __html: description }}
            />
        </AppDialog>
    );
}
