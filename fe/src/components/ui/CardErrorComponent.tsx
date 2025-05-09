import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

/**
 * A reusable error component for API data loading issues
 * Provides a retry button to attempt the request again
 */
const CardErrorComponent: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
	return (
		<div className="min-h-36 rounded-lg bg-white border border-red-200 shadow transition-all duration-200 dark:bg-gray-800 dark:border-red-700">
			<div className="flex flex-col items-center justify-center h-full p-4">
				<p className="text-red-500 mb-2">Error loading data</p>
				
				{/* Error message always visible */}
				<p className="text-sm text-red-400 mb-3">{error.message}</p>
				
				<button
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					onClick={resetErrorBoundary}
				>
					Try Again
				</button>
			</div>
		</div>
	);
}

export default CardErrorComponent;