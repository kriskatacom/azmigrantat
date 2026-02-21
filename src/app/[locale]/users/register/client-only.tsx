"use client";

import { motion } from "framer-motion";
import { RegisterForm } from "@/app/[locale]/users/register/register-form";
import { MainNavbar } from "@/components/main-right-navbar";
import LoginAnimation from "@/app/[locale]/users/_components/login-animation";

export default function Register() {
    return (
        <main className="relative min-h-screen bg-slate-950 overflow-x-hidden">
            <LoginAnimation />
            
            <div className="relative z-20">
                <MainNavbar />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between max-w-7xl mx-auto px-4 py-16 gap-16 min-h-[calc(100vh-80px)]">
                <div className="text-center lg:text-left max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl font-extrabold text-emerald-400 mb-4 drop-shadow-md">
                            Стани част от нас
                        </h1>
                        <p className="text-lg text-emerald-100/80 mb-8">
                            Създай своя профил днес и получи достъп до всички
                            инструменти за управление на обяви и услуги в нашата
                            общност.
                        </p>

                        {/* Можеш да добавиш малки bullet points тук за професионален вид */}
                        <ul className="space-y-4 text-emerald-200/70 md:text-lg hidden md:block">
                            <li className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Бързо и лесно управление на обяви
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Директна връзка с потребители
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Персонализирано съдържание
                            </li>
                        </ul>
                    </motion.div>
                </div>

                <div className="w-full max-w-md backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/10 ring-1 ring-white/10">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Регистрация
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Попълнете данните си, за да започнете
                        </p>
                    </div>

                    <RegisterForm />

                    <div className="mt-8 text-center text-sm text-gray-400">
                        Вече имате профил?{" "}
                        <a
                            href="/users/login"
                            className="text-website-light hover:underline font-medium"
                        >
                            Влезте от тук
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
