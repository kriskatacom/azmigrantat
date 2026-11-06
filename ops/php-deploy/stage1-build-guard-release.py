#!/usr/bin/env python3
import hashlib
import json
import os
import shutil
import stat
import sys

if len(sys.argv) != 3:
    raise SystemExit("usage: stage1-build-guard-release.py BASELINE_ROOT OUTPUT_ROOT")

baseline, output = map(os.path.abspath, sys.argv[1:])
if os.path.exists(output):
    raise SystemExit("output already exists")

expected = {
    "routes/web.php": "561ecf44a4b42a75ca549304f9afd3957bff05f6bccf34527f4299c3e10e34b2",
    "app/Controllers/Api/PaymentMethodController.php": "15dadea7798e0e9fd789d8672a83616a38453d4b047553a3f403977eb1e6d769",
    "app/Controllers/Api/SubscriptionController.php": "2d9c2d70ee9fd1b0a9a20e3f50d6f56d6f404723bfdb8b9f40df399c1ffb5124",
    "app/Services/PaymentMethodService.php": "76d228440cbb2b757f435eb0e6439ad083d6ed5aa9a288289a73ab259112398b",
    "app/Services/SubscriptionService.php": "806a1f562f6a781f321eb2e44403f40fad8599025e9694414b2f92bf6ff937c4",
}


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, got {count}")
    return text.replace(old, new, 1)


sources = {}
for relative, digest in expected.items():
    source = os.path.join(baseline, relative)
    raw = open(source, "rb").read()
    if hashlib.sha256(raw).hexdigest() != digest:
        raise SystemExit(f"baseline drift: {relative}")
    sources[relative] = raw.decode("utf-8")

route = sources["routes/web.php"]
route = replace_once(route, "use App\\Controllers\\PhinxController;\n", "", "migration import")
route = replace_once(route, "$router->get('/migrations/migrate', [PhinxController::class, 'migrate']);\n\n", "", "migration route")
sources["routes/web.php"] = route

service = sources["app/Services/PaymentMethodService.php"]
service = replace_once(
    service,
    "    public function save(User $user, string $number, int $expMonth, int $expYear, ?string $holderName): PaymentMethod\n    {\n",
    "    public function save(User $user, string $number, int $expMonth, int $expYear, ?string $holderName): PaymentMethod\n    {\n        PaymentsFeature::assertEnabled();\n",
    "payment method service guard",
)
sources["app/Services/PaymentMethodService.php"] = service

service = sources["app/Services/SubscriptionService.php"]
service = replace_once(
    service,
    "    public function createCheckout(User $user, string $plan): string\n    {\n",
    "    public function createCheckout(User $user, string $plan): string\n    {\n        PaymentsFeature::assertEnabled();\n",
    "checkout service guard",
)
service = replace_once(
    service,
    "    public function handleWebhook(string $payload, string $signature): void\n    {\n",
    "    public function handleWebhook(string $payload, string $signature): void\n    {\n        PaymentsFeature::assertEnabled();\n",
    "webhook service guard",
)
sources["app/Services/SubscriptionService.php"] = service

