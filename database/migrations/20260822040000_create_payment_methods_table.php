<?php

use Phinx\Migration\AbstractMigration;

final class CreatePaymentMethodsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('payment_methods')) {
            return;
        }

        $table = $this->table('payment_methods', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'integer', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('brand', 'string', [
                'limit' => 32,
                'null' => false,
            ])
            ->addColumn('last4', 'string', [
                'limit' => 4,
                'null' => false,
            ])
            ->addColumn('exp_month', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('exp_year', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('holder_name', 'string', [
                'limit' => 80,
                'null' => true,
            ])
            ->addColumn('pan_ciphertext', 'text', [
                'null' => false,
            ])
            ->addColumn('is_default', 'boolean', [
                'default' => false,
                'null' => false,
            ])
            ->addColumn('created_at', 'datetime', [
                'null' => true,
            ])
            ->addColumn('updated_at', 'datetime', [
                'null' => true,
            ])
            ->addIndex(['user_id'], ['name' => 'idx_payment_methods_user'])
            ->addIndex(
                ['user_id', 'last4', 'exp_month', 'exp_year', 'brand'],
                [
                    'unique' => true,
                    'name' => 'uk_payment_methods_card',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_payment_methods_user',
                ]
            )
            ->create();
    }
}
