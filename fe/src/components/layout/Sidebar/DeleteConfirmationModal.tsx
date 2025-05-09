import React from 'react';
import { Modal, Button, Spinner } from 'flowbite-react';
import { ExclamationCircle } from 'flowbite-react-icons/outline';
import { LogFile } from '../../../hooks/useLogFiles';
import './DeleteConfirmationModal.css';

interface DeleteConfirmationModalProps {
    showModal: boolean;
    fileToDelete: LogFile | null;
    deletingLogId: string | null;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation modal for deleting log files
 */
export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    showModal,
    fileToDelete,
    deletingLogId,
    onClose,
    onConfirm
}) => {
    // Define red button styles
    const redButtonStyle = {
        backgroundColor: '#ef4444', 
        borderColor: '#dc2626',
        color: 'white'
    };

    return (
        <Modal 
            show={showModal} 
            size="md" 
            onClose={onClose} 
            popup
            theme={{
                root: {
                    base: "fixed top-0 right-0 left-0 z-50 h-modal h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full",
                    show: {
                        on: "flex bg-gray-900 bg-opacity-50 dark:bg-opacity-80",
                        off: "hidden"
                    }
                },
                content: {
                    base: "relative h-full w-full rounded-lg shadow",
                }
            }}
        >
            <div className="text-center p-6">
                <ExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
                <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-300">
                    Are you sure you want to delete the log file <span className="font-semibold">{fileToDelete?.file_name}</span>?
                </h3>
                <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">
                    All associated data will be permanently removed. This action cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                    <Button 
                        color="failure" 
                        onClick={onConfirm}
                        disabled={!!deletingLogId}
                        className="border border-red-600 !bg-red-500"
                        style={redButtonStyle}
                    >
                        {deletingLogId === fileToDelete?.log_file_id ? (
                            <>
                                <Spinner size="sm" />
                                <span className="pl-3">Deleting...</span>
                            </>
                        ) : (
                            "Yes, I'm sure"
                        )}
                    </Button>
                    <Button 
                        color="gray" 
                        onClick={onClose} 
                        disabled={!!deletingLogId}
                        className="border dark:border-gray-600 border-gray-300"
                    >
                        No, cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}; 