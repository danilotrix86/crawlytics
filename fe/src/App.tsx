import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { usePrefetching } from './hooks/usePrefetching';

const App: React.FC = () => {
	// Monitor for log file changes to invalidate the cache
	usePrefetching();

	return <AppRoutes />;
}

export default App; 