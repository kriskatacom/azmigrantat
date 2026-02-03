import { create } from "zustand";

type FiltersSidebarState = {
    open: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
};

export const useFiltersSidebarStore = create<FiltersSidebarState>((set) => ({
    open: false,

    openSidebar: () => set({ open: true }),
    closeSidebar: () => set({ open: false }),
    toggleSidebar: () => set((state) => ({ open: !state.open })),
}));
