"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { columns } from "@/app/admin/trains/columns";
import { DataTable } from "@/components/data-table";
import { Airline } from "@/lib/types";

type ClientPageProps = {
    data: Airline[];
};

export default function ClientPage({ data }: ClientPageProps) {
    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        try {
            const res = await axios.post("/api/trains/bulk-delete", {
                ids: selectedIds,
            });

            if (res.status === 200) {
                toast.success(
                    `Бяха премахнати ${res.data.deletedCount} автобусни гари.`,
                );
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleReorder = async (reorderedData: Airline[]) => {
        try {
            const response = await fetch("/api/reorder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tableName: "trains",
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
            onReorder={handleReorder}
            onBulkDelete={(selectedIds) => onBulkDelete(selectedIds)}
        />
    );
}
