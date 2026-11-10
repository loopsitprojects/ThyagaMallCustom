'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Category } from '@/types';

// One request per page load, shared by every component that shows categories.
let cachedTree: Promise<Category[]> | null = null;

function loadCategoryTree(): Promise<Category[]> {
  if (!cachedTree) {
    cachedTree = api
      .getCategories()
      .then((res) => (res.success ? res.data : []))
      .catch(() => {
        cachedTree = null; // allow a retry on the next mount
        return [];
      });
  }
  return cachedTree;
}

/** Active category tree from the database (top level, each with nested `children`). */
export function useCategories(): { categories: Category[]; isLoading: boolean } {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCategoryTree().then((tree) => {
      if (!cancelled) setCategories(tree);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories: categories ?? [], isLoading: categories === null };
}

export function categoryHref(category: Pick<Category, 'slug'>): string {
  return `/shop?category=${encodeURIComponent(category.slug)}`;
}

/** Tile gradient for a category, falling back to the brand purple when no colours are set. */
export function categoryGradient(category: Pick<Category, 'color_from' | 'color_to'>): { from: string; to: string } {
  return { from: category.color_from || '#a78bfa', to: category.color_to || '#36135d' };
}

/**
 * Orders a flat category list (as returned by the admin API) parent-first, with each
 * sub-category directly under its parent and a `depth` for indentation.
 */
export function flattenCategoryTree(flat: Category[]): { category: Category; depth: number }[] {
  const byParent = new Map<number | null, Category[]>();
  flat.forEach((c) => {
    const key = c.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  });
  byParent.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));

  const rows: { category: Category; depth: number }[] = [];
  const walk = (parentId: number | null, depth: number) => {
    (byParent.get(parentId) ?? []).forEach((c) => {
      rows.push({ category: c, depth });
      walk(c.id, depth + 1);
    });
  };
  walk(null, 0);
  return rows;
}
