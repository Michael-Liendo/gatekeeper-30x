import type { ReactNode, SVGProps } from "react";

/** Thin line icons (stroke 1.5), decorative by default: pair them with visible text or aria-label. */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			{children}
		</svg>
	);
}

export function InboxIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3.5 13.5 6 5.5h12l2.5 8" />
			<path d="M3.5 13.5v4a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-4h-5a3.5 3.5 0 0 1-7 0z" />
		</Svg>
	);
}

export function GridIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="4" y="4" width="6.5" height="6.5" rx="2" />
			<rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
			<rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
			<rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
		</Svg>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 5v14M5 12h14" />
		</Svg>
	);
}

export function SlidersIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
			<circle cx="15" cy="7" r="2" />
			<circle cx="9" cy="17" r="2" />
		</Svg>
	);
}

export function ChartIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 19.5h16" />
			<path d="M7 16v-4M12 16V7M17 16v-6" />
		</Svg>
	);
}

export function SparkleIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z" />
			<path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z" />
		</Svg>
	);
}

export function TagIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2a1.5 1.5 0 0 1 1 .4l7.4 7.4a1.5 1.5 0 0 1 0 2.2l-7.2 7.2a1.5 1.5 0 0 1-2.2 0l-7.3-7.4a1.5 1.5 0 0 1-.4-1.1z" />
			<circle cx="8.5" cy="8.5" r="1.25" />
		</Svg>
	);
}

export function SignOutIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" />
			<path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
		</Svg>
	);
}

export function SearchIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="11" cy="11" r="6.5" />
			<path d="m16 16 4 4" />
		</Svg>
	);
}

export function RefreshIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
			<path d="M19.5 4.5v4h-4" />
		</Svg>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="m5 12.5 4.5 4.5L19 7.5" />
		</Svg>
	);
}

export function CloseIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
		</Svg>
	);
}

export function EyeIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
			<circle cx="12" cy="12" r="2.75" />
		</Svg>
	);
}

export function ArrowLeftIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M19 12H5M11 6l-6 6 6 6" />
		</Svg>
	);
}

export function ChevronDownIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="m6 9 6 6 6-6" />
		</Svg>
	);
}

export function UploadIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" />
			<path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
		</Svg>
	);
}

export function ClockIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8" />
			<path d="M12 8v4l2.5 2" />
		</Svg>
	);
}

export function CoinIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8" />
			<path d="M14.5 9.5c-.4-.9-1.3-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5V8M12 16v1.5" />
		</Svg>
	);
}

export function BoardIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="3.5" y="4.5" width="5" height="15" rx="1.75" />
			<rect x="9.5" y="4.5" width="5" height="10" rx="1.75" />
			<rect x="15.5" y="4.5" width="5" height="12.5" rx="1.75" />
		</Svg>
	);
}

export function StackIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 4 20 8.5 12 13 4 8.5z" />
			<path d="m4 12.5 8 4.5 8-4.5" />
			<path d="m4 16 8 4.5 8-4.5" />
		</Svg>
	);
}

export function MoreIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="6" cy="12" r="1" />
			<circle cx="12" cy="12" r="1" />
			<circle cx="18" cy="12" r="1" />
		</Svg>
	);
}
