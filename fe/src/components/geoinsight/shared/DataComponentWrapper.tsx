import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import CardLoadingSpinner from '../../ui/CardLoadingSpinner';
import { DefaultQueryErrorFallback } from '../../ui/DefaultQueryErrorFallback';

interface DataComponentWrapperProps {
  children: React.ReactNode;
}

export const DataComponentWrapper: React.FC<DataComponentWrapperProps> = ({ children }) => {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary 
      onReset={reset} 
      FallbackComponent={DefaultQueryErrorFallback}
      onError={(error) => {
        console.error("Data component error:", error);
        // Optionally log errors to analytics
      }}
    >
      <Suspense fallback={<CardLoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default DataComponentWrapper; 