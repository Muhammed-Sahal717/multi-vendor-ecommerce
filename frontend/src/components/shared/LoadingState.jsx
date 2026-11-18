export const LoadingState = ({
  message = 'Loading...',
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-neutral-900 border-t-transparent" />
      {message && <p className="text-sm font-medium text-neutral-500">{message}</p>}
    </div>
  );
};

export default LoadingState;
