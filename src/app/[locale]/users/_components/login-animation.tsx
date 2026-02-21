"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function DigitalTechBackground() {
    const [elements, setElements] = useState<
        { id: number; left: string; duration: number }[]
    >([]);

    useEffect(() => {
        const newElements = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: Math.random() * 8 + 7,
        }));
        setElements(newElements);
    }, []);

    return (
        <div className="fixed inset-0 overflow-hidden bg-[#020617] z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_70%)]" />
            <div
                className="absolute inset-0 opacity-[0.1]"
                style={{
                    backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
                    backgroundSize: "50px 50px",
                }}
            />

            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={`geo-${i}`}
                    animate={{
                        rotate: i % 2 === 0 ? 360 : -360,
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 30 + i * 15,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    style={{
                        width: `${400 + i * 200}px`,
                        height: `${400 + i * 200}px`,
                        top: "50%",
                        left: "50%",
                        x: "-50%",
                        y: "-50%",
                        borderRadius: i === 1 ? "50%" : "20px",
                    }}
                />
            ))}

            {elements.map((el, i) => (
                <motion.div
                    key={el.id}
                    initial={{ opacity: 0, y: "-10vh" }}
                    animate={{
                        opacity: [0, 0.8, 0],
                        y: "110vh",
                    }}
                    transition={{
                        duration: el.duration,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "linear",
                    }}
                    className="absolute bg-emerald-400"
                    style={{
                        left: el.left,
                        width: i % 3 === 0 ? "1px" : "3px",
                        height: i % 3 === 0 ? "30px" : "3px",
                        filter: "blur(0.5px)",
                        boxShadow: "0 0 12px rgba(16,185,129,0.8)",
                    }}
                />
            ))}

            <motion.div
                animate={{
                    y: ["-10%", "110%"],
                    opacity: [0, 1, 1, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute inset-x-0 h-10 bg-linear-to-r from-transparent via-emerald-500/40 to-transparent"
                style={{ zIndex: 5 }}
            />
        </div>
    );
}
