<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\User;
use DOMDocument;
use DOMXPath;

final class LinkPreviewController extends BaseController
{
    public function show()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->json([
                'success' => false,
                'message' => 'Необходима е автентикация.',
            ], 401);
        }

        $url = trim($_GET['url'] ?? '');

        if (
            $url === '' ||
            !filter_var($url, FILTER_VALIDATE_URL)
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден URL.',
            ], 422);
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);

        if (!in_array($scheme, ['http', 'https'], true)) {
            return $this->json([
                'success' => false,
                'message' => 'Неподдържан URL.',
            ], 422);
        }

        try {
            $html = $this->fetchPage($url);

            if ($html === null) {
                return $this->json([
                    'success' => false,
                    'message' => 'Страницата не можа да бъде заредена.',
                ], 422);
            }

            $preview = $this->parseMetadata($html, $url);

            return $this->json([
                'success' => true,
                'data' => $preview,
            ]);
        } catch (\Throwable $exception) {
            error_log(
                'Link preview error: '
                . $exception->getMessage()
            );

            return $this->json([
                'success' => false,
                'message' => 'Неуспешно зареждане на мета данните.',
            ], 500);
        }
    }

    private function fetchPage(string $url): ?string
    {
        $curl = curl_init($url);

        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_USERAGENT =>
                'Mozilla/5.0 (compatible; FlexLinkPreview/1.0)',
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml',
            ],
        ]);

        $html = curl_exec($curl);

        $status = (int) curl_getinfo(
            $curl,
            CURLINFO_HTTP_CODE
        );

        curl_close($curl);

        if (
            !is_string($html) ||
            $html === '' ||
            $status < 200 ||
            $status >= 400
        ) {
            return null;
        }

        return $html;
    }

    private function parseMetadata(
        string $html,
        string $url
    ): array {
        $document = new DOMDocument();

        libxml_use_internal_errors(true);

        $document->loadHTML(
            '<?xml encoding="utf-8" ?>' . $html
        );

        libxml_clear_errors();

        $xpath = new DOMXPath($document);

        $title =
            $this->meta($xpath, 'property', 'og:title')
            ?? $this->meta($xpath, 'name', 'twitter:title')
            ?? $this->documentTitle($document);

        $description =
            $this->meta(
                $xpath,
                'property',
                'og:description'
            )
            ?? $this->meta(
                $xpath,
                'name',
                'twitter:description'
            )
            ?? $this->meta(
                $xpath,
                'name',
                'description'
            );

        $image =
            $this->meta($xpath, 'property', 'og:image')
            ?? $this->meta(
                $xpath,
                'name',
                'twitter:image'
            );

        $siteName = $this->meta(
            $xpath,
            'property',
            'og:site_name'
        );

        return [
            'url' => $url,
            'title' => $title,
            'description' => $description,
            'image' => $image
                ? $this->absoluteUrl($image, $url)
                : null,
            'site_name' => $siteName,
        ];
    }

    private function meta(
        DOMXPath $xpath,
        string $attribute,
        string $value
    ): ?string {
        $nodes = $xpath->query(
            sprintf(
                '//meta[@%s="%s"]/@content',
                $attribute,
                $value
            )
        );

        if (!$nodes || $nodes->length === 0) {
            return null;
        }

        $content = trim(
            $nodes->item(0)?->nodeValue ?? ''
        );

        return $content !== '' ? $content : null;
    }

    private function documentTitle(
        DOMDocument $document
    ): ?string {
        $titles = $document->getElementsByTagName('title');

        if ($titles->length === 0) {
            return null;
        }

        $title = trim(
            $titles->item(0)?->textContent ?? ''
        );

        return $title !== '' ? $title : null;
    }

    private function absoluteUrl(
        string $image,
        string $pageUrl
    ): string {
        if (
            str_starts_with($image, 'http://') ||
            str_starts_with($image, 'https://')
        ) {
            return $image;
        }

        $parts = parse_url($pageUrl);

        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';

        if (str_starts_with($image, '//')) {
            return $scheme . ':' . $image;
        }

        if (str_starts_with($image, '/')) {
            return $scheme . '://' . $host . $image;
        }

        $path = $parts['path'] ?? '/';
        $directory = rtrim(
            dirname($path),
            '/\\'
        );

        return $scheme
            . '://'
            . $host
            . ($directory ? $directory . '/' : '/')
            . $image;
    }

    private function authenticatedUser(): ?User
    {
        $authorization =
            $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (
            !preg_match(
                '/Bearer\s+(\S+)/i',
                $authorization,
                $matches
            )
        ) {
            return null;
        }

        $accessToken = OauthAccessToken::query()
            ->where('token', $matches[1])
            ->with('user')
            ->first();

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }
}
