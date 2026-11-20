import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button.jsx';

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'Failed to load data from the server. Please try again.',
  onRetry,
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle size={28} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-5 gap-2">
          <RotateCcw size={16} />
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
