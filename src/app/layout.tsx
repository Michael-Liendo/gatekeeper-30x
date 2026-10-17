import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { ToastProvider } from "@/shared/ui/toast";
import "./globals.css";

const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Gatekeeper Editorial 30X",
		template: "%s · Gatekeeper Editorial 30X",
	},
	description: "JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="es" className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="min-h-full">
				<ToastProvider>{children}</ToastProvider>
			</body>
		</html>
	);
}
