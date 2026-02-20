"use client";

import * as React from "react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { City } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import AppImage from "@/components/AppImage";
import { CityWithCountry } from "../../admin/cities/columns";

// ====================
// Validation Schema
// ====================

const formSchema = z.object({
    from: z.string().min(2, "Моля въведете поне 2 символа"),
    to: z.string().min(2, "Моля въведете поне 2 символа"),
    date: z.date("Моля изберете дата"),
});

type FormValues = z.infer<typeof formSchema>;

// ====================
// Component
// ====================

type SharedTravelSearchFormProps = {
    cities: CityWithCountry[];
};

export default function SharedTravelSearchForm({
    cities,
}: SharedTravelSearchFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            from: "",
            to: "",
        },
    });

    const [cityDialog, setCityDialog] = React.useState<"from" | "to" | null>(
        null,
    );

    function onSubmit(values: FormValues) {
        console.log("Search payload:", {
            ...values,
            date: format(values.date, "yyyy-MM-dd"),
        });
    }

    const [search, setSearch] = React.useState("");
    const [visibleCount, setVisibleCount] = React.useState(8);

    const filteredCities = React.useMemo(() => {
        if (!search.trim()) return cities;

        const query = search.toLowerCase();

        return cities.filter(
            (city) =>
                city.name?.toLowerCase().includes(query) ||
                city.slug?.toLowerCase().includes(query),
        );
    }, [cities, search]);

    const displayedCities =
        search.trim().length > 0
            ? filteredCities
            : filteredCities.slice(0, visibleCount);

    const hasMore =
        search.trim().length === 0 && visibleCount < filteredCities.length;

    return (
        <div className="relative -mt-20 lg:-mt-29 py-5 lg:py-10 px-2 lg:px-0 space-y-5 lg:space-y-10">
            <div className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-5 md:p-10">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                    >
                        {/* От къде */}
                        <FormField
                            control={form.control}
                            name="from"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>От къде</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Град на тръгване"
                                            className="h-12 cursor-pointer"
                                            value={field.value}
                                            readOnly
                                            onClick={() =>
                                                setCityDialog("from")
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* До къде */}
                        <FormField
                            control={form.control}
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>До къде</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Краен град"
                                            className="h-12 cursor-pointer"
                                            value={field.value}
                                            readOnly
                                            onClick={() => setCityDialog("to")}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Дата */}
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Дата</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "h-12 justify-start text-left text-lg font-normal",
                                                        !field.value &&
                                                            "text-muted-foreground",
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(
                                                            field.value,
                                                            "dd MMMM yyyy",
                                                            { locale: bg },
                                                        )
                                                    ) : (
                                                        <span>
                                                            Изберете дата
                                                        </span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date <
                                                    new Date(
                                                        new Date().setHours(
                                                            0,
                                                            0,
                                                            0,
                                                            0,
                                                        ),
                                                    )
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Бутон */}
                        <Button
                            type="submit"
                            className="h-12 text-lg"
                            title="Прилагане на търсенето"
                        >
                            <Search />
                            <span>Търсене</span>
                        </Button>
                    </form>
                </Form>
            </div>
            <Dialog
                open={cityDialog !== null}
                onOpenChange={() => setCityDialog(null)}
            >
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    {" "}
                    {/* p-0 за чист вид */}
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <MapPin className="text-primary h-5 w-5" />
                            {cityDialog === "from"
                                ? "Град на тръгване"
                                : "Град на пристигане"}
                        </DialogTitle>
                    </DialogHeader>
                    <Command className="rounded-none border-none">
                        <div className="bg-muted py-2">
                            <CommandInput
                                placeholder="Търсете град..."
                                className="h-11"
                                value={search}
                                onValueChange={(value) => {
                                    setSearch(value);
                                    setVisibleCount(8);
                                }}
                            />
                        </div>

                        <CommandList className="max-h-100 p-2">
                            <CommandEmpty>Няма намерени градове.</CommandEmpty>

                            <CommandGroup>
                                {displayedCities.map((city) => (
                                    <CommandItem
                                        key={city.id}
                                        value={`${city.name} ${city.slug}`}
                                        onSelect={() => {
                                            if (cityDialog) {
                                                form.setValue(
                                                    cityDialog as any,
                                                    city.name,
                                                );
                                            }
                                            setCityDialog(null);
                                            setSearch("");
                                            setVisibleCount(8);
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <Avatar className="h-12 w-12 rounded-md border border-border shadow-sm">
                                            {city.image_url ? (
                                                <AppImage
                                                    src={city.image_url}
                                                    alt={city.name!}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                    {city.name
                                                        ?.substring(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>

                                        <div className="flex flex-col flex-1">
                                            <span className="font-semibold text-sm leading-none">
                                                {city.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground mt-1">
                                                {city.country?.name}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            {hasMore && (
                                <div className="p-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() =>
                                            setVisibleCount((prev) => prev + 8)
                                        }
                                    >
                                        Покажи още
                                    </Button>
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </div>
    );
}