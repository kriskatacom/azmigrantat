"use client";

type FacebookPageProps = {
    pageUrl: string;
    width?: number;
    height?: number;
};

export default function FacebookPageEmbed({
    pageUrl,
    width = 500,
    height = 800,
}: FacebookPageProps) {
    const encodedUrl = encodeURIComponent(pageUrl);
    const src = `https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&width=${width}&height=${height}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;

    return (
        <div className="flex justify-center py-5 md:py-10 w-full overflow-hidden">
            <iframe
                src={src}
                width={width}
                height={height}
                style={{
                    border: "none",
                    overflow: "hidden",
                    maxWidth: "100%",
                }}
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="Facebook Page"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
            />
        </div>
    );
}
