"use client";

import { useParams } from "next/navigation";
import { PieceResultView } from "@/modules/content-review/ui/piece-result-view";
import { WorkspacePieceView } from "./workspace-piece-view";

/** Sample pieces ("cp-*") live in the browser; everything else comes from /api/pieces. */
export function PiecePageSwitch() {
	const params = useParams<{ id: string }>();
	const id = decodeURIComponent(params.id);
	if (id.startsWith("cp-")) return <PieceResultView />;
	return <WorkspacePieceView key={id} id={id} />;
}
