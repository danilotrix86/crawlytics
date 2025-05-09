import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { AppSidebar } from '../components/layout/Sidebar';
import { Footer } from '../components/layout/Footer';
import { usePrefetching } from '../hooks/usePrefetching';

interface FullWidthSidebarProps {
	className?: string;
}

const FullWidthSidebar: React.FC<FullWidthSidebarProps> = ({ className = '' }) => {
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
	
	// Initialize prefetching for likely navigation paths
	usePrefetching();
	
	const handleToggleSidebar = (): void => {
		setIsSidebarOpen(prevState => !prevState);
	};

	return (
		<div className={`flex flex-col h-dvh overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors-standard ${className}`}>
			<Header onToggleSidebar={handleToggleSidebar} />

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar with responsive behavior */}
				<div className={`
					fixed md:relative md:flex
					h-[calc(100dvh-65px)] 
					w-80
					shadow-lg shadow-gray-200/50 dark:shadow-gray-900/30 md:shadow-none
					transition-standard
					-translate-x-full md:translate-x-0
					overflow-hidden
					${isSidebarOpen ? 'translate-x-0' : ''}
				`}>
					<AppSidebar />
				</div>
				
				{/* Overlay for mobile */}
				{isSidebarOpen && (
					<div 
						className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-10 md:hidden transition-standard animate-fade-in" 
						onClick={handleToggleSidebar}
						aria-hidden="true"
						tabIndex={-1}
					/>
				)}

				<div className="flex-1 overflow-auto flex flex-col">
					<main className={`
						flex-1 p-4 md:p-6
						transition-standard
						bg-gray-50 dark:bg-gray-900
						md:shadow-[-8px_0_16px_-10px_rgba(0,0,0,0.05)]
						dark:md:shadow-[-8px_0_16px_-10px_rgba(0,0,0,0.15)]
					`}>
						<Outlet />
					</main>
					<Footer />
				</div>
			</div>
		</div>
	);
};

export default FullWidthSidebar; 