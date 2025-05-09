import React, { ComponentType } from 'react';
import { Card } from "flowbite-react";

interface StatsCardProps {
	data: {
		title: string;
		number: number | string;
		subtext?: string;
	};
	icon: ComponentType<{ className?: string }>;
}

export function Component({ data, icon: IconComponent }: StatsCardProps): React.ReactElement {
	return (
		<Card className="transition-standard hover:shadow-lg min-h-36 dark:bg-gray-800 border-l-4 border-blue-500 overflow-hidden group">
			<div className="flex justify-between items-start">
				<div className="flex flex-col gap-2">
					<p className="text-gray-600 dark:text-gray-300 font-medium text-sm uppercase tracking-wider">{data.title}</p>
					<div className="flex items-baseline gap-3">
						<p className="text-2xl font-bold leading-none text-gray-800 dark:text-white transition-standard group-hover:text-blue-600 dark:group-hover:text-blue-400">{data.number}</p>
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-base font-medium">
						{data.subtext || "this year"}
					</p>
				</div>
				
				<div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg transition-standard group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40">
					<IconComponent className="w-8 h-8 text-blue-600 dark:text-blue-400" />
				</div>
			</div>
		</Card>
	);
}
