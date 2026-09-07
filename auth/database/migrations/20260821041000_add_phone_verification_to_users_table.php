<?php

use Phinx\Migration\AbstractMigration;

final class AddPhoneVerificationToUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');

        if (!$table->hasColumn('phone_verified_at')) {
            $table->addColumn('phone_verified_at', 'datetime', [
                'null' => true,
                'after' => 'phone',
            ]);
        }

        if (!$table->hasColumn('phone_verification_hash')) {
            $table->addColumn('phone_verification_hash', 'string', [
                'limit' => 64,
                'null' => true,
                'after' => 'phone_verified_at',
            ]);
        }

        if (!$table->hasColumn('phone_verification_expires_at')) {
            $table->addColumn('phone_verification_expires_at', 'datetime', [
                'null' => true,
                'after' => 'phone_verification_hash',
            ]);
        }

        if (!$table->hasColumn('phone_verification_sent_at')) {
            $table->addColumn('phone_verification_sent_at', 'datetime', [
                'null' => true,
                'after' => 'phone_verification_expires_at',
            ]);
        }

        if (!$table->hasColumn('phone_verification_phone')) {
            $table->addColumn('phone_verification_phone', 'string', [
                'limit' => 20,
                'null' => true,
                'after' => 'phone_verification_sent_at',
            ]);
        }

        $table->update();
    }
}
