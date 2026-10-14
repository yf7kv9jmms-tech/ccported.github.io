import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const sourceCommit = 'c511baeb6639c3a210f166b0e47bd7d2f7d5dde9';
const sourceBase = `https://raw.githubusercontent.com/ccported/games/${sourceCommit}/`;
const maxBytes = 500 * 1024 * 1024;
const mirrorDir = join('static', 'mirrored-games');
const manifestPath = join('static', 'mirrored-games.json');

const credentials = fromCognitoIdentityPool({
	clientConfig: { region: 'us-west-2' },
	identityPoolId: 'us-west-2:8ffe94a1-9042-4509-8e65-4efe16e61e3e',
});
const dynamoDB = new DynamoDBClient({ region: 'us-west-2', credentials });

async function getOnlineGames() {
	const games = new Map();
	let lastEvaluatedKey;

	do {
		const response = await dynamoDB.send(
			new ScanCommand({
				TableName: 'games_list',
				ProjectionExpression: 'gameID, clicks, isOnline',
				FilterExpression: 'isOnline = :online',
				ExpressionAttributeValues: { ':online': { BOOL: true } },
				ExclusiveStartKey: lastEvaluatedKey,
			}),
		);

		for (const item of response.Items ?? []) {
			const game = unmarshall(item);
			if (typeof game.gameID === 'string' && /^game_[A-Za-z0-9_-]+$/.test(game.gameID)) {
				games.set(game.gameID, Number(game.clicks) || 0);
			}
		}
		lastEvaluatedKey = response.LastEvaluatedKey;
	} while (lastEvaluatedKey);

	return games;
}

async function getSourceFiles() {
	const response = await fetch(
		`https://api.github.com/repos/ccported/games/git/trees/${sourceCommit}?recursive=1`,
	);
	if (!response.ok) {
		throw new Error(`Failed to list game source files: ${response.status} ${response.statusText}`);
	}

	const { tree, truncated } = await response.json();
	if (truncated) {
		throw new Error('Game source file listing was truncated; refusing to create an incomplete mirror.');
	}
	return tree.filter((item) => item.type === 'blob');
}

function textFile(path) {
	return /\.(?:css|html|js|json|mjs|svg|txt|xml)$/i.test(path);
}

function localizeReferences(contents, rootDirectories) {
	const sourcePrefix = new RegExp(
		`https?://cdn\\.jsdelivr\\.net/gh/ccported/games@${sourceCommit.replaceAll('.', '\\.')}/`,
		'g',
	);
	let localized = contents.replace(sourcePrefix, '/mirrored-games/');

	if (rootDirectories.length) {
		const directories = rootDirectories
			.map((directory) => directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join('|');
		localized = localized.replace(
			new RegExp(`(["'(=])/(?=(?:${directories})(?:/|["'?#]))`, 'g'),
			'$1/mirrored-games/',
		);
	}

	return localized;
}

async function copySourceFile(item, rootDirectories) {
	const target = join(mirrorDir, item.path);
	await mkdir(dirname(target), { recursive: true });

	const response = await fetch(`${sourceBase}${item.path.split('/').map(encodeURIComponent).join('/')}`);
	if (!response.ok || !response.body) {
		throw new Error(`Failed to download ${item.path}: ${response.status} ${response.statusText}`);
	}

	if (textFile(item.path) && item.size <= 8 * 1024 * 1024) {
		const contents = await response.text();
		await writeFile(target, localizeReferences(contents, rootDirectories));
		return;
	}

	let actualSize = 0;
	const countBytes = new Transform({
		transform(chunk, _encoding, callback) {
			actualSize += chunk.length;
			callback(null, chunk);
		},
	});
	await pipeline(Readable.fromWeb(response.body), countBytes, createWriteStream(target));
	if (actualSize !== item.size) {
		throw new Error(`Downloaded ${item.path} at ${actualSize} bytes; expected ${item.size}.`);
	}
}

const onlineGames = await getOnlineGames();
if (onlineGames.size === 0) {
	throw new Error('The online game catalog is empty; refusing to publish an empty local mirror.');
}

const files = await getSourceFiles();
const rootFiles = files.filter((item) => !item.path.includes('/'));
const gameFiles = new Map();
for (const item of files) {
	const slash = item.path.indexOf('/');
	if (slash === -1) continue;
	const gameID = item.path.slice(0, slash);
	if (!onlineGames.has(gameID)) continue;
	const game = gameFiles.get(gameID) ?? [];
	game.push(item);
	gameFiles.set(gameID, game);
}

const rootBytes = rootFiles.reduce((sum, item) => sum + item.size, 0);
if (rootBytes >= maxBytes) {
	throw new Error(`Shared game assets (${rootBytes} bytes) exceed the ${maxBytes}-byte mirror budget.`);
}

const selected = [];
let selectedBytes = rootBytes;
const orderedGames = [...onlineGames].sort(
	([idA, clicksA], [idB, clicksB]) => clicksB - clicksA || idA.localeCompare(idB),
);
for (const [gameID] of orderedGames) {
	const game = gameFiles.get(gameID);
	if (!game?.length) continue;
	const gameBytes = game.reduce((sum, item) => sum + item.size, 0);
	if (selectedBytes + gameBytes > maxBytes) continue;
	selected.push(gameID);
	selectedBytes += gameBytes;
}

if (selected.length === 0) {
	throw new Error('No complete game folders fit in the local mirror budget.');
}

const rootDirectories = [
	...new Set(rootFiles.map((item) => item.path.split('/')[0])),
];
const selectedFiles = [
	...rootFiles,
	...selected.flatMap((gameID) => gameFiles.get(gameID)),
];

await rm(mirrorDir, { recursive: true, force: true });
await mkdir(mirrorDir, { recursive: true });
await Promise.all(
	Array.from({ length: 8 }, async (_, worker) => {
		for (let index = worker; index < selectedFiles.length; index += 8) {
			await copySourceFile(selectedFiles[index], rootDirectories);
		}
	}),
);
await writeFile(manifestPath, `${JSON.stringify({ gameIDs: selected }, null, 2)}\n`);

console.log(
	`Mirrored ${selected.length}/${onlineGames.size} online games using ${(selectedBytes / 1024 / 1024).toFixed(1)} MiB of the 500 MiB budget.`,
);
