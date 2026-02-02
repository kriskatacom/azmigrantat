"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search-form";
import { CardEntity, CardItem } from "@/components/card-item";
import { cn } from "@/lib/utils";

type GridColumns = {
	base?: number
	sm?: number
	md?: number
	lg?: number
	xl?: number
	xxl?: number
}

type CardGridProps = {
	items: CardEntity[];
	searchPlaceholder?: string;
	buttonText?: string;
	hrefPrefix?: string;
	id: string;
	isWithSearch?: boolean;
	initialVisible?: number;
	loadMoreStep?: number;
	variant?: "standart" | "modern";
	columns?: GridColumns;
};

export const CardGrid: React.FC<CardGridProps> = ({
	items,
	searchPlaceholder = "Търсене на държави...",
	buttonText = "Търсене",
	hrefPrefix,
	id,
	isWithSearch = false,
	initialVisible = 8,
	loadMoreStep = 4,
	variant = "standart",
	columns = {
		base: 1,
		sm: 2,
		lg: 3,
		xl: 4,
		xxl: 5,
	}
}) => {
	const [visibleCount, setVisibleCount] = useState(initialVisible);

	const handleLoadMore = () => {
		setVisibleCount((prev) => Math.min(prev + loadMoreStep, items.length));
	};

	const handleSearch = (query: string) => {
		console.log("Търсене на:", query);
	};

	const [cols, setCols] = useState(columns.base)

	const getColumns = () => {
		if (typeof window === "undefined") return columns.base

		const w = window.innerWidth;
		if (w >= 1536 && columns.xxl) return columns.xxl;
		if (w >= 1280 && columns.xl) return columns.xl;
		if (w >= 1024 && columns.lg) return columns.lg;
		if (w >= 768 && columns.md) return columns.md;
		if (w >= 640 && columns.sm) return columns.sm;

		return columns.base
	}

	useEffect(() => {
		const update = () => setCols(getColumns())
		update()
		window.addEventListener("resize", update)
		return () => window.removeEventListener("resize", update)
	}, [])

	const visibleItems = items.slice(0, visibleCount);

	return (
		<section id={id} className="p-5">
			{isWithSearch && (
				<SearchForm
					onSearch={handleSearch}
					placeholder={searchPlaceholder}
					buttonText={buttonText}
				/>
			)}

			<ul
				className={cn(isWithSearch && "mt-5", "card-grid")}
				style={{
					gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
				}}
			>
				{visibleItems.map((item, index) => {
					const isNew = index >= visibleCount - loadMoreStep;
					const delay = isNew ? (index - (visibleCount - loadMoreStep)) * 150 : 0;

					return (
						<li
							key={index}
							className="animate-fade-in-up"
							style={{ animationDelay: `${delay}ms` }}
						>
							<CardItem item={item} hrefPrefix={hrefPrefix} variant={variant} />
						</li>
					);
				})}
			</ul>

			{visibleCount < items.length && (
				<div className="mt-6 flex justify-center">
					<Button onClick={handleLoadMore} variant={"primary"} size={"xl"}>Зареждане на още</Button>
				</div>
			)}
		</section>
	);
};