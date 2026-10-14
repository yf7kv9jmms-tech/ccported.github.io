import type { Server } from '$lib/types/servers.js';

let localGameIDs = new Set<string>();
let loadManifestPromise: Promise<void> | undefined;

export function loadLocalGameManifest(): Promise<void> {
	if (loadManifestPromise) return loadManifestPromise;

	loadManifestPromise = (async () => {
		try {
			const response = await fetch('/mirrored-games.json');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status} ${response.statusText}`);
			}
			const manifest: unknown = await response.json();
			if (
				typeof manifest !== 'object' ||
				manifest === null ||
				!('gameIDs' in manifest) ||
				!Array.isArray(manifest.gameIDs) ||
				!manifest.gameIDs.every((id): id is string => typeof id === 'string')
			) {
				throw new Error('The local game manifest has an invalid format.');
			}
			localGameIDs = new Set(manifest.gameIDs);
		} catch (error) {
			console.warn('[gameAssets] Could not load local game manifest; using external game servers.', error);
		}
	})();

	return loadManifestPromise;
}

export function gameAssetUrl(gameID: string, path: string, server: Server): string {
	if (localGameIDs.has(gameID)) {
		return `${window.location.origin}/mirrored-games/${encodeURIComponent(gameID)}${path}`;
	}
	return `${server.protocol}://${server.hostname}${server.path}${gameID}${path}`;
}
