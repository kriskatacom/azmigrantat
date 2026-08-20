<?php

namespace App\Services;

use App\Core\View;

class OpenGraphService
{
    private array $tags = [];
    private string $siteName = WEBSITE_DOMAIN_NAME;

    public function __construct(array $data = [])
    {
        $currentUrl = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

        $imgDesktop = !empty($data['image_desktop']) ? $this->prepareImageUrl($data['image_desktop']) : BASE_URL . '/assets/images/logo.webp';
        $imgTablet  = !empty($data['image_tablet'])  ? $this->prepareImageUrl($data['image_tablet'])  : $imgDesktop;
        $imgPhone   = !empty($data['image_phone'])   ? $this->prepareImageUrl($data['image_phone'])   : $imgDesktop;

        $this->tags = [
            'title'       => !View::isHome() ? ($data['meta_title'] ?? $data['title'] ?? '') . ' - ' . COMPANY_NAME : COMPANY_NAME,
            'description' => $data['meta_description'] ?? 'Добре дошли в нашия портал.',
            'keywords'    => $data['meta_keywords'] ?? '',
            'url'         => $currentUrl,
            'image'       => $imgDesktop,
            'image_tablet' => $imgTablet,
            'image_phone' => $imgPhone,
            'type'        => $data['og_type'] ?? 'website',
            'locale'      => 'bg_BG',
        ];
    }

    private function prepareImageUrl(string $path): string
    {
        if (empty($path)) return '';
        if (filter_var($path, FILTER_VALIDATE_URL)) return $path;
        return BASE_URL . $path;
    }

    public function renderTags(): string
    {
        $title = htmlspecialchars($this->tags['title'] ?? '', ENT_QUOTES, 'UTF-8');
        $description = htmlspecialchars($this->tags['description'] ?? '', ENT_QUOTES, 'UTF-8');
        $image = htmlspecialchars($this->tags['image'], ENT_QUOTES, 'UTF-8');

        $html  = "    <title>{$title}</title>\n";
        $html .= "    <meta name=\"description\" content=\"{$description}\">\n";
        $html .= "    <meta name=\"robots\" content=\"index, follow\">\n";

        if (!empty($this->tags['keywords'])) {
            $html .= "    <meta name=\"keywords\" content=\"" . htmlspecialchars($this->tags['keywords']) . "\">\n";
        }

        $html .= "    <link rel=\"canonical\" href=\"{$this->tags['url']}\">\n\n";

        $html .= "    <meta property=\"og:locale\" content=\"{$this->tags['locale']}\">\n";
        $html .= "    <meta property=\"og:site_name\" content=\"{$this->siteName}\">\n";
        $html .= "    <meta property=\"og:type\" content=\"{$this->tags['type']}\">\n";
        $html .= "    <meta property=\"og:url\" content=\"{$this->tags['url']}\">\n";
        $html .= "    <meta property=\"og:title\" content=\"{$title}\">\n";
        $html .= "    <meta property=\"og:description\" content=\"{$description}\">\n";
        $html .= "    <meta property=\"og:image\" content=\"{$image}\">\n";
        $html .= "    <meta property=\"og:image:alt\" content=\"{$title}\">\n\n";

        $html .= "    <meta name=\"twitter:card\" content=\"summary_large_image\">\n";
        $html .= "    <meta name=\"twitter:title\" content=\"{$title}\">\n";
        $html .= "    <meta name=\"twitter:description\" content=\"{$description}\">\n";
        $html .= "    <meta name=\"twitter:image\" content=\"{$image}\">\n\n";

        $html .= $this->renderSchema();

        return $html;
    }

    private function renderSchema(): string
    {
        $schema = [
            "@context" => "https://schema.org",
            "@type"    => "WebPage",
            "name"     => $this->tags['title'],
            "description" => $this->tags['description'],
            "url"      => $this->tags['url'],
            "primaryImageOfPage" => [
                "@type" => "ImageObject",
                "url" => $this->tags['image']
            ],
            "image" => [
                $this->tags['image'],
                $this->tags['image_tablet'],
                $this->tags['image_phone']
            ],
            "publisher" => [
                "@type" => "Organization",
                "name" => $this->siteName,
                "logo" => [
                    "@type" => "ImageObject",
                    "url" => BASE_URL . "/assets/images/logo.webp"
                ]
            ]
        ];

        return "    <script type=\"application/ld+json\">\n    " . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
    }
}