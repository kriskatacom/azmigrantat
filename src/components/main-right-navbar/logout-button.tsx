"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function LogoutButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="destructive"
            className="w-full flex items-center justify-center gap-2"
            disabled={pending}
        >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Излизане..." : "Изход"}
        </Button>
    );
}
