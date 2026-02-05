import { Button } from "@/components/ui/button";

export default function ContactsHeader() {
    return (
        <div className="bg-website-dark py-5 md:py-6 text-2xl md:text-3xl font-bold text-center">
            <div className="uppercase text-website-blue">
                Как да стигнете до
            </div>
            <div className="uppercase text-website-light">" Аз мигрантът " ?</div>
            <div className="mt-2 flex justify-start px-5">
                <Button
                    variant={"outline"}
                    size={"sm"}
                    className="bg-website-light border-website-light text-lg"
                >
                    Как да стигнете
                </Button>
            </div>
        </div>
    );
}
