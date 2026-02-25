"use client";

import { create } from "zustand";

export type TabKey = "general" | "media" | "post";

type TabsState = {
    activeTab: TabKey;
    setActiveTab: (tab: TabKey) => void;
};

export const useTabsStore = create<TabsState>((set) => ({
    activeTab: "general",
    setActiveTab: (tab) => set({ activeTab: tab }),
}));
