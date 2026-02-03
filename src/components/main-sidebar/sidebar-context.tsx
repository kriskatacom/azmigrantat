"use client";

import React from "react";

import {
    createContext,
    useContext,
    useState,
    useOptimistic,
    useTransition,
} from "react";

type SidebarContextType = {
    collapsed: boolean;
    toggleSidebar: () => void;
    isPending: boolean;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({
    children,
    initialCollapsed,
}: {
    children: React.ReactNode;
    initialCollapsed: boolean;
}) {
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const [optimisticCollapsed, setOptimisticCollapsed] =
        useOptimistic(collapsed);
    const [isPending, startTransition] = useTransition();

    const toggleSidebar = () => {
        const newState = !optimisticCollapsed;

        startTransition(async () => {
            setOptimisticCollapsed(newState);

            await fetch("/api/sidebar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collapsed: newState }),
            });

            setCollapsed(newState);
        });
    };

    return (
        <SidebarContext.Provider
            value={{ collapsed: optimisticCollapsed, toggleSidebar, isPending }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}