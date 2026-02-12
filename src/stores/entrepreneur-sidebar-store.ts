import { create } from "zustand";

type SidebarState = {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    setOpen: (value: boolean) => void;
};

export const useEntrepreneurSidebarStore = create<SidebarState>((set) => ({
    isOpen: true,

    open: () => set({ isOpen: true }),

    close: () => set({ isOpen: false }),

    toggle: () =>
        set((state) => ({
            isOpen: !state.isOpen,
        })),

    setOpen: (value) => set({ isOpen: value }),
}));