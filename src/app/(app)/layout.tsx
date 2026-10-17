import type { ReactNode } from "react";
import { SessionProvider } from "@/modules/accounts/ui/session-provider";
import { AppShell } from "@/modules/content-review/ui/app-shell";
import { ReviewSessionProvider } from "@/modules/content-review/ui/review-session-provider";

/** Editor app frame: session (user + brand), review session and sidebar. */
export default function AppLayout({ children }: { children: ReactNode }) {
	return (
		<SessionProvider>
			<ReviewSessionProvider>
				<AppShell>{children}</AppShell>
			</ReviewSessionProvider>
		</SessionProvider>
	);
}
