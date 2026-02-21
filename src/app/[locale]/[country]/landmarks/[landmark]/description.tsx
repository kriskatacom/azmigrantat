"use client";

import { Landmark } from "@/lib/types";
import { LiaLandmarkSolid } from "react-icons/lia";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
    landmark: Landmark;
};

export default function Description({ landmark }: Props) {
    const hasContent = Boolean(
        landmark.content && landmark.content.trim().length > 0,
    );

    return (
        <section className="bg-white shadow-sm rounded-sm overflow-hidden">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <LiaLandmarkSolid className="text-xl md:text-4xl" />
                    <span>За забележителността</span>
                </h2>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <div className="px-2 md:px-5 md:mt-5">
                        <Button className="bg-website-dark hover:bg-website-menu-item max-sm:text-xs max-md:w-full">
                            Повече информация
                        </Button>
                    </div>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader className="px-5 mt-5">
                        <DialogTitle className="text-left md:text-center text-xl font-semibold">
                            {landmark.name}
                        </DialogTitle>
                    </DialogHeader>

                    {hasContent ? (
                        <div
                            className="prose prose-sm max-w-none text-editor"
                            dangerouslySetInnerHTML={{
                                __html: landmark.content as string,
                            }}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            Няма добавена допълнителна информация за тази
                            забележителност.
                        </p>
                    )}
                </DialogContent>
            </Dialog>

            <div className="relative max-sm:text-xs p-2 md:p-5 max-h-20 md:max-h-100 overflow-hidden">
                {hasContent ? (
                    <>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: landmark.content as string,
                            }}
                        />
                        <div className="pointer-events-none absolute left-0 bottom-0 w-full h-20 md:h-20 bg-linear-to-t from-white to-transparent z-10" />
                    </>
                ) : (
                    <p className="text-muted-foreground italic">
                        Все още няма описание за тази забележителност.
                    </p>
                )}
            </div>
        </section>
    );
}