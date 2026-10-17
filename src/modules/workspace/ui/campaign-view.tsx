"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { EmptyState } from "@/modules/content-review/ui/empty-state";
import { CHANNEL_LABEL } from "@/modules/content-review/ui/labels";
import { LoadingBlock } from "@/modules/content-review/ui/loading-block";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import { UploadIcon } from "@/shared/ui/icons";
import { PillTabs } from "@/shared/ui/pill-tabs";
import { type CalendarWeek, groupByWeek } from "../domain/campaign-calendar";
import type { PieceStatus, WorkspacePiece } from "../domain/workspace";
import { StatusPill } from "./status-pill";
import { usePieces } from "./use-pieces";
import {
	formatLongDay,
	formatScheduled,
	formatWeekday,
	STATUS_LABEL,
	STATUS_STYLE,
	STATUSES,
} from "./workspace-labels";
import { WorkspaceThumb } from "./workspace-thumb";

type StatusFilter = "all" | PieceStatus;
const ALL_CAMPAIGNS = "";

function pieceHref(piece: WorkspacePiece): string {
	return `/pieza/${encodeURIComponent(piece.id)}`;
}

function todayIso(): string {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

const uploadLink = (
	<Link href="/campana/cargar" className={primaryButton}>
		<UploadIcon size={18} />
		Cargar grilla (Excel o CSV)
	</Link>
);

/** Compact card for the desktop week strip. */
function StripCard({ piece }: { piece: WorkspacePiece }) {
	const style = STATUS_STYLE[piece.status];
	return (
		<li>
			<Link
				href={pieceHref(piece)}
				className="grid gap-2 rounded-2xl border border-line bg-surface p-2 transition-colors hover:bg-surface-muted"
			>
				<WorkspaceThumb piece={piece} size="wide" />
				<span className="line-clamp-2 text-xs font-medium leading-snug">{piece.title}</span>
				<span className="flex items-center justify-between gap-1 text-[0.6875rem] text-ink-muted">
					<span className="truncate">{CHANNEL_LABEL[piece.channel]}</span>
					<span
						role="img"
						aria-label={STATUS_LABEL[piece.status]}
						title={STATUS_LABEL[piece.status]}
						className={`size-2 shrink-0 rounded-full ${style.dot}`}
					/>
				</span>
			</Link>
		</li>
	);
}

/** Row card for the phone/tablet agenda. */
function AgendaCard({ piece }: { piece: WorkspacePiece }) {
	return (
		<li>
			<Link
				href={pieceHref(piece)}
				className="flex items-center gap-3 rounded-[20px] border border-line p-3 transition-colors hover:bg-surface-muted"
			>
				<WorkspaceThumb piece={piece} size="lg" />
				<span className="grid min-w-0 flex-1 gap-0.5">
					<span className="line-clamp-2 text-sm font-medium">{piece.title}</span>
					<span className="text-xs text-ink-muted">
						{CHANNEL_LABEL[piece.channel]}
						{piece.campaign ? ` · ${piece.campaign}` : ""}
					</span>
				</span>
				<StatusPill status={piece.status} />
			</Link>
		</li>
	);
}

function Week({ week, today }: { week: CalendarWeek<WorkspacePiece>; today: string }) {
	const headingId = `week-${week.start}`;
	return (
		<section aria-labelledby={headingId} className="grid gap-3">
			<h2 id={headingId} className="flex items-baseline justify-between gap-3">
				<span className="text-lg font-normal">
					Semana del {formatScheduled(week.start)} al {formatScheduled(week.end)}
				</span>
				<span className="text-sm text-ink-muted tabular-nums">
					{week.total} {week.total === 1 ? "pieza" : "piezas"}
				</span>
			</h2>

			{/* Desktop: 7-column week strip. */}
			<ol className="hidden gap-2 lg:grid lg:grid-cols-7">
				{week.days.map((day) => {
					const isToday = day.date === today;
					return (
						<li
							key={day.date}
							aria-label={formatLongDay(day.date)}
							className={`grid min-h-32 content-start gap-2 rounded-[20px] p-2 ${
								isToday ? "bg-pill" : "bg-surface-muted"
							}`}
						>
							<p className="flex items-baseline justify-between px-1 text-xs">
								<span className="text-ink-muted capitalize">{formatWeekday(day.date)}</span>
								<span className="font-medium tabular-nums">{Number(day.date.slice(8, 10))}</span>
							</p>
							{day.items.length > 0 ? (
								<ul className="grid gap-2">
									{day.items.map((piece) => (
										<StripCard key={piece.id} piece={piece} />
									))}
								</ul>
							) : null}
						</li>
					);
				})}
			</ol>

			{/* Phones and tablets: agenda of the days that have pieces. */}
			<ol className="grid gap-4 lg:hidden">
				{week.days
					.filter((day) => day.items.length > 0)
					.map((day) => (
						<li key={day.date} className="grid gap-2">
							<p className="text-sm font-medium">
								{formatLongDay(day.date)}
								{day.date === today ? (
									<span className="ml-2 rounded-full bg-pill px-2 py-0.5 text-xs text-pill-ink">
										Hoy
									</span>
								) : null}
							</p>
							<ul className="grid gap-2">
								{day.items.map((piece) => (
									<AgendaCard key={piece.id} piece={piece} />
								))}
							</ul>
						</li>
					))}
			</ol>
		</section>
	);
}

/** /campana: "Tu campaña", the scheduled pieces grouped by week and day. */
export function CampaignView() {
	const { state, retry } = usePieces();
	const campaignSelectId = useId();
	const [campaign, setCampaign] = useState(ALL_CAMPAIGNS);
	const [status, setStatus] = useState<StatusFilter>("all");

	const header = (
		<PageHeader
			title="Tu campaña"
			description="Las piezas de tu grilla, por semana y por día, con lo que dijo JEV de cada una. Adiós al Excel."
			actions={
				<Link href="/campana/cargar" className={secondaryButton}>
					<UploadIcon size={18} />
					Cargar grilla (Excel o CSV)
				</Link>
			}
		/>
	);

	if (state.status === "loading") {
		return (
			<>
				{header}
				<LoadingBlock />
			</>
		);
	}
	if (state.status === "error") {
		return (
			<>
				{header}
				<EmptyState
					title="No pudimos cargar tu campaña"
					action={
						<button type="button" onClick={retry} className={secondaryButton}>
							Reintentar
						</button>
					}
				>
					{state.message}
				</EmptyState>
			</>
		);
	}

	const scheduled = state.pieces
		.filter((piece) => piece.scheduledFor)
		.sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));

	if (scheduled.length === 0) {
		return (
			<>
				<PageHeader
					title="Tu campaña"
					description="Las piezas de tu grilla, por semana y por día, con lo que dijo JEV de cada una."
				/>
				<EmptyState title="Todavía no hay piezas programadas" action={uploadLink}>
					Sube el Excel o CSV con el que planificas tu campaña. JEV revisa cada pieza con tu marca y
					aquí ves qué sale cada día y en qué estado está. Sin copiar y pegar.
				</EmptyState>
			</>
		);
	}

	const campaigns = [
		...new Set(scheduled.map((piece) => piece.campaign).filter(Boolean)),
	] as string[];
	const inCampaign =
		campaign === ALL_CAMPAIGNS ? scheduled : scheduled.filter((p) => p.campaign === campaign);
	const visible = status === "all" ? inCampaign : inCampaign.filter((p) => p.status === status);
	const weeks = groupByWeek(visible, (piece) => piece.scheduledFor);
	const today = todayIso();

	const tabs = [
		{ value: "all" as StatusFilter, label: "Todas", count: inCampaign.length },
		...STATUSES.map((s) => ({
			value: s as StatusFilter,
			label: STATUS_LABEL[s],
			count: inCampaign.filter((piece) => piece.status === s).length,
		})),
	];

	return (
		<>
			{header}
			<div className="grid grid-cols-[minmax(0,1fr)] gap-6">
				<div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
					<PillTabs
						tabs={tabs}
						value={status}
						onChange={setStatus}
						label="Filtrar por estado"
						mode="filter"
					/>
					{campaigns.length > 0 ? (
						<div className="flex items-center gap-2">
							<label htmlFor={campaignSelectId} className="text-sm text-ink-muted">
								Campaña
							</label>
							<select
								id={campaignSelectId}
								value={campaign}
								onChange={(event) => setCampaign(event.target.value)}
								className="min-h-10 max-w-60 rounded-full border border-line-strong bg-surface px-4 text-sm"
							>
								<option value={ALL_CAMPAIGNS}>Todas</option>
								{campaigns.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
						</div>
					) : null}
				</div>

				{weeks.length === 0 ? (
					<p className="rounded-card bg-surface-muted px-5 py-6 text-sm text-ink-muted">
						No hay piezas con este filtro.
					</p>
				) : (
					weeks.map((week) => <Week key={week.start} week={week} today={today} />)
				)}
			</div>
		</>
	);
}
