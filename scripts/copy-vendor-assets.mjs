import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const vendorDir = join('static', 'vendor');
const ruffleSource = join('node_modules', '@ruffle-rs', 'ruffle');
const ruffleTarget = join(vendorDir, 'ruffle');

await mkdir(ruffleTarget, { recursive: true });
for (const file of await readdir(ruffleSource)) {
	if (/\.(js|wasm)$/.test(file) || file.startsWith('LICENSE_')) {
		await copyFile(join(ruffleSource, file), join(ruffleTarget, file));
	}
}

const assets = [
	['node_modules/aws-sdk/dist/aws-sdk.min.js', 'aws-sdk.min.js'],
	['node_modules/chart.js/dist/chart.umd.min.js', 'chart.umd.min.js'],
	['node_modules/jszip/dist/jszip.min.js', 'jszip.min.js'],
	['node_modules/oidc-client-ts/dist/browser/oidc-client-ts.min.js', 'oidc-client-ts.min.js'],
];

await mkdir(vendorDir, { recursive: true });
for (const [source, target] of assets) {
	await copyFile(source, join(vendorDir, target));
}

const licenseDir = join(vendorDir, 'licenses');
const licenses = [
	['node_modules/aws-sdk/LICENSE.txt', 'aws-sdk-LICENSE.txt'],
	['node_modules/chart.js/LICENSE.md', 'chart.js-LICENSE.md'],
	['node_modules/jszip/LICENSE.markdown', 'jszip-LICENSE.markdown'],
	['node_modules/oidc-client-ts/LICENSE', 'oidc-client-ts-LICENSE'],
];

await mkdir(licenseDir, { recursive: true });
for (const [source, target] of licenses) {
	await copyFile(source, join(licenseDir, target));
}