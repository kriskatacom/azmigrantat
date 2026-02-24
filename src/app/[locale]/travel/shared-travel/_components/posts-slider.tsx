"use client";

import { Check } from "lucide-react";
import { FaCarAlt, FaUser } from "react-icons/fa";
import { MdEmail, MdPhone } from "react-icons/md";
import { IoMdWarning } from "react-icons/io";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import { Button } from "@/components/ui/button";
import AppImage from "@/components/AppImage";

export interface Post {
    id: string | number;
    name: string;
    image?: string;
    background_image?: string;
    description: string;
    temp_description?: string;
    verified?: boolean;
}

export default function PostsSlider() {
    const posts: Post[] = [
        {
            id: 1,
            name: "Мария Иванова",
            image: "/images/shared-travel/drivers/01.jpg",
            description:
                "Пътуване от София до Пловдив на 28 март. Свободни 2 места. Тръгване в 17:30 от Централна гара.",
        },
        {
            id: 2,
            name: "Мария Георгиева",
            image: "/images/shared-travel/drivers/02.jpg",
            background_image: "/images/shared-travel/posts/car-01.webp",
            description:
                "Пътуване от Варна до Бургас този уикенд. Комфортен автомобил, климатик и възможност за багаж.",
        },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <Swiper
                spaceBetween={20}
                slidesPerView={1}
                breakpoints={{
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                }}
                effect={"slide"}
                modules={[Autoplay]}
                loop={true}
                grabCursor={true}
                autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                }}
            >
                {posts.map((post) => (
                    <SwiperSlide key={post.id}>
                        <PostSingle
                            post={post}
                            onProfileClick={(d) => console.log("Clicked:", d)}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}

interface PostSingleProps {
    post: Post;
    onProfileClick?: (post: Post) => void;
}

export function PostSingle({ post, onProfileClick }: PostSingleProps) {
    if (post.background_image) {
        return (
            <div className="rounded-md shadow-md overflow-hidden">
                <div className="relative w-full h-50">
                    <AppImage
                        src={post.background_image}
                        alt={post.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-md shadow-md flex items-start gap-5">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-shate shadow-md shrink-0">
                <AppImage
                    src={post.image}
                    alt={post.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                />
            </div>

            <div className="flex-1 space-y-2">
                <div className="text-2xl font-semibold">{post.name}</div>

                {post.description && (
                    <div className="text-muted-foreground line-clamp-3">
                        {post.description}
                    </div>
                )}

                <Button
                    size="lg"
                    className="w-full"
                    onClick={() => onProfileClick?.(post)}
                >
                    Преглед на обявата
                </Button>
            </div>
        </div>
    );
}
