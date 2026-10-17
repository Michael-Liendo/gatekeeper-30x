"use client";

import { secondaryButton } from "./button-styles";
import { useToast } from "./toast";

/** PNG blob of any image URL (clipboards accept PNG, not JPEG). */
async function toPngBlob(src: string): Promise<Blob> {
	const source = await (await fetch(src)).blob();
	if (source.type === "image/png") return source;
	const bitmap = await createImageBitmap(source);
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
	return new Promise((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png"),
	);
}

interface CopyActionsProps {
	/** Text to copy (title and body of the post). */
	text: string;
	/** Image to copy or download, if the piece has one. */
	imageSrc?: string | null;
	/** File name for the download, without extension. */
	fileName?: string;
}

/** Quick actions to take a post to the social network: copy its copy and its image. */
export function CopyActions({ text, imageSrc, fileName = "pieza" }: CopyActionsProps) {
	const { notify } = useToast();

	async function copyText() {
		try {
			await navigator.clipboard.writeText(text);
			notify("Copy copiado");
		} catch {
			notify("No pudimos copiar el texto");
		}
	}

	async function copyImage() {
		if (!imageSrc) return;
		try {
			const blob = await toPngBlob(imageSrc);
			await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
			notify("Imagen copiada");
		} catch {
			notify("Tu navegador no deja copiar imágenes; usa Descargar");
		}
	}

	return (
		<div className="flex flex-wrap gap-2">
			<button type="button" onClick={() => void copyText()} className={secondaryButton}>
				Copiar copy
			</button>
			{imageSrc ? (
				<>
					<button type="button" onClick={() => void copyImage()} className={secondaryButton}>
						Copiar imagen
					</button>
					<a href={imageSrc} download={`${fileName}.jpg`} className={secondaryButton}>
						Descargar imagen
					</a>
				</>
			) : null}
		</div>
	);
}
