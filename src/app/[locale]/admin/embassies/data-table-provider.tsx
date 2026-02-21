"use client";

import DataTableProvider from "@/components/admin/data-table-provider";
import {
    columns as baseColumns,
    EmbassyWithCountry,
} from "@/app/[locale]/admin/embassies/columns";

export default function EmbassiesTable({
    embassies,
}: {
    embassies: EmbassyWithCountry[];
}) {
    const columns = baseColumns(embassies);

    return (
        <DataTableProvider
            data={embassies}
            columns={columns}
            tableName="embassies"
            onBulkDeleteLink="/api/embassies/bulk-delete"
        />
    );
}