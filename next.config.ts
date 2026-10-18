import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Minimal self-contained server for the Docker image (Coolify).
	output: "standalone",
	cacheComponents: true,
	partialPrefetching: true,
	// Short public links to the static decks in public/ (redirects run before the auth proxy).
	async redirects() {
		return [
			{ source: "/pitch", destination: "/pitch/index.html", permanent: false },
			{ source: "/playbook", destination: "/playbook/index.html", permanent: false },
		];
	},
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};

export default nextConfig;
