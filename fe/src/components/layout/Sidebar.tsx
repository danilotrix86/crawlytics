/**
 * Re-export modularized Sidebar components
 */

"use client";

import React, { Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar, SidebarItem as FlowbiteSidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
import { ChartMixed, MapPin, Grid, FolderOpen, CloudArrowUp, Users, TableRow, QuestionCircle } from 'flowbite-react-icons/outline';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { LogFilesErrorFallback } from './Sidebar/LogFilesErrorFallback';
import { LogFilesLoading } from './Sidebar/LogFilesLoading';
import { LogFilesList } from './Sidebar/LogFilesList';

interface SidebarProps {
    className?: string;
}

// Custom SidebarItem that uses React Router Link
const SidebarItem = ({ to, icon, children, ...rest }: any) => {
    const location = useLocation();
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    
    const handleClick = (e: React.MouseEvent) => {
        // Set cookie for navigation history or user preferences
        document.cookie = `lastVisited=${to}; path=/; max-age=86400`;
    };

    // Use React Router's Link to preserve SPA navigation and prefetching
    return (
        <FlowbiteSidebarItem
            as={Link}
            to={to}
            icon={icon}
            onClick={handleClick}
            className={isActive ? 'sidebar-item-active' : 'transition-colors-standard'}
            {...rest}
        >
            {children}
        </FlowbiteSidebarItem>
    );
};

/**
 * Main application sidebar component
 */
export const AppSidebar: React.FC<SidebarProps> = ({ className }) => {
    const { reset } = useQueryErrorResetBoundary();
    
    return (
        <Sidebar 
            aria-label="Application sidebar" 
            className={`!bg-white dark:!bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-full ${className}`}
            theme={{
                root: {
                    base: "h-full w-full bg-white dark:bg-gray-800 flex flex-col",
                    inner: "h-full w-full flex flex-col bg-white dark:bg-gray-800"
                }
            }}
        >
            <div className="flex flex-col flex-grow py-4 px-3 flex-shrink-0 overflow-hidden min-h-0">
                <SidebarItems>
                    <SidebarItemGroup>
                        <SidebarItem to="/dashboard" icon={ChartMixed}>
                            Dashboard
                        </SidebarItem>
                        <SidebarItem to="/traffic-insight" icon={Users}>
                            Traffic Insight
                        </SidebarItem>
                        <SidebarItem to="/geographic-insight" icon={MapPin}>
                            Geographic Insight
                        </SidebarItem>
                        <SidebarItem to="/logs" icon={TableRow}>
                            Logs Table
                        </SidebarItem>
                        <SidebarItem to="/upload" icon={CloudArrowUp}>
                            Upload Log
                        </SidebarItem>
                    </SidebarItemGroup>
                    <SidebarItemGroup>
                        <h3 className="flex items-center px-3 py-2 font-semibold text-gray-900 dark:text-white">
                            <FolderOpen className="mr-2 h-5 w-5" />
                            Log Files
                        </h3>
                        <ErrorBoundary 
                            FallbackComponent={LogFilesErrorFallback}
                            onReset={reset}
                        >
                            <Suspense fallback={<LogFilesLoading />}>
                                <LogFilesList />
                            </Suspense>
                        </ErrorBoundary>
                    </SidebarItemGroup>
                </SidebarItems>
            </div>
            
            <div className="mt-auto py-4 px-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <SidebarItems>
                    <SidebarItemGroup>
                        <SidebarItem to="https://github.com/danilotrix86/crawlitycs/issues" icon={QuestionCircle}>
                            Open an issue on GitHub
                        </SidebarItem>
                    </SidebarItemGroup>
                </SidebarItems>
            </div>
        </Sidebar>
    );
};