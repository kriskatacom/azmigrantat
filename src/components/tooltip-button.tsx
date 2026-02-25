"use client";

import { ReactNode } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type AiTooltipButtonProps = {
    tooltipText: string;
    buttonText?: string;
    children?: ReactNode;
} & ButtonProps;

export function TooltipButton({
    tooltipText,
    buttonText,
    children,
    ...props
}: AiTooltipButtonProps) {
    return (
        <TooltipProvider>
            <Tooltip defaultOpen={false}>
                <TooltipTrigger asChild>
                    <Button
                        className="text-base flex items-center gap-2"
                        size="lg"
                        {...props}
                    >
                        {children ?? buttonText}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                    {tooltipText}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}