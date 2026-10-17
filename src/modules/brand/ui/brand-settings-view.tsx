"use client";

import { useState } from "react";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { linkButton, primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import { useToast } from "@/shared/ui/toast";
import type { BrandProfile, BrandProfileInput } from "../domain/brand-profile";
import { extractBrand, saveBrand } from "./brand-api";
import { BrandForm } from "./brand-form";
import {
	type BrandFormErrors,
	mergeDraft,
	normalizeBrandInput,
	normalizeUrl,
	toBrandInput,
	validateBrandInput,
} from "./brand-input";
import { ExtractingStatus } from "./extracting-status";

function BrandEditor({ brand }: { brand: BrandProfile }) {
	const { setBrand } = useSession();
	const { notify } = useToast();
	const [input, setInput] = useState<BrandProfileInput>(() => toBrandInput(brand));
	const [errors, setErrors] = useState<BrandFormErrors>({});
	const [warnings, setWarnings] = useState<string[]>([]);
	const [extracting, setExtracting] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const links = input.links.map(normalizeUrl).filter((url): url is string => url !== null);

	async function reanalyze() {
		if (links.length === 0) {
			setMessage("Agrega el enlace de tu sitio web para volver a analizarlo.");
			return;
		}
		setMessage(null);
		setExtracting(true);
		try {
			const draft = await extractBrand(links);
			setInput(mergeDraft(draft, input));
			setWarnings(draft.warnings ?? []);
			notify("Actualizamos el formulario con lo que encontramos. Revisa y guarda.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "No pudimos analizar tu web.");
		} finally {
			setExtracting(false);
		}
	}

	async function save() {
		const next = validateBrandInput(input);
		setErrors(next);
		if (Object.keys(next).length > 0) return;
		setSaving(true);
		setMessage(null);
		try {
			const saved = await saveBrand(normalizeBrandInput(input));
			setBrand(saved);
			setInput(toBrandInput(saved));
			setWarnings([]);
			notify("Cambios guardados");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "No pudimos guardar los cambios.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="grid max-w-3xl gap-4">
			<div aria-live="polite" className="grid gap-3 empty:hidden">
				{extracting ? <ExtractingStatus /> : null}
				{message ? <p className="text-sm text-danger">{message}</p> : null}
			</div>
			<BrandForm
				value={input}
				onChange={(next) => {
					setInput(next);
					if (Object.keys(errors).length > 0) setErrors(validateBrandInput(next));
				}}
				onSubmit={() => void save()}
				errors={errors}
				warnings={warnings}
				actions={
					<>
						<button
							type="submit"
							disabled={saving || extracting}
							aria-busy={saving}
							className={primaryButton}
						>
							{saving ? "Guardando…" : "Guardar cambios"}
						</button>
						<button
							type="button"
							onClick={() => void reanalyze()}
							disabled={saving || extracting}
							aria-busy={extracting}
							className={secondaryButton}
						>
							{extracting ? "Analizando…" : "Volver a analizar mi web"}
						</button>
						<button
							type="button"
							onClick={() => {
								setInput(toBrandInput(brand));
								setErrors({});
								setWarnings([]);
							}}
							disabled={saving || extracting}
							className={linkButton}
						>
							Descartar cambios
						</button>
					</>
				}
			/>
		</div>
	);
}

/** /marca: edit the signed-in user's brand with the onboarding form. */
export function BrandSettingsView() {
	const { status, brand } = useSession();

	if (status === "loading") {
		return (
			<p role="status" className="text-sm text-ink-muted">
				Cargando tu marca…
			</p>
		);
	}
	if (!brand) {
		return (
			<p role="status" className="rounded-card border border-line bg-surface p-4 text-sm">
				No pudimos cargar tu marca en este momento. Recarga la página o vuelve a ingresar.
			</p>
		);
	}
	// Keyed by id: saving updates the editor in place instead of remounting it.
	return <BrandEditor key={brand.id} brand={brand} />;
}
