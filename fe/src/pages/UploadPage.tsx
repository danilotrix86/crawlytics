import React, { memo } from 'react';
import { LogFileUpload } from '../components/upload/LogFileUpload';

interface UploadPageProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const UploadPage: React.FC<UploadPageProps> = memo(({ className = '' }) => {
	return (
		<div className={`h-full flex flex-col ${className}`}>
			{/* React 19 Document Metadata */}
			<title>Upload Server Log - Crawlytics</title>
			<meta name="description" content="Upload server log files for analysis" />

			<div className="mb-4">
				<h1 className="text-3xl font-bold">Upload Server Log</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Upload a server log file to analyze it with Crawlytics.
				</p>
			</div>

			<div>
				<LogFileUpload />
			</div>
		</div>
	);
});

// Add display name for better debugging
UploadPage.displayName = 'UploadPage';

export default UploadPage; 