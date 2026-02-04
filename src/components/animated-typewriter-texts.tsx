"use client";

import { useEffect, useState } from "react";

type Props = {
    texts: string[];
    typingSpeed?: number;
    deletingSpeed?: number;
    pauseBeforeDelete?: number;
};

export default function AnimatedTypewriter({
    texts,
    typingSpeed = 120,
    deletingSpeed = 80,
    pauseBeforeDelete = 1200,
}: Props) {
    const [textIndex, setTextIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentText = texts[textIndex];

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (!isDeleting) {
            if (charIndex < currentText.length) {
                timeout = setTimeout(() => {
                    setCharIndex((prev) => prev + 1);
                }, typingSpeed);
            } else {
                timeout = setTimeout(() => {
                    setIsDeleting(true);
                }, pauseBeforeDelete);
            }
        } else {
            if (charIndex > 0) {
                timeout = setTimeout(() => {
                    setCharIndex((prev) => prev - 1);
                }, deletingSpeed);
            } else {
                setIsDeleting(false);
                setTextIndex((prev) => (prev + 1) % texts.length);
            }
        }

        return () => clearTimeout(timeout);
    }, [
        charIndex,
        isDeleting,
        currentText,
        texts.length,
        typingSpeed,
        deletingSpeed,
        pauseBeforeDelete,
    ]);

    return (
        <span className="typewriter">
            <span className="text">
                {currentText.split("").map((char, index) => {
                    const isVisible = index < charIndex;

                    return (
                        <span
                            key={index}
                            className={`char ${isVisible ? "char--visible" : "char--hidden"}`}
                        >
                            {char === " " ? "\u00A0" : char}
                        </span>
                    );
                })}
            </span>
        </span>
    );
}