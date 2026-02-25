"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search-form";
import { CardEntity, CardItem } from "@/components/card-item";
import { cn } from "@/lib/utils";
import { Alert } from "./alert";

export type GridColumns = {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
};

type CardGridProps = {
    items: any[];
    searchPlaceholder?: string;
    buttonText?: string;
    hrefPrefix?: string;
    noItemsMessage?: string;
    id: string;
    isWithSearch?: boolean;
    initialVisible?: number;
    loadMoreStep?: number;
    variant?: "standart" | "modern";
    columns?: GridColumns;
    height?: GridColumns;
};

export const CardGrid: React.FC<CardGridProps> = ({
    items,
    searchPlaceholder = "Търсене на държави...",
    buttonText = "Търсене",
    hrefPrefix,
    noItemsMessage,
    id,
    isWithSearch = false,
    initialVisible = 8,
    loadMoreStep = 4,
    variant = "standart",
    columns = {
        base: 4,
        sm: 2,
        lg: 3,
        xl: 4,
        xxl: 5,
    },
    height = {
        base: 240,
        sm: 240,
        lg: 250,
        xl: 260,
        xxl: 260,
    },
}) => {
    const [filteredItems, setFilteredItems] = useState(items);
    const [visibleCount, setVisibleCount] = useState(initialVisible);

    const handleLoadMore = () => {
        setVisibleCount((prev) => Math.min(prev + loadMoreStep, items.length));
    };

    const handleSearch = (query: string) => {
        setFilteredItems(
            items.filter(
                (item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.slug.toLowerCase().includes(query.toLowerCase()),
            ),
        );
    };

    const [cols, setCols] = useState(columns.base);

    const getColumns = () => {
        if (typeof window === "undefined") return columns.base;

        const w = window.innerWidth;
        if (w >= 1536 && columns.xxl) return columns.xxl;
        if (w >= 1280 && columns.xl) return columns.xl;
        if (w >= 1024 && columns.lg) return columns.lg;
        if (w >= 768 && columns.md) return columns.md;
        if (w >= 640 && columns.sm) return columns.sm;

        return columns.base;
    };

    useEffect(() => {
        const update = () => setCols(getColumns());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return (
        <section id={id} className="mt-2">
            {isWithSearch && (
                <SearchForm
                    onSearch={handleSearch}
                    placeholder={searchPlaceholder}
                    buttonText={buttonText}
                />
            )}

            {filteredItems.length === 0 ? (
                <div className="max-w-md mx-auto my-5">
                    <Alert title="Няма намерени данни!">{noItemsMessage}</Alert>
                </div>
            ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-3 px-5">
                    {filteredItems.slice(0, visibleCount).map((item, index) => {
                        const isNew = index >= visibleCount - loadMoreStep;
                        const delay = isNew
                            ? (index - (visibleCount - loadMoreStep)) * 150
                            : 0;

                        return (
                            <li
                                key={item.slug || index}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${delay}ms` }}
                            >
                                <CardItem
                                    item={item}
                                    hrefPrefix={hrefPrefix}
                                    variant={variant}
                                    height={height}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}

            {visibleCount < filteredItems.length && (
                <div className="my-5 flex justify-center">
                    <Button
                        onClick={handleLoadMore}
                        size="xl"
                    >
                        Зареждане на още
                    </Button>
                </div>
            )}
        </section>
    );
};
