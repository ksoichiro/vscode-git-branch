import * as path from 'path';
import * as vscode from 'vscode';
import { API, Repository, BranchQuery } from './api/git';

export class GitBranchProvider implements vscode.TreeDataProvider<GitBranch> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitBranch | undefined | void> = new vscode.EventEmitter<GitBranch | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GitBranch | undefined | void> = this._onDidChangeTreeData.event;
    private branches: GitBranch[];

    constructor(private api: API) {
        this.branches = new Array();
        this.api.onDidOpenRepository(e => this.updateBranches(e));
        if (this.api.repositories) {
            this.updateBranches(this.api.repositories[0]);
        }
    }

    getTreeItem(element: GitBranch): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GitBranch): Thenable<GitBranch[]> {
        if (element) {
            // TODO
            console.log("getChildren: " + JSON.stringify(element));
            return Promise.resolve([]);
        }
        return Promise.resolve(this.branches);
    }

    private async updateBranches(repository: Repository) {
        var current = await repository.getBranch('HEAD');
        var refs = await repository.getBranches(new GitBranchQuery(false, undefined, undefined, undefined));
        refs.forEach((ref) => {
            console.log(`ref: ${JSON.stringify(ref)}`);
            if (ref.name) {
                this.branches.push(new GitBranch(ref.name, vscode.TreeItemCollapsibleState.None, current && current.name === ref.name));
            }
        });
        this._onDidChangeTreeData.fire();
    }
}

export class GitBranch extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private readonly current: boolean,
    ) {
        super(label, collapsibleState);
        // icons can be selected from codicons:
        // https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
        // https://microsoft.github.io/vscode-codicons/dist/codicon.html
        this.iconPath = new vscode.ThemeIcon(current ? 'circle-filled' : 'git-branch');
    }
}

class GitBranchQuery implements BranchQuery {
    constructor(readonly remote?: boolean, readonly pattern?: string, readonly count?: number, readonly contains?: string) {
    }
}