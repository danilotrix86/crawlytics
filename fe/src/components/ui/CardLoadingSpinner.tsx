import React from 'react';
import { Spinner } from "flowbite-react";

/**
 * A reusable loading spinner component with card styling
 */
const CardLoadingSpinner: React.FC = () => (
	<div className="min-h-36 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow animate-pulse transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
		<Spinner size="xl" />
	</div>
);

export default CardLoadingSpinner;