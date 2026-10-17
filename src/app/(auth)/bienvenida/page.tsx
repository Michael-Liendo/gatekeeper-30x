import type { Metadata } from "next";
import { OnboardingWizard } from "@/modules/brand/ui/onboarding-wizard";

export const metadata: Metadata = { title: "Bienvenida" };

export default function WelcomePage() {
	return <OnboardingWizard />;
}
