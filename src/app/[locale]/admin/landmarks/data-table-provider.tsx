// components/admin/landmarks-table.tsx
"use client";

import DataTableProvider from "@/components/admin/data-table-provider";
import {
    columns as baseColumns,
    LandmarkWithCountry,
} from "@/app/[locale]/admin/landmarks/columns";

export default function LandmarksTable({
    landmarks,
}: {
    landmarks: LandmarkWithCountry[];
}) {
    // columns вече имат достъп до landmarks
    const columns = baseColumns(landmarks);

    return (
        <DataTableProvider
            data={landmarks}
            columns={columns}
            tableName="landmarks"
            onBulkDeleteLink="/api/landmarks/bulk-delete"
        />
    );
}
