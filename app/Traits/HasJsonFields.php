<?php

namespace App\Traits;

trait HasJsonFields
{
    /**
     * Универсален метод за обновяване на модел с JSON сливане
     */
    public function updateModelWithJson($model, array $data, array $jsonFields = ['options'])
    {
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && is_array($data[$field])) {
                // Взимаме текущото съдържание от модела
                $current = (array) ($model->{$field} ?? []);

                // Сливаме и задаваме на модела
                $model->{$field} = array_merge($current, $data[$field]);

                // Махаме от масива, за да не се дублира при update()
                unset($data[$field]);
            }
        }

        // Записваме останалите полета директно в обекта на модела
        return $model->update($data);
    }
}
