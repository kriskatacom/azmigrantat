import { create } from "zustand";

interface GalleryDialogEmbassyState {
    isOpen: boolean;
    activeId: number | null;
    allIds: number[];
    onOpen: (id: number, allIds?: number[]) => void;
    onClose: () => void;
    setActiveId: (id: number) => void;
    setAllIds: (ids: number[]) => void;
}

export const useGalleryDialogEmbassyStore = create<GalleryDialogEmbassyState>(
    (set) => ({
        isOpen: false,
        activeId: null,
        allIds: [],

        onOpen: (id: number, allIds: number[] = []) =>
            set({
                isOpen: true,
                activeId: id,
                allIds: allIds.length > 0 ? allIds : [id],
            }),

        onClose: () =>
            set({
                isOpen: false,
                activeId: null,
                allIds: [],
            }),

        setActiveId: (id: number) => set({ activeId: id }),

        setAllIds: (ids: number[]) => set({ allIds: ids }),
    }),
);