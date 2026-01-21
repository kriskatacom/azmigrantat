"use client"

import React, { useState } from "react"
import { Button } from "./ui/button"

type SearchFormProps = {
    onSearch: (query: string) => void
    placeholder?: string
    buttonText?: string
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, placeholder = "Търсене...", buttonText = "Търсене" }) => {
    const [query, setQuery] = useState("")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        onSearch(query.trim())
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-2xl mx-auto text-lg">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 py-2 px-4 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            
            <Button type="submit" variant={"primary"} size={"xl"}>{buttonText}</Button>
        </form>
    )
}
