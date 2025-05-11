import React, { memo, useState, useEffect } from 'react';
import { Button, Card, Label, Textarea, Alert } from 'flowbite-react';
import { Modal } from 'flowbite-react';
import { useCrawlerPatternsQuery, useUpdateCrawlerPatternsMutation, useResetCrawlerPatternsMutation } from '../hooks/queries/apiQueries';
import { Cog } from 'flowbite-react-icons/outline';

interface SettingsProps {
    className?: string;
}

// Use memo to prevent unnecessary re-renders
const Settings: React.FC<SettingsProps> = memo(({ className = '' }) => {
    const [patterns, setPatterns] = useState<string>('');
    const [savedPatterns, setSavedPatterns] = useState<string[]>([]);
    const [alertType, setAlertType] = useState<'success' | 'failure' | null>(null);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const [showResetModal, setShowResetModal] = useState<boolean>(false);

    // Query for getting crawler patterns with caching disabled to always get fresh data
    const { data, isLoading, error, refetch } = useCrawlerPatternsQuery({
        // Disable caching to always fetch fresh data
        staleTime: 0,
        gcTime: 0,
        retry: 1,
        refetchOnMount: true,
        refetchOnWindowFocus: true
    });

    // Mutation for updating crawler patterns
    const { mutate: updatePatterns, isPending } = useUpdateCrawlerPatternsMutation({
        onSuccess: () => {
            setAlertType('success');
            setAlertMessage('LLM crawler patterns updated successfully');
            
            // Refetch the patterns to get the updated list
            refetch();
            
            // Clear the alert after 3 seconds
            setTimeout(() => {
                setAlertType(null);
                setAlertMessage('');
            }, 3000);
        },
        onError: (error) => {
            setAlertType('failure');
            setAlertMessage(`Error updating patterns: ${error.message}`);
        }
    });

    // Reset mutation
    const { mutate: resetPatterns, isPending: isResetting } = useResetCrawlerPatternsMutation({
        onSuccess: () => {
            setAlertType('success');
            setAlertMessage('LLM crawler patterns reset to default values');
            
            // Refetch the patterns to get the updated list
            refetch();
            
            // Clear the alert after 3 seconds
            setTimeout(() => {
                setAlertType(null);
                setAlertMessage('');
            }, 3000);
        },
        onError: (error) => {
            setAlertType('failure');
            setAlertMessage(`Error resetting patterns: ${error.message}`);
        }
    });

    // Update the patterns when data is loaded
    useEffect(() => {
        if (data?.patterns) {
            const formattedPatterns = data.patterns.join('\n');
            setPatterns(formattedPatterns);
            setSavedPatterns(data.patterns);
        }
    }, [data]);

    // Handle updating crawler patterns
    const handleUpdatePatterns = () => {
        // Split the textarea content by newlines, trim each line, and filter out empty lines
        const patternsList = patterns
            .split('\n')
            .map(pattern => pattern.trim())
            .filter(pattern => pattern.length > 0);
        
        // Only update if there are changes
        if (JSON.stringify(patternsList) !== JSON.stringify(savedPatterns)) {
            updatePatterns(patternsList);
        } else {
            setAlertType('failure');
            setAlertMessage('No changes to save');
            
            // Clear the alert after 3 seconds
            setTimeout(() => {
                setAlertType(null);
                setAlertMessage('');
            }, 3000);
        }
    };

    // Handle textarea changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPatterns(e.target.value);
    };

    // Handle resetting crawler patterns
    const handleResetPatterns = () => {
        setShowResetModal(false);
        resetPatterns();
    };

    return (
        <div className={className}>
            {/* React 19 Document Metadata */}
            <title>Crawlytics Settings</title>
            <meta name="description" content="Configure Crawlytics settings" />

            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            
            {/* Alert message */}
            {alertType && (
                <Alert
                    color={alertType}
                    className="mb-4"
                >
                    {alertMessage}
                </Alert>
            )}
            
            <Card className="mb-6">
                <h2 className="text-xl font-semibold mb-2">LLM Crawler Patterns</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Add or modify the list of LLM crawlers. Each crawler should be on a new line.
                    <strong className="block mt-2">Important:</strong> These patterns should be updated before uploading 
                    new log files, as the upload process uses this list to identify and extract crawlers 
                    from your logs and save them in the database.
                    <small className="block mt-2 text-gray-500">Note: Enter only the crawler name (e.g., "GPTBot"), not the provider information.</small>
                </p>
                
                <div className="mb-4">
                    <div className="mb-2 block">
                        <Label htmlFor="patterns">Crawler list</Label>
                    </div>
                    <Textarea
                        id="patterns"
                        placeholder={isLoading ? "Loading patterns..." : "Enter crawler patterns, one per line"}
                        value={patterns}
                        onChange={handleChange}
                        rows={15}
                        className="font-mono text-sm"
                        disabled={isLoading}
                    />
                </div>
                
                <div className="flex justify-between">
                    <Button
                        color="light"
                        onClick={() => setShowResetModal(true)}
                        disabled={isLoading || isPending || isResetting}
                    >
                        Reset to Default
                    </Button>
                    <Button
                        onClick={handleUpdatePatterns}
                        disabled={isLoading || isPending || isResetting}
                    >
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Card>

            {/* Reset confirmation modal */}
            <Modal 
                show={showResetModal} 
                onClose={() => setShowResetModal(false)}
            >
                <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Reset to Default</h3>
                    <div className="space-y-4 mb-6">
                        <p>Are you sure you want to reset crawler patterns to default values? This will replace all current patterns with the default list.</p>
                        <p className="text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
                    </div>
                    <div className="flex justify-end gap-4">
                        <Button color="gray" onClick={() => setShowResetModal(false)}>
                            Cancel
                        </Button>
                        <Button color="failure" onClick={handleResetPatterns} disabled={isResetting}>
                            {isResetting ? 'Resetting...' : 'Reset Patterns'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

// Add display name for better debugging
Settings.displayName = 'Settings';

export default Settings; 