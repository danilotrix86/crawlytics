import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FullWidthSidebar from '../layout/FullWidthSidebar';
import Dashboard from '../pages/Dashboard';
import UploadPage from '../pages/UploadPage';
import TrafficInsight from '../pages/TrafficInsight';
import LogsTable from '../pages/LogsTable';
import GeographicInsight from '../pages/GeographicInsight';

// Using React 19 function declaration style without unnecessary props
const AppRoutes = () => (
	<Routes>
		{/* Routes with FullWidthSidebar layout */}
		<Route element={<FullWidthSidebar />}>
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/upload" element={<UploadPage />} />
			<Route path="/traffic-insight" element={<TrafficInsight />} />
			<Route path="/geographic-insight" element={<GeographicInsight />} />
			<Route path="/logs" element={<LogsTable />} />
			<Route path="/" element={<Navigate to="/dashboard" replace />} />
		</Route>
	</Routes>
);

export default AppRoutes; 