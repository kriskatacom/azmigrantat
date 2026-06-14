<?php

namespace App\Services;

use Carbon\Exceptions\Exception;
use Twilio\Rest\Client;

class TwilioService
{
    private $client;
    private $serviceSid;

    public function __construct($sid, $token, $serviceSid)
    {
        $this->client = new Client($sid, $token);
        $this->serviceSid = $serviceSid;
    }

    public function sendCode($phoneNumber)
    {
        try {
            $verification = $this->client->verify->v2->services($this->serviceSid)
                ->verifications
                ->create($phoneNumber, "sms");
            
            return ['success' => true, 'sid' => $verification->sid];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function verifyCode($phoneNumber, $code)
    {
        try {
            $verification_check = $this->client->verify->v2->services($this->serviceSid)
                ->verificationChecks
                ->create([
                    'to' => $phoneNumber,
                    'code' => $code
                ]);

            return ['success' => $verification_check->status === 'approved'];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}