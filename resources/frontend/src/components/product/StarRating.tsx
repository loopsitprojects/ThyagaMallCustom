'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  /** 0–5, fractions allowed when read-only */
  value: number;
  size?: string;
  /** Makes the stars clickable to pick a rating */
  onChange?: (value: number) => void;
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function StarRating({ value, size = 'w-4 h-4', onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, value - (star - 1)));
          return (
            <span key={star} className={`relative inline-block ${size}`}>
              <Star className={`absolute inset-0 ${size} text-gray-200 fill-gray-200`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${size} text-amber-400 fill-amber-400`} />
              </span>
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2" onMouseLeave={() => setHover(0)}>
      <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} – ${LABELS[star]}`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Star className={`${size} ${star <= shown ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-xs font-semibold text-gray-600">{LABELS[shown]}</span>}
    </div>
  );
}
