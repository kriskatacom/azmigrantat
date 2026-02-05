import { HOME_TYPEWRITER_TEXTS } from "@/lib/constants";
import AnimatedTypewriterText from "@/components/animated-typewriter-texts";

export default function TypewriterTexts() {
    return (
        <div className="text-white bg-website-dark uppercase py-5 md:py-6 text-center text-xl font-semibold">
            <span className="text-website-blue">Аз мигрантът </span>
            <AnimatedTypewriterText
                texts={HOME_TYPEWRITER_TEXTS}
                typingSpeed={100}
            />
        </div>
    );
}