"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { User } from "@/lib/services/user-service";
import {
    fetchUsersAction,
    assignUserToCompany,
    removeUserFromCompany,
} from "@/app/[locale]/admin/companies/actions";
import { Company } from "@/lib/types";

interface AssignUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    company: Company;
    onUserAssigned?: (userName: string) => void;
}

export function AssignUserDialog({
    open,
    onOpenChange,
    company,
    onUserAssigned,
}: AssignUserDialogProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        let mounted = true;

        fetchUsersAction()
            .then((data) => {
                if (!mounted) return;
                setUsers(data);

                if (company.user_id) {
                    const exists = data.find((u) => u.id === company.user_id);
                    if (exists) setSelectedUser(company.user_id);
                }
            })
            .catch((err: any) => toast.error(err.message));

        return () => {
            mounted = false;
        };
    }, [open, company.user_id]);

    const handleAssign = async () => {
        if (!selectedUser) return toast.error("Моля, изберете потребител");

        setLoading(true);
        try {
            const assignedUser = await assignUserToCompany(
                company.id,
                selectedUser,
            );
            toast.success("Потребителят беше успешно назначен!");
            onOpenChange(false);

            if (onUserAssigned) {
                onUserAssigned(assignedUser.name);
            }
        } catch (err: any) {
            toast.error(err.message || "Грешка при назначаване");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!selectedUser) return toast.error("Няма назначен потребител");

        setDeleteLoading(true);
        try {
            await removeUserFromCompany(company.id);
            toast.success("Потребителят беше успешно премахнат!");
            setSelectedUser(undefined);
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Грешка при премахване");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl border shadow-lg">
                <DialogHeader className="border-b p-5">
                    <DialogTitle className="text-xl font-semibold">
                        Назначаване на потребител
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 px-5">
                    <div className="grid gap-2">
                        <Label
                            htmlFor="user"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            Потребител
                        </Label>
                        <Select
                            value={selectedUser}
                            onValueChange={setSelectedUser}
                        >
                            <SelectTrigger id="user" className="w-full">
                                <SelectValue placeholder="Изберете потребител..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-auto">
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedUser && (
                        <Button
                            disabled={deleteLoading}
                            variant={"destructive"}
                            onClick={handleRemove}
                            className="w-fit"
                        >
                            {deleteLoading ? "Премахване..." : "Премахване"}
                        </Button>
                    )}
                </div>

                <DialogFooter className="flex justify-end gap-2 px-5 mb-5">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отказ
                    </Button>
                    <Button onClick={handleAssign} disabled={loading}>
                        {loading ? "Запазване" : "Назначаване"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
