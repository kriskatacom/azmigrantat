<?php

namespace App\Services;

use App\Models\Place;
use RuntimeException;

final class OpenStreetMapPlaceService
{
    private const PHOTON = 'https://photon.komoot.io';
    private const ALLOWED_TYPES = ['country', 'state', 'region', 'city', 'town', 'village', 'hamlet'];

    public function search(string $query, ?float $latitude = null, ?float $longitude = null): array
    {
        $params = ['q' => $query, 'limit' => 10, 'osm_tag' => 'place'];
        if ($latitude !== null && $longitude !== null) {
            $params['lat'] = $latitude;
            $params['lon'] = $longitude;
        }
        $payload = $this->getJson(self::PHOTON . '/api?' . http_build_query($params), 8, 300);
        $places = [];
        foreach (($payload['features'] ?? []) as $feature) {
            $normalized = $this->normalizePhoton($feature);
            if ($normalized) $places[] = $normalized;
        }
        return $this->persist($places);
    }

    public function nearby(float $latitude, float $longitude): array
    {
        $payload = $this->getJson(self::PHOTON . '/reverse?' . http_build_query([
            // Photon can return the containing city plus surrounding settlements
            // in one request when reverse search is restricted to the city layer.
            // This avoids address/square results while keeping public-API usage low.
            'lat' => $latitude, 'lon' => $longitude, 'radius' => 80,
            'limit' => 20, 'layer' => 'city',
        ]), 10, 300);
        $places = [];
        foreach (($payload['features'] ?? []) as $feature) {
            $normalized = $this->normalizePhoton($feature);
            if ($normalized) {
                $normalized['distance_km'] = $this->distance(
                    $latitude, $longitude, $normalized['latitude'], $normalized['longitude'],
                );
                $places[] = $normalized;
            }
        }
        usort($places, static fn (array $a, array $b): int => ($a['distance_km'] ?? INF) <=> ($b['distance_km'] ?? INF));
        return $this->persist(array_slice($places, 0, 10));
    }

    private function normalizePhoton(array $feature): ?array
    {
        $properties = $feature['properties'] ?? [];
        $coordinates = $feature['geometry']['coordinates'] ?? [];
        $type = strtolower((string) ($properties['osm_value'] ?? $properties['type'] ?? ''));
        if (!in_array($type, self::ALLOWED_TYPES, true) || count($coordinates) < 2) return null;
        $osmType = strtoupper((string) ($properties['osm_type'] ?? ''));
        $osmId = (int) ($properties['osm_id'] ?? 0);
        $name = trim((string) ($properties['name'] ?? ''));
        if ($osmType === '' || $osmId < 1 || $name === '') return null;
        return [
            'provider' => 'osm', 'provider_id' => $osmType . ':' . $osmId,
            'osm_type' => $osmType, 'osm_id' => $osmId, 'name' => $name, 'type' => $type,
            'country_code' => strtolower((string) ($properties['countrycode'] ?? '')) ?: null,
            'country' => $properties['country'] ?? null,
            'region' => $properties['state'] ?? null,
            'county' => $properties['county'] ?? null,
            'city' => $properties['city'] ?? ($properties['district'] ?? null),
            'latitude' => (float) $coordinates[1], 'longitude' => (float) $coordinates[0],
        ];
    }

    private function persist(array $places): array
    {
        return array_map(function (array $data): array {
            $distance = $data['distance_km'] ?? null;
            unset($data['distance_km']);
            $place = Place::query()->updateOrCreate(
                ['provider' => $data['provider'], 'provider_id' => $data['provider_id']],
                $data,
            );
            return $this->serialize($place, $distance);
        }, $places);
    }

    private function serialize(Place $place, ?float $distance): array
    {
        return [
            'id' => (int) $place->id, 'name' => $place->name, 'type' => $place->type,
            'country_code' => $place->country_code, 'country' => $place->country,
            'region' => $place->region, 'county' => $place->county, 'city' => $place->city,
            'latitude' => (float) $place->latitude, 'longitude' => (float) $place->longitude,
            'distance_km' => $distance === null ? null : round($distance, 1),
        ];
    }

    private function getJson(string $url, int $timeout, int $cacheSeconds): array
    {
        $cache = sys_get_temp_dir() . '/etome-osm-' . hash('sha256', $url) . '.json';
        if (is_file($cache) && filemtime($cache) >= time() - $cacheSeconds) {
            $cached = json_decode((string) file_get_contents($cache), true);
            if (is_array($cached)) return $cached;
        }
        $this->throttleUpstream();
        $curl = curl_init($url);
        curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: EtoMe/1.0 (https://azmigrantat.com; public place search)']]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($body) || $status < 200 || $status >= 300) throw new RuntimeException('Услугата за населени места временно не отговаря.' . ($error ? ' ' . $error : ''));
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) throw new RuntimeException('Получен е невалиден географски отговор.');
        @file_put_contents($cache, $body, LOCK_EX);
        return $decoded;
    }

    private function throttleUpstream(): void
    {
        $path = sys_get_temp_dir() . '/etome-osm-upstream-rate.lock';
        $handle = fopen($path, 'c+');
        if ($handle === false) return;
        try {
            if (!flock($handle, LOCK_EX)) return;
            rewind($handle);
            $last = (float) trim((string) stream_get_contents($handle));
            $wait = 1.0 - (microtime(true) - $last);
            if ($wait > 0) usleep((int) ceil($wait * 1_000_000));
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) microtime(true));
            fflush($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
    }

    private function distance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $latDelta = deg2rad($lat2 - $lat1); $lonDelta = deg2rad($lon2 - $lon1);
        $a = sin($latDelta / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;
        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
