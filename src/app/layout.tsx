import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/modules/content-review/ui/app-shell";
import { ReviewSessionProvider } from "@/modules/content-review/ui/review-session-provider";
import { ToastProvider } from "@/shared/ui/toast";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
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
		<html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="min-h-full">
				<ToastProvider>
					<ReviewSessionProvider>
						<AppShell>{children}</AppShell>
					</ReviewSessionProvider>
				</ToastProvider>
			</body>
		</html>
	);
}
