// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitExtension } from './api/git';
import { GitBranchProvider, GitBranch } from './gitBranchProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const git = getGitExtension();
	if (!git) {
		return;
	}

	const gitBranchProvider = new GitBranchProvider(git);
	vscode.window.registerTreeDataProvider('gitBranch.branches', gitBranchProvider);
}

function getGitExtension() {
	const git = vscode.extensions.getExtension<GitExtension>('vscode.git');
	return git && git.exports && git.exports.getAPI(1);
}

// this method is called when your extension is deactivated
export function deactivate() {}
