<?php

if (!function_exists('company_env')) {
    function company_env(string $key, string $default = ''): string
    {
        if (array_key_exists($key, $_ENV) && $_ENV[$key] !== null && (string) $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }

        $value = getenv($key);

        return $value === false || $value === '' ? $default : (string) $value;
    }
}

define('COMPANY_NAME', company_env('COMPANY_NAME', 'Аз мигрантът'));
define('COMPANY_LEGAL_NAME', company_env('COMPANY_LEGAL_NAME', 'АЗ МИГРАНТЪТ ЕООД'));
define('COMPANY_LEGAL_FORM', company_env('COMPANY_LEGAL_FORM', 'Еднолично дружество с ограничена отговорност (ЕООД)'));
define('COMPANY_STATUS', company_env('COMPANY_STATUS', 'Активен'));
define('COMPANY_EIK', company_env('COMPANY_EIK', '206860375'));
define('COMPANY_VAT', company_env('COMPANY_VAT', 'BG206860375'));
define('COMPANY_VAT_REGISTERED_AT', company_env('COMPANY_VAT_REGISTERED_AT', '09.08.2023'));
define('COMPANY_REGISTERED_AT', company_env('COMPANY_REGISTERED_AT', '14.03.2022'));
define('COMPANY_CAPITAL', company_env('COMPANY_CAPITAL', '5 €'));
define('COMPANY_ADDRESS', company_env('COMPANY_ADDRESS', 'ул. Цар Симеон 14, 3400 Монтана, България'));
define('COMPANY_OFFICE_ADDRESS', company_env('COMPANY_OFFICE_ADDRESS', 'бул. Христо Ботев 69, 3400 Монтана, България'));
define('COMPANY_MANAGER', company_env('COMPANY_MANAGER', 'Алеко Валентинов Начов'));
define('COMPANY_OWNER', company_env('COMPANY_OWNER', 'Алеко Валентинов Начов'));
define('COMPANY_PHONE', company_env('COMPANY_PHONE', '+359 96 593 333'));
define('COMPANY_EMAIL', company_env('COMPANY_EMAIL', company_env('SMTP_USER', 'i.the.migrant@gmail.com')));
define('COMPANY_WEBSITE', company_env('COMPANY_WEBSITE', defined('MAIN_WEBSITE_URL') ? MAIN_WEBSITE_URL : 'https://azmigrantat.com'));
