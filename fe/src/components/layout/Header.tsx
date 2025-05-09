import React from 'react';
import { Navbar, NavbarBrand as FlowbiteNavbarBrand, NavbarCollapse, NavbarLink as FlowbiteNavbarLink, NavbarToggle } from "flowbite-react";
import { Link } from "react-router-dom";
import { DarkThemeToggle } from 'flowbite-react';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
	onToggleSidebar: () => void;
}

// Custom NavbarBrand that uses React Router Link
const NavbarBrand = ({ to, children, ...rest }: any) => {
	return (
		<FlowbiteNavbarBrand
			as={Link}
			to={to}
			{...rest}
		>
			{children}
		</FlowbiteNavbarBrand>
	);
};

// Custom NavbarLink that uses React Router Link
const NavbarLink = ({ to, children, active, ...rest }: any) => {
	return (
		<FlowbiteNavbarLink
			as={Link}
			to={to}
			active={active}
			{...rest}
		>
			{children}
		</FlowbiteNavbarLink>
	);
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
	const { toggleTheme } = useTheme();
	
	return (
		<Navbar fluid rounded className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xs sticky top-0 z-30">
			<NavbarBrand to="/">
				<img 
					src="logo/crawlytics-logo-dark-color.png" 
					alt="Crawlytics Logo" 
					className="h-14 block dark:hidden" 
				/>
				<img 
					src="logo/crawlytics-logo-bright-color.png" 
					alt="Crawlytics Logo" 
					className="h-14 hidden dark:block" 
				/>
			</NavbarBrand>
			<div className="flex md:hidden items-center gap-2">
				<DarkThemeToggle onClick={toggleTheme} />
				<NavbarToggle onClick={onToggleSidebar} />
			</div>
			<NavbarCollapse className="md:flex md:flex-row items-center justify-between">
				<div className="hidden md:flex items-center">
					<DarkThemeToggle onClick={toggleTheme} />
				</div>
			</NavbarCollapse>
		</Navbar>
	);
};
