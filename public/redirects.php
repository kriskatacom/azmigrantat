<?php

$redirects = [
    '/cities/izrabotka-na-sayt-dupnitsa/' => '/cities/website-development-dupnica',
    '/services/' => '/services/website-development',
    '/portfolio/corporate' => '/projects',
];

$current_uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (array_key_exists($current_uri, $redirects)) {
    header("Location: " . $redirects[$current_uri], true, 301);
    exit();
}