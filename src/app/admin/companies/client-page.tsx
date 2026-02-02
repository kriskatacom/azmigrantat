"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { columns } from "@/app/admin/companies/columns";
import { DataTable } from "@/components/data-table";
import { Company } from "@/lib/types";

type ClientPageProps = {
    data: Company[];
};

export default function ClientPage({ data }: ClientPageProps) {

    const router = useRouter();

    async function onBulkDelete(selectedIds: (string | number)[]) {
        try {
            const res = await axios.post("/api/companies/bulk-delete", { ids: selectedIds });

            if (res.status === 200) {
                toast.success(`Бяха премахнати ${res.data.deletedCount} компании.`);
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
