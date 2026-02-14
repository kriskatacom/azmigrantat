"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export default function DynamicTranslate() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        if (typeof window !== "undefined") {
            const originalRemoveChild = Node.prototype.removeChild;
            (Node.prototype as any).removeChild = function <T extends Node>(
                child: T,
            ): T {
                if (child.parentNode !== this) {
                    if (console)
                        console.warn("Предотвратена removeChild грешка.");
                    return child;
                }
                return originalRemoveChild.apply(this, [child]) as T;
            };

            const originalInsertBefore = Node.prototype.insertBefore;
            (Node.prototype as any).insertBefore = function <T extends Node>(
                newNode: T,
                referenceNode: Node | null,
            ): T {
                if (referenceNode && referenceNode.parentNode !== this) {
                    if (console)
                        console.warn("Предотвратена insertBefore грешка.");
                    return newNode;
                }
                return originalInsertBefore.apply(this, [
                    newNode,
                    referenceNode,
                ]) as T;
            };
        }
    }, []);

    const changeLanguage = (lang: string) => {
        document.cookie = `googtrans=/bg/${lang};path=/`;
        window.location.reload();
    };

    if (!mounted) return null;

    return (
        <div className="translate-wrapper">
            <div
                id="google_translate_element"
                style={{ display: "none" }}
            ></div>

            <Script id="google-translate-init" strategy="afterInteractive">
                {`
                    function googleTranslateElementInit() {
                        new google.translate.TranslateElement(
                            { 
                                pageLanguage: 'bg', 
                                layout: google.translate.TranslateElement.InlineLayout.SIMPLE, 
                                autoDisplay: false 
                            },
                            'google_translate_element'
                        );
                    }
                `}
            </Script>
            <Script
                src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
                strategy="afterInteractive"
            />

            <style jsx>{`
                .lang-switcher {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    justify-content: center;
                }
                .lang-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                    color: #334155;
                }
                .lang-btn:active {
                    transform: scale(0.95);
                    background-color: #f1f5f9;
                }
                @media (min-width: 768px) {
                    .lang-switcher {
                        justify-content: flex-end;
                    }
                }
                @media (max-width: 350px) {
                    .text {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