controller = sources["app/Controllers/Api/PaymentMethodController.php"]
controller = replace_once(
    controller,
    "use App\\Services\\PaymentMethodService;\n",
    "use App\\Services\\PaymentMethodService;\nuse App\\Services\\PaymentsFeature;\n",
    "payment feature import",
)
controller = replace_once(
    controller,
    "        $input = $this->jsonInput();\n        $validator = Validator::make(\n            $input,\n            ['auto_renewal' => 'required|boolean'],",
    "        $input = $this->jsonInput();\n        if (!PaymentsFeature::isEnabled() && filter_var($input['auto_renewal'] ?? false, FILTER_VALIDATE_BOOLEAN)) {\n            return $this->paymentsUnavailable();\n        }\n        $validator = Validator::make(\n            $input,\n            ['auto_renewal' => 'required|boolean'],",
    "auto renewal guard",
)
controller = replace_once(
    controller,
    "        if (!$user) {\n            return $this->unauthorized();\n        }\n\n        $input = $this->jsonInput();\n        $validator = Validator::make(\n            $input,\n            [\n                'number' => 'required|string|max:32',",
    "        if (!$user) {\n            return $this->unauthorized();\n        }\n\n        if (!PaymentsFeature::isEnabled()) {\n            return $this->paymentsUnavailable();\n        }\n\n        $input = $this->jsonInput();\n        $validator = Validator::make(\n            $input,\n            [\n                'number' => 'required|string|max:32',",
    "card store controller guard",
)
controller = replace_once(
    controller,
    "    private function unauthorized()\n    {\n        return $this->json([\n            'success' => false,\n            'message' => 'Необходима е автентикация.',\n        ], 401);\n    }\n}",
    "    private function unauthorized()\n    {\n        return $this->json([\n            'success' => false,\n            'message' => 'Необходима е автентикация.',\n        ], 401);\n    }\n\n    private function paymentsUnavailable()\n    {\n        return $this->json([\n            'success' => false,\n            'code' => 'payments_disabled',\n            'message' => 'Плащанията не са достъпни в тази версия.',\n        ], 503);\n    }\n}",
    "payment unavailable response",
)
sources["app/Controllers/Api/PaymentMethodController.php"] = controller

controller = sources["app/Controllers/Api/SubscriptionController.php"]
controller = replace_once(
    controller,
    "use App\\Services\\SubscriptionService;\n",
    "use App\\Services\\PaymentsFeature;\nuse App\\Services\\SubscriptionService;\n",
    "subscription feature import",
)
controller = replace_once(
    controller,
    "        $user = $this->authenticatedUser(); if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);\n        $input = json_decode(file_get_contents('php://input'), true);",
    "        $user = $this->authenticatedUser(); if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);\n        if (!PaymentsFeature::isEnabled()) return $this->paymentsUnavailable();\n        $input = json_decode(file_get_contents('php://input'), true);",
    "checkout controller guard",
)
controller = replace_once(
    controller,
    "    public function webhook()\n    {\n        try { $this->subscriptions->handleWebhook",
    "    public function webhook()\n    {\n        if (!PaymentsFeature::isEnabled()) return $this->paymentsUnavailable();\n        try { $this->subscriptions->handleWebhook",
    "webhook controller guard",
)
controller = replace_once(
    controller,
    "    public function webhook()\n    {\n        if (!PaymentsFeature::isEnabled()) return $this->paymentsUnavailable();\n        try { $this->subscriptions->handleWebhook(file_get_contents('php://input'), $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''); return $this->json(['received' => true]); }\n        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 400); }\n    }\n}",
    "    public function webhook()\n    {\n        if (!PaymentsFeature::isEnabled()) return $this->paymentsUnavailable();\n        try { $this->subscriptions->handleWebhook(file_get_contents('php://input'), $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''); return $this->json(['received' => true]); }\n        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 400); }\n    }\n\n    private function paymentsUnavailable()\n    {\n        return $this->json([\n            'success' => false,\n            'code' => 'payments_disabled',\n            'message' => 'Плащанията не са достъпни в тази версия.',\n        ], 503);\n    }\n}",
    "subscription unavailable response",
)
sources["app/Controllers/Api/SubscriptionController.php"] = controller

new_feature = os.path.abspath("auth/app/Services/PaymentsFeature.php")
if not os.path.isfile(new_feature):
    raise SystemExit("PaymentsFeature.php missing")
sources["app/Services/PaymentsFeature.php"] = open(new_feature, encoding="utf-8").read()

manifest = []
for relative, text in sources.items():
    destination = os.path.join(output, relative)
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    with open(destination, "w", encoding="utf-8", newline="") as target:
        target.write(text)
    os.chmod(destination, 0o644)
    raw = open(destination, "rb").read()
    manifest.append({"path": relative, "sha256": hashlib.sha256(raw).hexdigest(), "mode": "0644"})

with open(os.path.join(output, "manifest.json"), "w", encoding="utf-8") as target:
    json.dump(sorted(manifest, key=lambda x: x["path"]), target, ensure_ascii=False, indent=2)
    target.write("\n")
os.chmod(os.path.join(output, "manifest.json"), 0o644)
print(f"release_files={len(manifest)}")
