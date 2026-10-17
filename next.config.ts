import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Minimal self-contained server for the Docker image (Coolify).
	output: "standalone",
	cacheComponents: true,
	partialPrefetching: true,
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
