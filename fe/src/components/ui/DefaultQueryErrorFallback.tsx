import React from 'react';
import { FallbackProps } from 'react-error-boundary';

export const DefaultQueryErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
	return (
		<div className="p-4 border border-red-500 rounded bg-red-50">
			<h3 className="text-lg font-medium text-red-800">Error loading data</h3>
			<p className="mt-1 text-sm text-red-600">{error?.message || 'An unknown error occurred'}</p>
			<button
				className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				onClick={resetErrorBoundary}
				aria-label="Retry data fetch"
			>
				Retry
			</button>
		</div>
	);
}; 