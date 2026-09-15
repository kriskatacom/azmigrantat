<?php

namespace App\Services;

class ApiClient
{
    private string $baseUrl;
    private array $defaultHeaders;

    public function __construct(string $baseUrl, array $defaultHeaders = [])
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->defaultHeaders = array_merge([
            'Accept: application/json',
            'Content-Type: application/json'
        ], $defaultHeaders);
    }

    public function request(string $method, string $endpoint, array $data = [], array $additionalHeaders = []): mixed
    {
        $url = $this->baseUrl . '/' . ltrim($endpoint, '/');
        $method = strtoupper($method);
        
        $ch = curl_init();

        if ($method === 'GET' && !empty($data)) {
            $url .= '?' . http_build_query($data);
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        $headers = array_merge($this->defaultHeaders, $additionalHeaders);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method !== 'GET' && !empty($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_UNESCAPED_UNICODE));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($response === false) {
            throw new \Exception("cURL грешка: " . $error);
        }

        $decodedResponse = json_decode($response, true);

        if ($httpCode >= 400) {
            $errorMessage = $decodedResponse['message'] ?? $decodedResponse['error'] ?? "HTTP грешка код {$httpCode}";
            throw new \Exception("API Грешка [Код $httpCode]: " . $errorMessage);
        }

        return $decodedResponse;
    }

    
    public function get(string $endpoint, array $queryParams = [], array $headers = []): mixed
    {
        return $this->request('GET', $endpoint, $queryParams, $headers);
    }

    public function post(string $endpoint, array $bodyData = [], array $headers = []): mixed
    {
        return $this->request('POST', $endpoint, $bodyData, $headers);
    }

    public function put(string $endpoint, array $bodyData = [], array $headers = []): mixed
    {
        return $this->request('PUT', $endpoint, $bodyData, $headers);
    }

    public function delete(string $endpoint, array $bodyData = [], array $headers = []): mixed
    {
        return $this->request('DELETE', $endpoint, $bodyData, $headers);
    }
}
