<?php

namespace App\Helpers;

final class Company
{
    public static function get(string $key, string $default = ''): string
    {
        if (defined($key)) {
            $fromConst = (string) constant($key);
            if ($fromConst !== '') {
                return $fromConst;
            }
        }

        if (array_key_exists($key, $_ENV) && $_ENV[$key] !== null && $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }

        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return (string) $env;
        }

        return $default;
    }

    public static function name(): string
    {
        return self::get('COMPANY_NAME', 'Аз мигрантът');
    }

    public static function legalName(): string
    {
        return self::get('COMPANY_LEGAL_NAME', 'АЗ МИГРАНТЪТ ЕООД');
    }

    public static function eik(): string
    {
        return self::get('COMPANY_EIK', '206860375');
    }

    public static function vat(): string
    {
        return self::get('COMPANY_VAT', 'BG206860375');
    }

    public static function address(): string
    {
        return self::get('COMPANY_ADDRESS', 'ул. Цар Симеон 14, 3400 Монтана, България');
    }

    public static function manager(): string
    {
        return self::get('COMPANY_MANAGER', 'Алеко Валентинов Начов');
    }

    public static function phone(): string
    {
        return self::get('COMPANY_PHONE', '+359 96 593 333');
    }

    public static function email(): string
    {
        return self::get('COMPANY_EMAIL', self::get('SMTP_USER', 'i.the.migrant@gmail.com'));
    }

    public static function website(): string
    {
        return rtrim(self::get('COMPANY_WEBSITE', defined('MAIN_WEBSITE_URL') ? MAIN_WEBSITE_URL : 'https://azmigrantat.com'), '/');
    }

    /**
     * @return array<string, mixed>
     */
    public static function emailTemplateData(): array
    {
        $website = self::website();
        $phone = self::phone();
        $email = self::email();

        return [
            'companyName' => self::name(),
            'companyLegalName' => self::legalName(),
            'companyEik' => self::eik(),
            'companyVat' => self::vat(),
            'companyAddress' => self::address(),
            'companyOfficeAddress' => self::get('COMPANY_OFFICE_ADDRESS'),
            'companyManager' => self::manager(),
            'companyOwner' => self::get('COMPANY_OWNER', self::manager()),
            'companyLegalForm' => self::get('COMPANY_LEGAL_FORM'),
            'companyCapital' => self::get('COMPANY_CAPITAL'),
            'companyRegisteredAt' => self::get('COMPANY_REGISTERED_AT'),
            'companyVatRegisteredAt' => self::get('COMPANY_VAT_REGISTERED_AT'),
            'companyStatus' => self::get('COMPANY_STATUS'),
            'companyPhone' => $phone,
            'companyEmail' => $email,
            'companyWebsite' => $website,
            'siteUrl' => $website,
            'phone' => $phone,
        ];
    }
}
