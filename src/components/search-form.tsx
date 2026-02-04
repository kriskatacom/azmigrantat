"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";

type SearchFormProps = {
    onSearch: (query: string) => void;
    placeholder?: string;
    buttonText?: string;
};

export const SearchForm: React.FC<SearchFormProps> = ({
    onSearch,
    placeholder = "Търсене...",
    buttonText = "Търсене",
}) => {
    const [query, setQuery] = useState("");

    // Старият submit handler остава за бутона
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query.trim());
    };

    // Нов handler за input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value.trim()); // търси при всяка промяна
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex w-full gap-2 max-w-2xl mx-auto text-lg"
        >
            <Input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder={placeholder}
                className="flex-1 py-2 px-4 rounded-l-md bg-white border-2 border-website-blue focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {buttonText && (
                <Button
                    type="submit"
                    className="border-2 border-website-blue"
                    variant="outline"
                    size="xl"
                >
                    {buttonText}
                </Button>
            )}
        </form>
    );
};