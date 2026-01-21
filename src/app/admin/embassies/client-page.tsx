"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { columns, EmbassyWithCountry } from "@/app/admin/embassies/columns";
import { DataTable } from "@/components/data-table";
import { Embassy } from "@/lib/types";
import { CardEntity } from "@/components/card-item";

type ClientPageProps = {
    data: EmbassyWithCountry[];
};

export default function ClientPage({ data }: ClientPageProps) {

    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        try {
            const res = await axios.post("/api/embassies/bulk-delete", { ids: selectedIds });

            if (res.status === 200) {
                toast.success(`Бяха премахнати ${res.data.deletedCount} посолства.`);
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
