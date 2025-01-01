interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'success' | 'warning';
}

export function ErrorMessage({ message, type = 'error' }: ErrorMessageProps) {
  const bgColors = {
    error: 'bg-red-900/10',
    success: 'bg-green-900/10',
    warning: 'bg-yellow-900/10',
  };

  const textColors = {
    error: 'text-red-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
  };

  return (
    <div className={`rounded-md ${bgColors[type]} p-4`}>
      <div className="flex">
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${textColors[type]}`}>
            {message}
          </h3>
        </div>
      </div>
    </div>
  );
} 