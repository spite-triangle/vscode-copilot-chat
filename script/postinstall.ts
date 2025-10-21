/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { downloadZMQ } from '@vscode/zeromq';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { compressTikToken } from './build/compressTikToken';
import { copyStaticAssets } from './build/copyStaticAssets';

export interface ITreeSitterGrammar {
	name: string;
	/**
	 * A custom .wasm filename if the grammar node module doesn't follow the standard naming convention
	 */
	filename?: string;
	/**
	 * The path where we should spawn `tree-sitter build-wasm`
	 */
	projectPath?: string;
}

const treeSitterGrammars: ITreeSitterGrammar[] = [
	{
		name: 'tree-sitter-c-sharp',
		filename: 'tree-sitter-c_sharp.wasm' // non-standard filename
	},
	{
		name: 'tree-sitter-cpp',
	},
	{
		name: 'tree-sitter-go',
	},
	{
		name: 'tree-sitter-javascript', // Also includes jsx support
	},
	{
		name: 'tree-sitter-python',
	},
	{
		name: 'tree-sitter-ruby',
	},
	{
		name: 'tree-sitter-typescript',
		projectPath: 'tree-sitter-typescript/typescript', // non-standard path
	},
	{
		name: 'tree-sitter-tsx',
		projectPath: 'tree-sitter-typescript/tsx', // non-standard path
	},
	{
		name: 'tree-sitter-java',
	},
	{
		name: 'tree-sitter-rust',
	},
	{
		name: 'tree-sitter-php'
	}
];

const REPO_ROOT = path.join(__dirname, '..');

/**
 * Clones the zeromq.js repository from a specific commit into node_modules/zeromq
 * @param commit The git commit hash to checkout
 */
async function cloneZeroMQ(commit: string): Promise<void> {
	const zeromqPath = path.join(REPO_ROOT, 'node_modules', 'zeromq');

	// Remove existing zeromq directory if it exists
	if (fs.existsSync(zeromqPath)) {
		await fs.promises.rm(zeromqPath, { recursive: true, force: true });
	}

	return new Promise((resolve, reject) => {
		// Clone the repository
		const cloneProcess = spawn('git', ['clone', 'https://github.com/rebornix/zeromq.js.git', zeromqPath], {
			cwd: REPO_ROOT,
			stdio: 'inherit'
		});

		cloneProcess.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Git clone failed with exit code ${code}`));
				return;
			}

			// Checkout the specific commit
			const checkoutProcess = spawn('git', ['checkout', commit], {
				cwd: zeromqPath,
				stdio: 'inherit'
			});

			checkoutProcess.on('close', (checkoutCode) => {
				if (checkoutCode !== 0) {
					reject(new Error(`Git checkout failed with exit code ${checkoutCode}`));
					return;
				}
				resolve();
			});

			checkoutProcess.on('error', (error) => {
				reject(new Error(`Git checkout error: ${error.message}`));
			});
		});

		cloneProcess.on('error', (error) => {
			reject(new Error(`Git clone error: ${error.message}`));
		});
	});
}

async function main() {
	await fs.promises.mkdir(path.join(REPO_ROOT, '.build'), { recursive: true });

	const vendoredTiktokenFiles = ['src/platform/tokenizer/node/cl100k_base.tiktoken', 'src/platform/tokenizer/node/o200k_base.tiktoken'];

	for (const tokens of vendoredTiktokenFiles) {
		await compressTikToken(tokens, `dist/${path.basename(tokens)}`);
	}

	// copy static assets to dist
	await copyStaticAssets([
		...treeSitterGrammars.map(grammar => `node_modules/@vscode/tree-sitter-wasm/wasm/${grammar.name}.wasm`),
		'node_modules/@vscode/tree-sitter-wasm/wasm/tree-sitter.wasm',
	], 'dist');

	// Clone zeromq.js from specific commit
	await cloneZeroMQ('1cbebce3e17801bea63a4dcc975b982923cb4592');

	await downloadZMQ();

	// Check if the base cache file exists
	const baseCachePath = path.join('test', 'simulation', 'cache', 'base.sqlite');
	if (!fs.existsSync(baseCachePath)) {
		throw new Error(`Base cache file does not exist at ${baseCachePath}. Please ensure that you have git lfs installed and initialized before the repository is cloned.`);
	}

	await copyStaticAssets([
		`node_modules/@anthropic-ai/claude-code/cli.js`,
		`node_modules/@anthropic-ai/claude-code/yoga.wasm`,
		// `node_modules/@anthropic-ai/claude-code/vendor/ripgrep/${process.arch}-${process.platform}/ripgrep`,
	], 'dist');
}

main();
