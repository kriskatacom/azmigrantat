"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Municipaliy } from "@/lib/types";

type DataTableProviderProps = {
    data: any[];
    columns: any[];
    tableName?: string;
    onBulkDeleteLink?: string;
};

export default function DataTableProvider({
    data,
    columns,
    tableName,
    onBulkDeleteLink,
}: DataTableProviderProps) {
    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        if (!onBulkDeleteLink) return;

        try {
            const res = await axios.post(onBulkDeleteLink, {
                ids: selectedIds,
            });

            if (res.status === 200) {
                const message =
                    res.data.deletedCount == 1
                        ? `Беше премахнат ${res.data.deletedCount} елемент`
                        : `Бяха премахнати ${res.data.deletedCount} елемента.`;
                toast.success(message);
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleReorder = async (reorderedData: Municipaliy[]) => {
        if (!tableName) return;

        try {
            const response = await fetch("/api/reorder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tableName: tableName,
                    items: reorderedData.map((item, index) => ({
                        id: item.id,
                        order: index + 1,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error("Пренареждането на записите беше провалено.");
            }

            console.log("Редът е запазен успешно");
        } catch (error) {
            console.error("Грешка при запазване на реда:", error);
        }
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            onReorder={(tableName && handleReorder) || undefined}
            onBulkDelete={(selectedIds) => onBulkDelete(selectedIds)}
        />
    );
}
