"use client";

import { useTabsStore } from "@/app/[locale]/travel/shared-travel/[driver]/administration/stores/use-tab-store";
import GeneralTab from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/general";
import MediaTab from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/media";
import PostTab from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/post";
import ContactsTab from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/contacts";
import { Driver } from "@/lib/services/driver-service";

export default function TabContent({ driver }: { driver: Driver }) {
    const { activeTab } = useTabsStore();

    switch (activeTab) {
        case "general":
            return <GeneralTab driver={driver} />;
        case "media":
            return <MediaTab driver={driver} />;
        case "post":
            return <PostTab driver={driver} />;
        case "contacts":
            return <ContactsTab driver={driver} />;
        default:
            return null;
    }
}
