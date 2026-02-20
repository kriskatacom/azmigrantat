"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";

type Identifiable = {
    id: string | number;
};

type DataTableProviderProps<T> = {
    data: T[];
    columns: any[];
    tableName?: string;
    onBulkDeleteLink?: string;
};

export default function DataTableProvider<TData extends Identifiable>({
    data,
    columns,
    tableName,
    onBulkDeleteLink,
}: DataTableProviderProps<TData>) {
    const router = useRouter();

    async function onBulkDelete(ids: Array<string | number>) {
        if (!onBulkDeleteLink) return;

        try {
            const res = await axios.post(onBulkDeleteLink, { ids });

            const { deletedCount } = res.data;

            toast.success(
                deletedCount === 1
                    ? `Беше премахнат ${deletedCount} елемент`
                    : `Бяха премахнати ${deletedCount} елемента.`,
            );

            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Възникна грешка при изтриване.");
        }
    }

    const handleReorder = async (reorderedData: TData[]) => {
        if (!tableName) return;

        try {
            const response = await fetch("/api/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableName,
                    items: reorderedData.map((item, index) => ({
                        id: item.id,
                        order: index + 1,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error();
            }

            router.refresh();

            toast.success("Редът е запазен успешно.");
        } catch (error) {
            console.error(error);
            toast.error("Грешка при запазване на реда.");
        }
    };

    return (
        <DataTable<TData>
            columns={columns}
            data={data}
            onBulkDelete={onBulkDeleteLink ? onBulkDelete : undefined}
            onReorder={tableName ? handleReorder : undefined}
        />
    );
}
