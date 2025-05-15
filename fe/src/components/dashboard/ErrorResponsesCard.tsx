import React, { useState, useEffect } from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { ExclamationCircle } from 'flowbite-react-icons/solid';
import { 
	useLogFileData, 
	DataComponentWrapper,
	getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface ErrorRateData {
	redirect_responses: number;
	client_errors: number;
	server_errors: number;
	total_requests: number;
}

// Modal component to display detailed error counts
const ErrorDetailsModal: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	title: string;
	redirectResponses: number;
	clientErrors: number;
	serverErrors: number;
	totalRequests: number;
}> = ({ isOpen, onClose, title, redirectResponses, clientErrors, serverErrors, totalRequests }) => {
	if (!isOpen) return null;

	const calculatePercentage = (count: number) => {
		if (totalRequests === 0) return '0.0%';
		return ((count / totalRequests) * 100).toFixed(1) + '%';
	};

	const errorCategories = [
		{ label: 'Redirects (3xx)', count: redirectResponses, percentage: calculatePercentage(redirectResponses), color: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300', textColor: 'text-yellow-700 dark:text-yellow-400' },
		{ label: 'Client Errors (4xx)', count: clientErrors, percentage: calculatePercentage(clientErrors), color: 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-300', textColor: 'text-orange-700 dark:text-orange-400' },
		{ label: 'Server Errors (5xx)', count: serverErrors, percentage: calculatePercentage(serverErrors), color: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-300', textColor: 'text-red-700 dark:text-red-400' },
	];

	return (
		<div className="fixed inset-0 z-50 overflow-auto bg-gray-500/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
			<div 
				className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col backdrop-blur-sm"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
					<button 
						onClick={onClose}
						className="text-gray-400 hover:text-gray-500 focus:outline-none transition-colors"
						aria-label="Close"
					>
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
							<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
						</svg>
					</button>
				</div>
				
				{/* Body */}
				<div className="px-4 py-3 flex-grow overflow-y-auto">
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
						Breakdown of HTTP responses by status code category. Total requests: {totalRequests}.
					</p>
					
					<div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
						<ul className="divide-y divide-gray-200 dark:divide-gray-700">
							{errorCategories.map((category, index) => (
								<li key={index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
									<span className={`flex-1 font-medium ${category.textColor}`}>{category.label}</span>
									<span className={`text-xs px-2 py-1 rounded ${category.color}`}>
										{category.count} ({category.percentage})
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
				
				{/* Footer */}
				<div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:outline-none"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

// Inner component for logic
const ErrorResponsesCardComponent: React.FC = () => {
	const [openModal, setOpenModal] = useState(false);
	// Base SQL query with WHERE 1=1 to safely add conditions
	const sqlQuery = `
		SELECT 
			COUNT(CASE WHEN status >= 300 AND status < 400 THEN 1 ELSE NULL END) as redirect_responses,
			COUNT(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE NULL END) as client_errors,
			COUNT(CASE WHEN status >= 500 THEN 1 ELSE NULL END) as server_errors,
			COUNT(*) as total_requests
		FROM access_logs 
		WHERE 1=1 {LOG_FILE_CONDITION}
	`;

	// Use our custom hook instead of manually building the query
	const { data: errorData, logFileId } = useLogFileData<ErrorRateData[], ErrorRateData>(
		sqlQuery,
		[],
		(data) => data?.[0]
	);

	const redirectResponses = errorData?.redirect_responses ?? 0;
	const clientErrors = errorData?.client_errors ?? 0;
	const serverErrors = errorData?.server_errors ?? 0;
	const totalErrors = clientErrors + serverErrors;
	const totalRequests = errorData?.total_requests ?? 0;
	
	// Calculate error rate as percentage (based on 4xx and 5xx)
	const errorRate = totalRequests > 0 
		? ((totalErrors / totalRequests) * 100).toFixed(1) 
		: "0.0";
	
	const handleModalOpen = () => {
		if (totalRequests > 0) {
			setOpenModal(true);
		}
	};
	
	// Add "View Details" text and make it clickable
	useEffect(() => {
		if (totalRequests > 0) {
			const cardContainer = document.querySelector('.error-responses-card-container');
			const subtextElement = cardContainer?.querySelector('.text-gray-500');

			if (subtextElement && !subtextElement.querySelector('.view-details-link')) {
				const originalText = subtextElement.textContent;
				subtextElement.innerHTML = `${originalText} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1 view-details-link">(View Details)</span>`;
			}
			
			if (cardContainer && !(cardContainer as any).hasClickListener) {
				cardContainer.addEventListener('click', handleModalOpen);
				(cardContainer as any).hasClickListener = true;
			}
		}
	}, [totalRequests, logFileId, clientErrors, serverErrors, handleModalOpen]);

	const statsCardProps = {
		data: {
			title: "⚠️ Error Rate",
			number: `${errorRate}%`,
			subtext: `${totalErrors} errors (${clientErrors} client / ${serverErrors} server)${getLogFileSuffix(logFileId)}`,
		},
		icon: ExclamationCircle,
	};

	return (
		<div className="error-responses-card-container">
			<StatsCard {...statsCardProps} />
			<ErrorDetailsModal
				isOpen={openModal}
				onClose={() => setOpenModal(false)}
				title="HTTP Response Code Breakdown"
				redirectResponses={redirectResponses}
				clientErrors={clientErrors}
				serverErrors={serverErrors}
				totalRequests={totalRequests}
			/>
		</div>
	);
};

// Exported component with DataComponentWrapper
export const ErrorResponsesCard: React.FC = () => (
	<DataComponentWrapper>
		<ErrorResponsesCardComponent />
	</DataComponentWrapper>
); 