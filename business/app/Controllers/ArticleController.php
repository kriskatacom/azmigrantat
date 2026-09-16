<?php

namespace App\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Tag;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class ArticleController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(Article::class, 'admin/articles/index', [
            'title'         => 'Управление на статии',
            'resource_name' => 'articles',
            'with'          => ['category', 'tags'],
            'search_fields' => ['title', 'content', 'excerpt'],
            'features'      => ['status']
        ]);
    }

    public function create()
    {
        $this->renderAdmin('admin/articles/form', ['title' => 'Нова статия'], [
            'article'    => new Article(),
            'categories' => Category::ordered()->get(),
            'tags'       => Tag::all()
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'title'       => 'required|min:3',
            'slug'        => 'nullable|unique:articles,slug',
            'category_id' => 'required|exists:categories,id'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);
        $article = new Article();

        $this->updateResource($article, $data, ['image', 'image_desktop', 'image_tablet', 'image_phone']);

        $this->syncTags($article, $_POST['tags'] ?? []);

        $this->flash('success', 'Статията е създадена!');
        $this->redirect("/admin/articles/edit/{$article->id}");
    }

    public function edit($id)
    {
        $article = Article::with('tags')->findOrFail($id);
        $this->renderAdmin('admin/articles/form', ['title' => 'Редакция: ' . $article->title], [
            'article'    => $article,
            'categories' => Category::ordered()->get(),
            'tags'       => Tag::all()
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $article = Article::findOrFail($id);

        $rules = [
            'title'       => 'required|min:3',
            'slug'        => 'nullable|unique:articles,slug,' . $article->id,
            'category_id' => 'required|exists:categories,id'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $article);

        $this->updateResource($article, $data, ['image', 'image_desktop', 'image_tablet', 'image_phone']);

        $this->syncTags($article, $_POST['tags'] ?? []);

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $item = Article::findOrFail($id);
            $item->delete();
            $this->flash('info', 'Статията беше преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Статията не може да бъде намерена.');
        }
        return $this->redirectTrashOrIndex(Article::class, 'articles');
    }

    public function restore($id)
    {
        $item = Article::onlyTrashed()->findOrFail($id);
        $item->restore();
        $this->flash('info', 'Статията беше възстановена успешно.');
        return $this->redirectTrashOrIndex(Article::class, 'articles');
    }

    public function forceDelete($id)
    {
        $item = Article::onlyTrashed()->findOrFail($id);
        $item->forceDelete();
        $this->flash('info', 'Статията беше изтрита завинаги.');
        return $this->redirectTrashOrIndex(Article::class, 'articles');
    }

    private function prepareData(array $input, ?Article $article = null): array
    {
        return [
            'title'        => $input['title'],
            'slug'         => $input['slug'] ?: Str::slug($input['title']),
            'content'      => $input['content'] ?? '',
            'excerpt'      => $input['excerpt'] ?? null,
            'category_id'  => $input['category_id'] ?: null,
            'status'       => $input['status'] ?? Article::STATUS_DRAFT,
            'published_at' => $input['published_at'] ?: ($article ? $article->published_at : date('Y-m-d H:i:s')),
            'options'      => $input['options'] ?? []
        ];
    }

    private function syncTags(Article $article, array $tags)
    {
        $tagIds = [];
        foreach ($tags as $tagData) {
            if (str_starts_with($tagData, 'new:')) {
                $tagName = str_replace('new:', '', $tagData);
                $newTag = Tag::firstOrCreate([
                    'name' => $tagName,
                    'slug' => Str::slug($tagName)
                ]);
                $tagIds[] = $newTag->id;
            } else {
                $tagIds[] = (int)$tagData;
            }
        }
        $article->tags()->sync($tagIds);
    }
}
