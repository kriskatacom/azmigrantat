import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function ContactsHeader() {
    const t = useTranslations("homepage");

    return (
        <div className="bg-website-dark py-5 md:py-6 text-2xl md:text-3xl font-bold text-center">
            <div className="uppercase text-website-blue">
                {t("howToTravel")}
            </div>
            <div className="uppercase text-website-light">
                " {t("typewriterTexts.title")} " ?
            </div>
            <div className="mt-2 flex justify-start px-5">
                <Button
                    variant={"outline"}
                    size={"sm"}
                    className="bg-website-light border-website-light text-lg"
                >
                    {t("howToTravelButton")}
                </Button>
            </div>
        </div>
    );
}
