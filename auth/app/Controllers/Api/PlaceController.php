<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\OpenStreetMapPlaceService;
use RuntimeException;

final class PlaceController extends BaseController
{
    public function search()
    {
        $query = trim((string) ($_GET['q'] ?? ''));
        if (mb_strlen($query) < 3 || mb_strlen($query) > 100) return $this->json(['success' => true, 'data' => [], 'attribution' => '© OpenStreetMap contributors']);
        [$lat, $lon] = $this->coordinates();
        try {
            return $this->json(['success' => true, 'data' => (new OpenStreetMapPlaceService())->search($query, $lat, $lon), 'attribution' => '© OpenStreetMap contributors']);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'message' => $error->getMessage()], 503);
        }
    }

    public function nearby()
    {
        [$lat, $lon] = $this->coordinates();
        if ($lat === null || $lon === null) return $this->json(['success' => false, 'message' => 'Липсват валидни координати.'], 422);
        try {
            return $this->json(['success' => true, 'data' => (new OpenStreetMapPlaceService())->nearby($lat, $lon), 'attribution' => '© OpenStreetMap contributors']);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'message' => $error->getMessage()], 503);
        }
    }

    private function coordinates(): array
    {
        $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
        $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($lat === false || $lon === false || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) return [null, null];
        return [(float) $lat, (float) $lon];
    }
}
