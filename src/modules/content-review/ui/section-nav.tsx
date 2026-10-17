import { type SectionTab, SectionTabs } from "@/shared/ui/section-tabs";

/** Sub-views grouped under each main section of the app nav (see app-shell.tsx). */

type ContentTab = "tablero" | "calendario" | "mis-piezas" | "ejemplos";
type CreateTab = "subir" | "grilla";
type SettingsTab = "marca" | "politica";

const CONTENT_TABS: readonly SectionTab<ContentTab>[] = [
	{ id: "tablero", label: "Tablero", href: "/tablero" },
	{ id: "calendario", label: "Calendario", href: "/campana" },
	{ id: "mis-piezas", label: "Mis piezas", href: "/mis-piezas" },
	{ id: "ejemplos", label: "Ejemplos", href: "/contenido" },
];

const CREATE_TABS: readonly SectionTab<CreateTab>[] = [
	{ id: "subir", label: "Subir pieza", href: "/nueva" },
	{ id: "grilla", label: "Cargar grilla", href: "/campana/cargar" },
];

const SETTINGS_TABS: readonly SectionTab<SettingsTab>[] = [
	{ id: "marca", label: "Mi marca", href: "/marca" },
	{ id: "politica", label: "Política editorial", href: "/politica" },
];

export function ContentTabs({ active }: { active: ContentTab }) {
	return <SectionTabs tabs={CONTENT_TABS} active={active} label="Vistas de contenido" />;
}

export function CreateTabs({ active }: { active: CreateTab }) {
	return <SectionTabs tabs={CREATE_TABS} active={active} label="Formas de crear" />;
}

export function SettingsTabs({ active }: { active: SettingsTab }) {
	return <SectionTabs tabs={SETTINGS_TABS} active={active} label="Ajustes" />;
}
