<?php

namespace App\Services;

use App\Models\SiteSetting;

/**
 * The storefront's onboarding ad: a welcome pop-up shown to visitors,
 * configured in Admin → Onboarding Ad and stored as JSON in site_settings.
 */
class OnboardingAdSettings
{
    public const KEY = 'onboarding_ad';

    public const DISK = 'public_uploads';

    public const DIRECTORY = 'ads';

    public const FREQUENCIES = ['once', 'daily', 'session'];

    public const PAGES = ['all', 'home'];

    public const LAYOUTS = ['split', 'image'];

    /**
     * @return array{enabled: bool, layout: string, badge: ?string, title: ?string, body: ?string, coupon_code: ?string, cta_text: ?string, cta_link: ?string, dismiss_text: ?string, accent_color: string, image_path: ?string, delay_seconds: int, frequency: string, pages: string, version: int}
     */
    public function defaults(): array
    {
        return [
            'enabled' => false,
            'layout' => 'split',
            'badge' => 'Welcome to Thyaga Mall',
            'title' => 'Get Rs. 1,000 OFF your first order',
            'body' => 'Shop electronics, home, beauty, fashion and more — delivered islandwide in 3–5 working days.',
            'coupon_code' => null,
            'cta_text' => 'Start Shopping',
            'cta_link' => '/shop',
            'dismiss_text' => 'Maybe later',
            'accent_color' => '#431968',
            'image_path' => null,
            'delay_seconds' => 3,
            'frequency' => 'once',
            'pages' => 'all',
            'version' => 1,
        ];
    }

    /**
     * Current settings merged over the defaults, plus the public image URL.
     *
     * @return array<string, mixed>
     */
    public function get(): array
    {
        $stored = json_decode((string) SiteSetting::getValue(self::KEY), true);
        $settings = array_merge($this->defaults(), is_array($stored) ? array_intersect_key($stored, $this->defaults()) : []);
        $settings['image_url'] = $settings['image_path'] ? '/uploads/'.ltrim($settings['image_path'], '/') : null;

        return $settings;
    }

    /**
     * Save changes and bump the version so visitors who dismissed an older ad see the new one.
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function update(array $changes): array
    {
        $current = $this->get();
        unset($current['image_url']);

        $next = array_merge($current, array_intersect_key($changes, $this->defaults()));
        $next['version'] = (int) $current['version'] + 1;

        SiteSetting::setValue(self::KEY, json_encode($next));

        return $this->get();
    }
}
