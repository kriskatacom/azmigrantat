<?php

http_response_code(503);
header('Content-Type: application/json; charset=utf-8');
header('Retry-After: 60');
echo json_encode([
    'success' => false,
    'message' => 'Временно техническо обслужване. Опитайте отново след малко.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
