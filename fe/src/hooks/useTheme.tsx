import { useEffect, useState } from 'react';

export const useTheme = () => {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');

	// Load theme on mount
	useEffect(() => {
		const savedTheme = document.cookie
			.split('; ')
			.find(row => row.startsWith('theme='))
			?.split('=')[1] as 'light' | 'dark';

		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.classList.toggle('dark', savedTheme === 'dark');
		}
	}, []);

	// Toggle theme function
	const toggleTheme = () => {
		const newTheme = theme === 'dark' ? 'light' : 'dark';
		setTheme(newTheme);

		// Save to cookie
		document.cookie = `theme=${newTheme}; max-age=${60 * 60 * 24 * 365}; path=/`;
		document.documentElement.classList.toggle('dark', newTheme === 'dark');
	};

	return { theme, toggleTheme };
}; 