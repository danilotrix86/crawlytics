"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
	Card,
	FileInput,
	Label,
	Button,
	Alert,
	Spinner
} from 'flowbite-react';
import { CloudArrowUp, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useFileUploadMutation, useTaskStatusQuery } from '../../hooks/queries/apiQueries';
import { UploadResponse, TaskStatusResponse } from '../../hooks/queries/types';
import { setCookie, getCookie } from '../../utils/cookies';
import { useNavigate } from 'react-router-dom';

/**
 * Log file upload component with spinner indicator
 * Uses React 19 features and TanStack Query for state management
 */
export function LogFileUpload() {
	const [file, setFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [countdown, setCountdown] = useState<number | null>(null);
	const [taskId, setTaskId] = useState<string | null>(null);
	const [processingComplete, setProcessingComplete] = useState(false);
	const [taskStartTime, setTaskStartTime] = useState<number | null>(null);
	
	// 2 minute timeout for task initialization (in milliseconds)
	const TASK_INIT_TIMEOUT = 120000;

	// Use our specialized hook for handling file uploads
	const uploadMutation = useFileUploadMutation<UploadResponse, File>({
		onSuccess: (data) => {
			// Invalidate and refetch logs list query to show the newly added log
			queryClient.invalidateQueries({ queryKey: ['logFiles'] });
			
			// Set the cookie with the newly uploaded log file ID
			const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
			const COOKIE_NAME = 'selected_log_file';
			
			// Set the cookie
			setCookie(COOKIE_NAME, data.log_file_id, COOKIE_MAX_AGE);
			
			// Set task ID for polling and record start time
			setTaskId(data.log_file_id);
			setTaskStartTime(Date.now());
		}
	});

	// Use our specialized hook for polling task status
	const taskStatusQuery = useTaskStatusQuery(taskId, {
		enabled: !!taskId && !processingComplete,
		refetchInterval: 2000, // Poll every 2 seconds
		retry: 3
	});

	// Determine current state for UI rendering
	const isUploading = uploadMutation.isPending || (taskId && !processingComplete);
	const isSuccess = processingComplete;
	const isError = uploadMutation.isError;
	const error = uploadMutation.error as Error;
	const taskStatus = taskStatusQuery.data;
	const uploadResult = processingComplete && taskStatus ? taskStatus : uploadMutation.data;

	// Effect to watch task status changes
	useEffect(() => {
		const data = taskStatusQuery.data;
		
		if (data && (data.status === 'complete' || data.status === 'processing_complete')) {
			// Task is complete
			setProcessingComplete(true);
			// Start the countdown for auto-redirect
			setCountdown(5);
			return;
		}
		
		// Check if task initialization has timed out
		if (taskStartTime && Date.now() - taskStartTime > TASK_INIT_TIMEOUT && 
		    data && data.status === 'processing') {
			// After timeout, force a redirect
			console.log('Task initialization timed out, proceeding to dashboard');
			setProcessingComplete(true);
			setCountdown(5);
		}
	}, [taskStatusQuery.data, taskStartTime]);

	// Countdown effect for auto-redirect
	useEffect(() => {
		// Only start countdown if we have a value and processing is complete
		if (countdown !== null && countdown > 0 && processingComplete) {
			const timer = setTimeout(() => {
				setCountdown(countdown - 1);
			}, 1000);
			return () => clearTimeout(timer);
		} else if (countdown === 0 && processingComplete && taskId) {
			// When countdown reaches zero, redirect
			// Make absolutely sure cookie is set
			document.cookie = `selected_log_file=${taskId}; max-age=${7 * 24 * 60 * 60}; path=/`;
			
			// Force a complete page reload
			window.location.href = '/dashboard';
		}
	}, [countdown, processingComplete, taskId]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setFile(e.target.files[0]);
		}
	};

	const handleUpload = async () => {
		if (!file) return;
		// Reset status
		setTaskId(null);
		setTaskStartTime(null);
		setProcessingComplete(false);
		
		uploadMutation.mutate(file);
	};

	const handleReset = () => {
		// Reset state
		setFile(null);
		setTaskId(null);
		setTaskStartTime(null);
		setProcessingComplete(false);
		
		uploadMutation.reset();
		queryClient.removeQueries({ queryKey: ['taskStatus', taskId] });
		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	// Simple status message for display
	const getStatusMessage = () => {
		if (!taskStatus) return 'Initializing...';
		if (taskStatus.message) return taskStatus.message;
		return `Status: ${taskStatus.status}`;
	};

	return (
		<Card className="w-full flex flex-col">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Server Log</h2>
				<CloudArrowUp className="w-8 h-8 text-blue-600" />
			</div>

			{/* File selection area */}
			<div className="mb-4">
				<div className="mb-2 block">
					<Label htmlFor="log-file">Select log file to upload</Label>
				</div>
				<FileInput
					ref={fileInputRef}
					id="log-file"
					onChange={handleFileChange}
					disabled={isUploading || isSuccess}
					accept=".log,.txt"
				/>
				<div className="mt-1 text-sm text-gray-500">
					Choose a server log file (.log or .txt)
				</div>
				{file && !isUploading && !isSuccess && (
					<p className="mt-2 text-sm text-gray-500">
						Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
					</p>
				)}
			</div>

			{/* Spinner indicator during upload */}
			{isUploading && (
				<div className="flex flex-col items-center justify-center py-6">
					<Spinner size="xl" className="mb-4" />
					<p className="text-center text-gray-700 dark:text-gray-300">
						{file && (
							<>
								{processingComplete ? 'Processing complete!' : 'Uploading and processing'} {file.name}<br />
								<span className="text-sm text-gray-500">
									{(file.size / 1024 / 1024).toFixed(2)} MB - This may take several minutes for large files
								</span>
							</>
						)}
					</p>
					
					<Alert color="warning" className="mt-4">
						<h3 className="font-medium">Please wait while we process your file</h3>
						<p className="mt-1 text-sm">
							Do not close this page. You will be redirected to the dashboard automatically when processing is complete.
						</p>
						{taskStatus && (
							<p className="mt-2 text-xs text-gray-600">
								Current status: {getStatusMessage()}
							</p>
						)}
					</Alert>
				</div>
			)}

			{/* Success message */}
			{isSuccess && uploadResult && (
				<Alert color="success" icon={CheckCircle} className="mb-4">
					<h3 className="font-medium">Upload Successful!</h3>
					<ul className="mt-1 text-sm list-disc list-inside">
						<li>Log file ID: {(uploadResult as UploadResponse | TaskStatusResponse).log_file_id}</li>
						<li>Records imported: {(uploadResult as UploadResponse | TaskStatusResponse).records_imported}</li>
						<li>File size: {(uploadResult as UploadResponse | TaskStatusResponse).file_size_mb.toFixed(2)} MB</li>
						{(uploadResult as UploadResponse | TaskStatusResponse).issues && 
						 (uploadResult as UploadResponse | TaskStatusResponse).issues.length > 0 && (
							<li>
								Issues encountered: {(uploadResult as UploadResponse | TaskStatusResponse).issues.length}
								<ul className="pl-4 mt-1 list-disc list-inside">
									{(uploadResult as UploadResponse | TaskStatusResponse).issues.slice(0, 3).map((issue, i) => (
										<li key={i} className="text-xs">{issue}</li>
									))}
									{(uploadResult as UploadResponse | TaskStatusResponse).issues.length > 3 && (
										<li className="text-xs">...and {(uploadResult as UploadResponse | TaskStatusResponse).issues.length - 3} more</li>
									)}
								</ul>
							</li>
						)}
					</ul>
					<p className="mt-2 text-sm font-medium">
						Redirecting to dashboard in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
					</p>
				</Alert>
			)}

			{/* Error message */}
			{isError && (
				<Alert color="failure" icon={ExclamationCircle} className="mb-4">
					<h3 className="font-medium">Upload Failed</h3>
					<p className="mt-1 text-sm">
						{error?.message || 'An error occurred during upload. Please try again.'}
					</p>
				</Alert>
			)}

			{/* Action buttons */}
			<div className="flex justify-end gap-3 mt-auto">
				{isSuccess || isError ? (
					<>
						<Button color="light" onClick={handleReset}>
							Upload Another File
						</Button>
						{isSuccess && (
							<Button color="blue" onClick={() => {
								// Make absolutely sure cookie is set
								if (taskId) {
									// Set cookie with path explicitly set to root
									document.cookie = `selected_log_file=${taskId}; max-age=${7 * 24 * 60 * 60}; path=/`;
									
									// Force a complete page reload rather than React Router navigation
									window.location.href = '/dashboard';
								}
							}}>
								View Dashboard Now
							</Button>
						)}
					</>
				) : (
					<>
						<Button
							color="light"
							onClick={handleReset}
							disabled={isUploading || !file}
						>
							Cancel
						</Button>
						<Button
							color="blue"
							onClick={handleUpload}
							disabled={isUploading || !file}
						>
							{isUploading ? (
								<>
									<Spinner size="sm" className="mr-2" />
									Processing...
								</>
							) : (
								'Upload Log File'
							)}
						</Button>
					</>
				)}
			</div>
		</Card>
	);
} 