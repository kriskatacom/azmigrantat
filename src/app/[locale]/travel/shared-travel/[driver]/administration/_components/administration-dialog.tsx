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
import { Driver } from "@/lib/services/driver-service";
import { TooltipButton } from "@/components/tooltip-button";
import Tabs from "@/app/[locale]/travel/shared-travel/[driver]/administration/_components/tabs";
import TabContent from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/tab-content";
import { useRouter } from "next/navigation";

type AdministrationDialogProps = {
    driver: Driver;
};

export default function AdministrationDialog({
    driver,
}: AdministrationDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(!open);
        router.refresh();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogTrigger asChild>
                    <div className="mt-2 md:mt-5 flex justify-center">
                        <Button size={"xl"}>
                            <FaPen />
                            <span>Администрация</span>
                        </Button>
                    </div>
                </DialogTrigger>
                <DialogContent className="w-full min-h-screen max-h-screen lg:min-h-[80vh] lg:max-h-[80vh] max-w-3xl flex flex-col overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="uppercase text-xl md:text-2xl font-semibold border-b p-2 md:p-5">
                            Управление на профила
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col">
                        <Tabs />
                        <TabContent driver={driver} />
                    </div>

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
