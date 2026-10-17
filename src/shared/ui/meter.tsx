interface MeterMarker {
	value: number;
	label: string;
}

interface MeterProps {
	label: string;
	/** 0–1. */
	value: number;
	valueText: string;
	/** Tailwind background class for the filled part, e.g. "bg-approve". */
	fillClassName: string;
	/** Threshold lines drawn over the bar. */
	markers?: readonly MeterMarker[];
	emphasized?: boolean;
}

function clampUnit(value: number): number {
	return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** One row: label | thin bar | monospaced value. Optional threshold markers on the bar. */
export function Meter({
	label,
	value,
	valueText,
	fillClassName,
	markers = [],
	emphasized = false,
}: MeterProps) {
	const unit = clampUnit(value);
	const markerText = markers.map((m) => `${m.label}: ${Math.round(m.value * 100)} %`).join(". ");

	return (
		<div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]">
			<span className={`truncate ${emphasized ? "font-semibold" : "text-ink-muted"}`} title={label}>
				{label}
			</span>
			{/* biome-ignore lint/a11y/useSemanticElements: native <meter> cannot draw threshold markers. */}
			<div
				role="meter"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(unit * 100)}
				aria-valuetext={markerText ? `${valueText}. ${markerText}` : valueText}
				className="relative h-1.5 rounded-full bg-surface-muted ring-1 ring-line ring-inset"
			>
				<div
					className={`h-full rounded-full ${fillClassName}`}
					style={{ width: `${unit * 100}%` }}
				/>
				{markers.map((marker) => (
					<span
						key={marker.label}
						title={marker.label}
						className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink"
						style={{ left: `calc(${clampUnit(marker.value) * 100}% - 1px)` }}
					/>
				))}
			</div>
			<span className="min-w-[3.5rem] text-right font-mono text-xs tabular-nums sm:text-sm">
				{valueText}
			</span>
		</div>
	);
}
