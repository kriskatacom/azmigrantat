import { MainNavbar } from "@/components/main-navbar";
import { Hero } from "@/app/home/hero";

export default function HomePage() {
    return (
        <>
            <MainNavbar />
            <Hero
                title={`ПЪТУВАХ, РАБОТИ, ЖИВЕЙ`}
                subtitle={`С "АЗ МИГРАНТЪТ"!`}
                imageUrl="/images/azmigrantat-hero-background.webp"
                ctaText="РАЗГЛЕЖДАНЕ"
                ctaLink="#countries"
            />
            <h1>Начало</h1>
        </>
    );
}
