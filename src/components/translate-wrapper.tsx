"use client";

import dynamic from "next/dynamic";

const DynamicTranslate = dynamic(() => import("./dynamic-translate"), {
    ssr: false,
});

export default function TranslateWrapper() {
    return <DynamicTranslate />
}
