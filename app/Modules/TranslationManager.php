<?php

namespace App\Modules;

use App\Models\Translation;
use App\Core\App;
use App\Core\View;

class TranslationManager
{
    public static function save(string $resourceType, int $resourceId, array $fields): void
    {
        $languages = array_merge([App::$defaultLang], App::$supportedLangs);

        foreach ($fields as $fieldName => $translations) {
            foreach ($languages as $langCode) {
                $key = "{$resourceType}_{$resourceId}_{$fieldName}";
                $value = $translations[$langCode] ?? '';

                Translation::updateOrCreate(
                    ['lang_code' => $langCode, 'translation_key' => $key],
                    ['translation_value' => $value]
                );
            }
        }
    }

    public static function getForResource(string $resourceType, int $resourceId): array
    {
        $prefix = "{$resourceType}_{$resourceId}_";
        $translations = Translation::where('translation_key', 'LIKE', $prefix . '%')->get();

        $data = [];
        foreach ($translations as $t) {
            $fieldName = str_replace($prefix, '', $t->translation_key);
            $data[$fieldName][$t->lang_code] = $t->translation_value;
        }

        return $data;
    }

    public static function deleteForResource(string $resourceType, int $resourceId): void
    {
        $prefix = "{$resourceType}_{$resourceId}_";
        Translation::where('translation_key', 'LIKE', $prefix . '%')->delete();
    }

    public static function renderFields(array $fields, array $currentTranslations = []): string
    {
        $languages = array_merge([App::$defaultLang], App::$supportedLangs);

        ob_start();
?>
        <div class="space-y-5">
            <?php foreach ($languages as $lang):
                $isDefault = ($lang === App::$defaultLang);
                $sectionTitle = "Превод: " . strtoupper($lang);
                $icon = $isDefault ? 'fa-language' : 'fa-globe';
            ?>

                <?php Form::section($sectionTitle, function () use ($fields, $currentTranslations, $lang) { ?>

                    <div class="grid grid-cols-1 gap-5">
                        <?php foreach ($fields as $key => $config): ?>
                            <?php
                            $type  = $config['type'] ?? 'text';
                            $label = $config['label'] ?? $key;
                            $help  = $config['help'] ?? '';
                            $id    = ($config['id'] ?? $key) . '-' . $lang;

                            $value = $currentTranslations[$key][$lang] ?? '';
                            $inputName = "translations[{$key}][{$lang}]";

                            $fullLabel = $label . " (" . strtoupper($lang) . ")";

                            $options = [
                                'id'   => $id,
                                'help' => $help,
                                'placeholder' => "Въведете " . mb_strtolower($label) . "..."
                            ];
                            ?>

                            <div class="w-full">
                                <?php switch ($type):
                                    case 'editor': ?>
                                    <div id="<?= $id ?>">
                                        <?php View::component('form-editor', 'admin/partials', [
                                            'name'  => $inputName,
                                            'label' => $fullLabel,
                                            'value' => $value,
                                            'id'    => $id,
                                            'help'  => $help
                                        ]); ?>
                                    </div>
                                        <?php break;

                                    case 'textarea':
                                        Form::textarea($fullLabel, $inputName, $value, $options);
                                        break;

                                    default:
                                        Form::input($fullLabel, $inputName, $value, 'text', $options);
                                        break;
                                endswitch; ?>
                            </div>

                        <?php endforeach; ?>
                    </div>

                <?php }, $icon); ?>

            <?php endforeach; ?>
        </div>
    <?php
        return ob_get_clean();
    }
}