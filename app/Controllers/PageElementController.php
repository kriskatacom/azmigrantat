<?php

namespace App\Controllers;

use App\Models\Page;
use App\Models\PageElement;
use App\Models\PageElementValue;
use App\Services\MediaService;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class PageElementController extends BaseController
{
    use HasAdminTrait;

    protected MediaService $mediaService;

    public function __construct()
    {
        $this->mediaService = new MediaService();
    }

    public function elements($pageId)
    {
        $page = Page::findOrFail($pageId);
        $elements = PageElement::where('page_id', $pageId)
            ->orderBy('sort_order', 'asc')
            ->get();

        $values = PageElementValue::getMappedByPageId($pageId);

        return $this->renderAdmin('admin/pages/elements/index', [
            'title' => 'Елементи на страницата: ' . $page->title
        ], [
            'page'     => $page,
            'elements' => $elements,
            'values'   => $values,
            'pageId'   => $pageId
        ]);
    }

    #[HandleExceptions]
    public function updateElements($pageId)
    {
        $elementsData = $_POST['elements'] ?? [];
        $removeData   = $_POST['remove_elements'] ?? [];
        $filesData    = $_FILES['elements'] ?? [];

        // 1. Обработка на изтриванията на файлове/стойности
        foreach ($removeData as $elementId => $isRemoved) {
            if ($isRemoved == "1") {
                $this->deleteElementValueFile($pageId, $elementId);
                unset($elementsData[$elementId]);
            }
        }

        // 2. Обновяване на текстови данни
        foreach ($elementsData as $elementId => $value) {
            PageElementValue::updateOrCreate(
                ['page_id' => $pageId, 'element_id' => $elementId],
                ['value'   => $value]
            );
        }

        // 3. Качване на нови файлове
        if (!empty($filesData['name'])) {
            $this->handleFilesUpload($pageId, $filesData);
        }

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function createElement($pageId)
    {
        $page = Page::findOrFail($pageId);

        $this->renderAdmin('admin/pages/elements/form', ['title' => 'Нова дефиниция на елемент'], [
            'pageId'  => $pageId,
            'page'    => $page,
            'element' => new PageElement()
        ]);
    }

    #[HandleExceptions]
    public function storeElement($pageId)
    {
        $validator = Validator::make($_POST, [
            'name' => 'required',
            'slug' => 'required'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;
        $data['page_id']   = $pageId;
        $data['is_active'] = isset($_POST['is_active']);

        PageElement::create($data);

        $this->flash('success', 'Елементът е създаден!');
        $this->redirect("/admin/pages/elements/$pageId");
    }

    public function editElement($pageId, $elementId)
    {
        $element = PageElement::where('page_id', $pageId)->findOrFail($elementId);

        $this->renderAdmin('admin/pages/elements/form', ['title' => 'Редакция на дефиниция'], [
            'element' => $element,
            'pageId'  => $pageId
        ]);
    }

    #[HandleExceptions]
    public function updateElementDefinition($pageId, $elementId)
    {
        $element = PageElement::where('page_id', $pageId)->findOrFail($elementId);

        $data = $_POST;
        $data['is_active'] = isset($_POST['is_active']);

        $element->update($data);

        $this->flash('success', 'Дефиницията е обновена!');
        $this->redirectBack();
    }

    #[HandleExceptions]
    public function deleteElement($pageId, $elementId)
    {
        $element = PageElement::where('page_id', $pageId)->findOrFail($elementId);

        if ($element->type === 'image') {
            $this->deleteElementValueFile($pageId, $elementId);
        }

        $element->delete();
        $this->flash('success', 'Елементът е премахнат.');
        $this->redirectBack();
    }

    #[HandleExceptions]
    public function deleteSection($pageId)
    {
        $sectionName = $_POST['group_name'] ?? null;
        if ($sectionName) {
            PageElement::where('page_id', $pageId)
                ->where('section_name', $sectionName)
                ->delete();
            $this->flash('success', "Секция '$sectionName' е изтрита.");
        }
        $this->redirectBack();
    }

    #[HandleExceptions]
    public function import($pageId)
    {
        if (!isset($_FILES['json_file']) || $_FILES['json_file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Грешка при качване на файла.');
        }

        $json = file_get_contents($_FILES['json_file']['tmp_name']);
        $data = json_decode($json, true);

        if (!$data) throw new Exception("Невалиден JSON формат.");

        foreach ($data as $item) {
            $item['page_id'] = $pageId;
            PageElement::create($item);
        }

        $this->flash('success', 'Елементите са импортирани успешно!');
        $this->redirectBack();
    }

    // Помощни методи
    private function deleteElementValueFile($pageId, $elementId)
    {
        $oldValue = PageElementValue::where('page_id', $pageId)
            ->where('element_id', $elementId)
            ->first();

        if ($oldValue && $oldValue->value) {
            $this->mediaService->deleteFile($oldValue->value);
            $oldValue->update(['value' => null]);
        }
    }

    private function handleFilesUpload($pageId, $filesData)
    {
        foreach ($filesData['name'] as $elementId => $fileName) {
            if ($filesData['error'][$elementId] === UPLOAD_ERR_OK) {
                $fileArray = [
                    'name'     => $filesData['name'][$elementId],
                    'type'     => $filesData['type'][$elementId],
                    'tmp_name' => $filesData['tmp_name'][$elementId],
                    'error'    => $filesData['error'][$elementId],
                    'size'     => $filesData['size'][$elementId],
                ];

                if ($this->mediaService->isAllowedType($fileArray['type'])) {
                    $this->deleteElementValueFile($pageId, $elementId);

                    $media = $this->mediaService->upload($fileArray, "Page $pageId Element $elementId");

                    PageElementValue::updateOrCreate(
                        ['page_id' => $pageId, 'element_id' => $elementId],
                        ['value'   => $media->file_path]
                    );
                }
            }
        }
    }
}
