import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
	reactCompiler: true,

	turbopack: {},

	webpack: (config, { isServer }) => {
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
			layers: true,
		};

		config.resolve = config.resolve || {};

		const libsodiumSumoPath = path.resolve(
			__dirname,
			'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs',
		);
		config.resolve.alias = {
			...config.resolve.alias,
			'./libsodium-sumo.mjs': libsodiumSumoPath,
		};

		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				crypto: false,
			};
		}

		return config;
	},
};

export default nextConfig;
