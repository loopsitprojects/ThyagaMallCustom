interface OutOfStockBadgeProps {
  /** Position and size classes, so it can sit where each page's discount tag would */
  className?: string;
}

/** Replaces a product's discount tag when it has no stock left. */
export default function OutOfStockBadge({ className = '' }: OutOfStockBadgeProps) {
  return (
    <div className={`absolute bg-gray-800 text-white font-extrabold uppercase tracking-wide shadow-xs ${className}`}>
      Out of Stock
    </div>
  );
}
