"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Resolver, useForm } from "react-hook-form";
import { MapPin } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
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
import { CityWithCountry } from "@/app/[locale]/admin/cities/columns";
import { City } from "@/lib/types";
import { useRouter } from "next/navigation";

// ====================
// Validation Schema
// ====================

const formSchema = z.object({
    from: z.string().nullable(),
    to: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

// ====================
// Component
// ====================

type SharedTravelSearchFormProps = {
    cities: CityWithCountry[];
    cityFrom?: City | null;
    cityTo?: City | null;
};

export default function SharedTravelSearchForm({
    cities,
    cityFrom,
    cityTo,
}: SharedTravelSearchFormProps) {
    const router = useRouter();
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            from: cityFrom?.slug || null,
            to: cityTo?.slug || null,
        },
    });

    const [fromCityName, setFromCityName] = useState(
        cityFrom?.name ?? "",
    );
    const [toCityName, setToCityName] = useState(cityTo?.name ?? "");

    const [cityDialog, setCityDialog] = useState<"from" | "to" | null>(
        null,
    );

    function onSubmit(values: FormValues) {
        console.log("Search payload for URL:", values);
        router.push(`/travel/shared-travel/drivers?from=${values.from}&to=${values.to}`);
    }

    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(8);

    const filteredCities = useMemo(() => {
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
        <div className="relative -mt-15 lg:-mt-20 px-2 lg:px-0 space-y-5 lg:space-y-10">
            <div className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-5 md:p-10">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end"
                    >
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
                                            value={fromCityName} // <--- показва името
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
                                            value={toCityName} // <--- показва името
                                            readOnly
                                            onClick={() => setCityDialog("to")}
                                        />
                                    </FormControl>
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
                                                    cityDialog as "from" | "to",
                                                    city.slug ?? "",
                                                );
                                                if (cityDialog === "from")
                                                    setFromCityName(city.name ?? "");
                                                if (cityDialog === "to")
                                                    setToCityName(city.name ?? "");
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
