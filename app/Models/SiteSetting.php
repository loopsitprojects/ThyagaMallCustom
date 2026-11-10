<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    /** Homepage hero: '3d' (animated gift scene) or 'images' (uploaded image carousel). */
    public const HERO_MODE = 'hero_mode';

    public const HERO_MODE_3D = '3d';

    public const HERO_MODE_IMAGES = 'images';

    protected $fillable = ['key', 'value'];

    public static function getValue(string $key, ?string $default = null): ?string
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function setValue(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
