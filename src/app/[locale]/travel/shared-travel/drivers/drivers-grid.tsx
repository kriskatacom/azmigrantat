import { Driver } from "@/app/[locale]/travel/shared-travel/_components/drivers-slider";
import { DriverSingle } from "@/app/[locale]/travel/shared-travel/_components/driver-single";

export default function DriversGrid() {
    const drivers: Driver[] = [
        {
            id: 1,
            name: "Мария Иванова",
            age: 30,
            image: "/images/shared-travel/drivers/01.jpg",
            car: null,
            email: "scott@email.com",
            phone: "+359888123456",
            verified: true,
        },
        {
            id: 2,
            name: "Daniel Carter",
            age: 34,
            image: "/images/shared-travel/drivers/02.jpg",
            car: "BMW 320d",
            email: "daniel.carter@email.com",
            phone: "+359888654321",
            verified: true,
        },
        {
            id: 3,
            name: "Michael Stone",
            age: 28,
            image: "/images/shared-travel/drivers/03.jpg",
            car: "Audi A4",
            email: "michael.stone@email.com",
            phone: "+359887112233",
            verified: false,
        },
        {
            id: 4,
            name: "Alexander Reed",
            age: 41,
            image: "/images/shared-travel/drivers/04.jpg",
            car: "Volkswagen Passat",
            email: "alex.reed@email.com",
            phone: "+359889445566",
            verified: true,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-5">
                {drivers.map((driver) => (
                    <DriverSingle key={driver.id} driver={driver} />
                ))}
            </div>
        </div>
    );
}