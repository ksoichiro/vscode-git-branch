import * as path from 'path';
import * as vscode from 'vscode';
import { API, Repository, BranchQuery } from './api/git';

export class GitBranchProvider implements vscode.TreeDataProvider<GitBranch> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitBranch | undefined | void> = new vscode.EventEmitter<GitBranch | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GitBranch | undefined | void> = this._onDidChangeTreeData.event;
    private branches: GitBranch[];

    constructor(private api: API) {
        console.log("constructor");
        this.branches = new Array();
        this.api.onDidOpenRepository(e => this.updateBranches(e));
        if (this.api.repositories) {
            this.updateBranches(this.api.repositories[0]);
        }
        console.log("fire");
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
        console.log("getChildren");
        return Promise.resolve(this.branches);
    }

    private async updateBranches(repository: Repository) {
        console.log("updateBranches");
        var refs = await repository.getBranches(new GitBranchQuery(false, undefined, undefined, undefined));
        refs.forEach((ref) => {
            console.log(`ref: ${ref.name} ${JSON.stringify(ref)}`);
            if (ref.name) {
                this.branches.push(new GitBranch(ref.name, vscode.TreeItemCollapsibleState.None));
                console.log("registered " + ref.name);
            }
        });
        this._onDidChangeTreeData.fire();
    }
}

export class GitBranch extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'branch.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'branch.svg')
    };
}

class GitBranchQuery implements BranchQuery {
    constructor(readonly remote?: boolean, readonly pattern?: string, readonly count?: number, readonly contains?: string) {
    }
}