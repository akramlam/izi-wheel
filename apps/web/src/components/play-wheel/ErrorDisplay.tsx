import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: any;
}

export const ErrorDisplay = ({ error }: ErrorDisplayProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md flex flex-col items-center space-y-4">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
      <p className="text-gray-500 text-center">
        We couldn't load the wheel. Please try again later or contact support.
      </p>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-500 hover:text-blue-700"
      >
        {showDetails ? 'Hide' : 'Show'} technical details
      </button>

      {showDetails && (
        <div className="w-full bg-gray-100 p-4 rounded text-left overflow-auto text-xs">
          <p>
            <strong>Error:</strong> {error?.message || String(error)}
          </p>
          <p>
            <strong>URL:</strong> {window.location.href}
          </p>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </button>
    </div>
  );
};