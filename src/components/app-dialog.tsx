import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { ReactNode } from "react";

const dialogSizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
} as const;

type DialogSize = keyof typeof dialogSizes;

interface AppDialogProps {
    trigger: ReactNode;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: DialogSize;
}

export function AppDialog({
    trigger,
    title,
    children,
    footer,
    size = "lg",
}: AppDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className={`${dialogSizes[size]} p-0`}>
                {title && (
                    <DialogHeader className="p-5 border-b">
                        <DialogTitle className="text-2xl font-semibold">
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                )}

                <div className="max-h-[60vh] overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <DialogFooter className="p-5 border-t">
                        <DialogClose asChild>{footer}</DialogClose>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}