/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IClaudeCodeSessionService } from '../../agents/claude/node/claudeCodeSessionService';

/**
 * Chat session item provider for Claude Code.
 * Reads sessions from ~/.claude/projects/<folder-slug>/, where each file name is a session id (GUID).
 */
export class ClaudeChatSessionItemProvider extends Disposable implements vscode.ChatSessionItemProvider {
	private readonly _onDidChangeChatSessionItems = this._register(new Emitter<void>());
	public readonly onDidChangeChatSessionItems: Event<void> = this._onDidChangeChatSessionItems.event;

	private readonly _onDidCommitChatSessionItem = this._register(new Emitter<{ original: vscode.ChatSessionItem; modified: vscode.ChatSessionItem }>());
	public readonly onDidCommitChatSessionItem: Event<{ original: vscode.ChatSessionItem; modified: vscode.ChatSessionItem }> = this._onDidCommitChatSessionItem.event;

	constructor(
		@IClaudeCodeSessionService private readonly claudeCodeSessionService: IClaudeCodeSessionService
	) {
		super();
	}

	public refresh(): void {
		this._onDidChangeChatSessionItems.fire();
	}

	public swap(original: vscode.ChatSessionItem, modified: vscode.ChatSessionItem): void {
		this._onDidCommitChatSessionItem.fire({ original, modified });
	}

	public async provideChatSessionItems(token: vscode.CancellationToken): Promise<vscode.ChatSessionItem[]> {
		const sessions = await this.claudeCodeSessionService.getAllSessions(token);
		const diskSessions = sessions.map(session => ({
			id: session.id,
			label: session.label,
			tooltip: `Claude Code session: ${session.label}`,
			timing: {
				startTime: session.timestamp.getTime()
			},
			iconPath: new vscode.ThemeIcon('star-add')
		} satisfies vscode.ChatSessionItem));

		return diskSessions;
	}
}
