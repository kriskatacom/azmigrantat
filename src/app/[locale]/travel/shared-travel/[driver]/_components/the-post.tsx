import { Driver } from "@/lib/services/driver-service";

type ThePostProps = {
    driver: Driver;
}

export default function ThePost({ driver }: ThePostProps) {
    return (
        <div className="overflow-hidden rounded-md mt-2 md:mt-5 border shadow-sm">
            <h2 className="text-white bg-website-dark text-xl lg:text-2xl font-semibold p-3 md:p-5">
                Информация за пътуването
            </h2>
            <p className="p-2 md:p-5">
                {driver.post_description}
            </p>
        </div>
    );
}
