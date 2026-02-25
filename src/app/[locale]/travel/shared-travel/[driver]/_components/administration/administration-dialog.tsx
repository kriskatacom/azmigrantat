"use client";

import { useState } from "react";
import { FaPen, FaTimes } from "react-icons/fa";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DialogContentForm from "@/app/[locale]/travel/shared-travel/[driver]/_components/administration/dialog-content-form";
import { Driver } from "@/lib/services/driver-service";
import { TooltipButton } from "@/components/tooltip-button";

type AdministrationDialogProps = {
    driver: Driver;
};

export default function AdministrationDialog({
    driver,
}: AdministrationDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <div className="mt-2 md:mt-5 flex justify-center">
                        <Button size={"xl"}>
                            <FaPen />
                            <span>Администрация</span>
                        </Button>
                    </div>
                </DialogTrigger>
                <DialogContent className="w-full max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="uppercase text-xl md:text-2xl font-semibold border-b p-2 md:p-5">
                            Управление на профила
                        </DialogTitle>
                    </DialogHeader>
                    <DialogContentForm driver={driver} />
                    <DialogFooter className="border-t p-2 md:p-5">
                        <DialogClose asChild>
                            <TooltipButton tooltipText="Затваряне на прозореца">
                                <FaTimes />
                                Затваряне
                            </TooltipButton>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
