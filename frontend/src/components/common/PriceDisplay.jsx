export const PriceDisplay = ({
  price,
  originalPrice,
  currency = 'INR',
  className = '',
  priceClassName = 'text-lg font-bold text-neutral-900',
  originalPriceClassName = 'text-sm text-neutral-400 line-through',
}) => {
  const formatPrice = (amount) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '₹0.00';
    }

    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `₹${Number(amount).toFixed(2)}`;
    }
  };

  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={priceClassName}>{formatPrice(price)}</span>
      {hasDiscount && (
        <span className={originalPriceClassName}>{formatPrice(originalPrice)}</span>
      )}
    </div>
  );
};

export default PriceDisplay;
