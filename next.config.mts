import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
    allowedDevOrigins: ["http://localhost:3000", "http://192.168.1.213:3000", "https://azmigrantat.com"],
};

export default withNextIntl(nextConfig);