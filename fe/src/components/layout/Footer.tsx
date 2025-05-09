import React from 'react';
import { Footer as FlowbiteFooter, FooterBrand as FlowbiteFooterBrand, FooterCopyright as FlowbiteFooterCopyright, FooterDivider, FooterLink as FlowbiteFooterLink, FooterLinkGroup } from "flowbite-react";
import { Link } from 'react-router-dom';

interface FooterProps {
	className?: string;
}

// Custom FooterBrand that uses React Router Link
const FooterBrand = ({ to, children, ...rest }: any) => {
	return (
		<FlowbiteFooterBrand
			as={Link}
			to={to}
			{...rest}
		>
			{children}
		</FlowbiteFooterBrand>
	);
};

// Custom FooterLink that uses React Router Link
const FooterLink = ({ to, children, ...rest }: any) => {
	return (
		<FlowbiteFooterLink
			as={Link}
			to={to}
			{...rest}
		>
			{children}
		</FlowbiteFooterLink>
	);
};

// Custom FooterCopyright that uses React Router Link
const FooterCopyright = ({ to, by, year, ...rest }: any) => {
	return (
		<FlowbiteFooterCopyright
			as={Link}
			to={to}
			by={by}
			year={year}
			{...rest}
		/>
	);
};

export function Footer({ className = '' }: FooterProps) {
	return (
		<FlowbiteFooter container className={`rounded-none mt-auto ${className}`}>
			<div className="w-full text-center">
				<div className="w-full justify-between sm:flex sm:items-center sm:justify-between">
					<div className="flex items-center justify-center sm:justify-start mb-4 sm:mb-0">
						<Link to="/" className="flex items-center">
							<img 
								src="logo/crawlytics-logo-dark-color.png" 
								alt="Crawlytics Logo" 
								className="h-12 block dark:hidden" 
							/>
							<img 
								src="logo/crawlytics-logo-bright-color.png" 
								alt="Crawlytics Logo" 
								className="h-12 hidden dark:block" 
							/>
							
						</Link>
					</div>
					<FooterLinkGroup>
						<FooterLink to="https://www.linkedin.com/in/danilovaccalluzzo/">Help</FooterLink>
					</FooterLinkGroup>
				</div>
				<FooterDivider />
				<FooterCopyright to="/" by="Crawlytics" year={new Date().getFullYear()} />
			</div>
		</FlowbiteFooter>
	);
}