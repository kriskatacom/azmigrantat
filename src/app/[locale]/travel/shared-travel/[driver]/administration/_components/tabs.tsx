"use client";

import { cn } from "@/lib/utils";
import { TabKey, useTabsStore } from "@/app/[locale]/travel/shared-travel/[driver]/administration/stores/use-tab-store";

type TabItem = {
    key: TabKey;
    label: string;
};

const tabs: TabItem[] = [
    { key: "general", label: "Общи" },
    { key: "media", label: "Изображения" },
    { key: "post", label: "Обява" },
    { key: "contacts", label: "Контакти" },
];

export default function Tabs() {
    const { activeTab, setActiveTab } = useTabsStore();

    return (
        <div className="border-b flex gap-2 px-2 md:px-5 pb-4 overflow-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                        "px-5 py-3 text-sm md:text-base font-medium rounded-sm transition-colors",
                        activeTab === tab.key
                            ? "text-white bg-website-dark"
                            : "bg-gray-100 text-muted-foreground hover:text-foreground",
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
