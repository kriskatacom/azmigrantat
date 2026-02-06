"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { Label } from "./ui/label";

export type RelationItem = {
    id: number | string;
    label: string;
};

type RelationFormProps<T extends RelationItem> = {
    items: T[];
    value: T["id"] | null;
    onChange: (value: T["id"]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    label?: boolean;
};

export function RelationForm<T extends RelationItem>({
    items,
    value,
    onChange,
    placeholder = "Изберете опция",
    searchPlaceholder = "Търсене...",
    emptyText = "Няма намерени резултати",
    disabled = false,
    label = true,
}: RelationFormProps<T>) {
    const [open, setOpen] = React.useState(false);

    const selectedItem = items.find((item) => item.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="space-y-2">
                    {label && <Label>{placeholder}</Label>}
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        size="xl"
                        aria-expanded={open}
                        className={cn(
                            !selectedItem ? "text-muted-foreground" : "",
                            "min-w-xs flex justify-between text-lg font-normal",
                        )}
                        disabled={disabled}
                    >
                        {selectedItem ? selectedItem.label : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </div>
            </PopoverTrigger>

            <PopoverContent className="max-h-100 h-fit overflow-y-auto min-w-xs p-0">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                        {items.map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.label}
                                onSelect={() => {
                                    onChange(item.id);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === item.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                    )}
                                />
                                {item.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
