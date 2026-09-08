<?php

use Phinx\Migration\AbstractMigration;

final class HashOauthAccessTokens extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('oauth_access_tokens')) {
            return;
        }

        $rows = $this->fetchAll('SELECT `id`, `token` FROM `oauth_access_tokens`');
        $connection = $this->getAdapter()->getConnection();

        foreach ($rows as $row) {
            $plain = (string) ($row['token'] ?? '');

            if ($plain === '' || $this->isSha256Hex($plain)) {
                continue;
            }

            $hash = hash('sha256', $plain);
            $id = (int) $row['id'];
            $quoted = $connection->quote($hash);
            $this->execute(
                "UPDATE `oauth_access_tokens` SET `token` = {$quoted} WHERE `id` = {$id}"
            );
        }
    }

    public function down(): void
    {
        // Хеширането е еднопосочно — старите plaintext стойности не могат да се възстановят.
    }

    private function isSha256Hex(string $value): bool
    {
        return strlen($value) === 64 && ctype_xdigit($value);
    }
}
