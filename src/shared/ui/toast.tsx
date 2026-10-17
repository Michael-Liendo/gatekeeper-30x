"use client";

import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

interface ToastAction {
	label: string;
	onAction: () => void;
}

interface Toast {
	id: number;
	message: string;
	action?: ToastAction;
}

interface ToastApi {
	notify: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_MS = 5000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
	useEffect(() => {
		const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_MS);
		return () => window.clearTimeout(timer);
	}, [toast.id, onDismiss]);

	return (
		<div className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-ink shadow-lg">
			<span className="min-w-0 flex-1">{toast.message}</span>
			{toast.action ? (
				<button
					type="button"
					onClick={() => {
						toast.action?.onAction();
						onDismiss(toast.id);
					}}
					className="min-h-9 shrink-0 rounded-md px-2 font-semibold underline underline-offset-2"
				>
					{toast.action.label}
				</button>
			) : null}
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				aria-label="Cerrar aviso"
				className="grid size-9 shrink-0 place-items-center rounded-md"
			>
				<span aria-hidden="true">×</span>
			</button>
		</div>
	);
}

/** Small transient confirmations ("Pieza aprobada") with an optional undo action. */
export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const dismiss = useCallback((id: number) => {
		setToasts((current) => current.filter((t) => t.id !== id));
	}, []);

	const notify = useCallback((message: string, action?: ToastAction) => {
		setToasts((current) => [
			...current.slice(-2),
			{ id: Date.now() + Math.random(), message, action },
		]);
	}, []);

	const api = useMemo(() => ({ notify }), [notify]);

	return (
		<ToastContext value={api}>
			{children}
			<div
				role="status"
				aria-live="polite"
				className="pointer-events-none fixed inset-x-4 bottom-24 z-50 grid justify-items-center gap-2 sm:inset-x-auto sm:right-6 sm:w-96 lg:bottom-6"
			>
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
				))}
			</div>
		</ToastContext>
	);
}

export function useToast(): ToastApi {
	const api = use(ToastContext);
	if (!api) throw new Error("useToast must be used inside ToastProvider");
	return api;
}
