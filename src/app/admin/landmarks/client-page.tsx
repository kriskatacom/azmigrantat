"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { columns, LandmarkWithCountry } from "@/app/admin/landmarks/columns";
import { DataTable } from "@/components/data-table";

type ClientPageProps = {
    data: LandmarkWithCountry[];
};

export default function ClientPage({ data }: ClientPageProps) {
    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        try {
            const res = await axios.post("/api/landmarks/bulk-delete", {
                ids: selectedIds,
            });

            if (res.status === 200) {
                toast.success(
                    `Бяха премахнати ${res.data.deletedCount} забележителности.`,
                );
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <DataTable
            columns={columns}
            data={data}
            onBulkDelete={(selectedIds) => onBulkDelete(selectedIds)}
        />
    );
}