<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class HeroBannerImage extends Model
{
    /** Filesystem disk (public/uploads) that holds the uploaded banner files. */
    public const DISK = 'public_uploads';

    public const DIRECTORY = 'hero';

    protected $fillable = [
        'image_path',
        'alt_text',
        'title',
        'subtitle',
        'cta_text',
        'link',
        'sort_order',
        'is_active',
    ];

    /** @var list<string> */
    protected $appends = ['image_url'];

    /**
     * Site-relative URL of the file (the storefront prefixes its base path).
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn (): string => '/uploads/'.ltrim($this->image_path, '/'));
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
