"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { columns } from "@/app/admin/categories/columns";
import { DataTable } from "@/components/data-table";
import { City } from "@/lib/types";

type ClientPageProps = {
    data: City[];
};

export default function ClientPage({ data }: ClientPageProps) {

    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        try {
            const res = await axios.post("/api/categories/bulk-delete", { ids: selectedIds });

            if (res.status === 200) {
                toast.success(`Бяха премахнати ${res.data.deletedCount} категории и техните деца.`);
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
