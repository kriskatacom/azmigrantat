"use client";

import AnimatedTypewriterText from "@/components/animated-typewriter-texts";
import { useTranslations } from "next-intl";

export default function TypewriterTexts() {
    const t = useTranslations("homepage");

    const HOME_TYPEWRITER_TEXTS: string[] = [
        t("typewriterTexts.credits"),
        t("typewriterTexts.travel"),
        t("typewriterTexts.jobs"),
        t("typewriterTexts.ads"),
        t("typewriterTexts.music"),
        t("typewriterTexts.insurance"),
        t("typewriterTexts.translation"),
    ];

    return (
        <div className="text-white bg-website-dark uppercase py-5 md:py-6 text-center text-xl font-semibold">
            <span className="text-website-blue">{t("typewriterTexts.title")} </span>
            <AnimatedTypewriterText
                texts={HOME_TYPEWRITER_TEXTS}
                typingSpeed={100}
            />
        </div>
    );
}
