"use client";

import { Button } from "@/components/ui/button";
import { MdPunchClock } from "react-icons/md";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Embassy } from "@/lib/types";

type Props = {
    embassy: Embassy;
};

export default function WorkingTime({ embassy }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <MdPunchClock className="text-xl md:text-4xl" />
                    <span>Работно време</span>
                </h2>
            </div>

            {(embassy.working_time && (
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="px-2 md:px-5 md:mt-5">
                            <Button className="bg-website-dark hover:bg-website-menu-item max-sm:text-xs max-md:w-full">
                                Показване
                            </Button>
                        </div>
                    </DialogTrigger>

                    <DialogContent className="p-5 max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-left md:text-center text-xl font-semibold">
                                Работно време
                            </DialogTitle>
                        </DialogHeader>

                        <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                                __html: embassy.working_time as string,
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )) || (
                <div className="text-muted-foreground p-5">
                    Не е посочено работно време
                </div>
            )}

            <div className="relative max-sm:text-xs p-2 md:p-5 max-h-10 overflow-hidden">
                <div
                    dangerouslySetInnerHTML={{
                        __html: embassy.working_time as string,
                    }}
                />

                <div className="pointer-events-none absolute left-0 bottom-0 w-full h-10 md:h-20 bg-linear-to-t from-white to-transparent z-10" />
            </div>
        </section>
    );
}