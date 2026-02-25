"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Driver } from "@/lib/services/driver-service";

type DescriptionProps = {
    driver: Driver;
};

export function Description({ driver }: DescriptionProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="overflow-hidden rounded-md border shadow-sm">
            <h2 className="text-white bg-website-dark text-xl lg:text-2xl font-semibold p-3 md:p-5">
                За шофьора
            </h2>

            <div className="p-2 md:p-5">
                <div className="text-sm md:text-base line-clamp-3">
                    {driver.description}
                </div>

                <div className="mt-2 md:mt-5">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <button className="text-white bg-website-dark hover:bg-website-menu-item text-sm md:text-base rounded-md py-2 px-4 md:py-3 md:px-7 block max-md:w-full cursor-pointer">
                                Повече информация
                            </button>
                        </DialogTrigger>

                        <DialogContent className="w-full max-w-3xl">
                            <DialogHeader>
                                <DialogTitle className="uppercase text-xl md:text-2xl font-semibold border-b p-2 md:p-5">
                                    За шофьора
                                </DialogTitle>
                            </DialogHeader>
                            <DialogDescription className="text-sm md:text-base px-2 md:px-5">
                                {driver.description}
                            </DialogDescription>
                            <DialogFooter className="border-t p-2 md:p-5">
                                <DialogClose asChild>
                                    <Button size="lg">
                                        <FaTimes className="mr-2" />
                                        Затваряне
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}