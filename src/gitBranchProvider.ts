import * as vscode from 'vscode';
import { API, Repository, Ref, RefType } from './api/git';

export class GitBranchProvider implements vscode.TreeDataProvider<GitBranch> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitBranch | undefined | void> = new vscode.EventEmitter<GitBranch | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GitBranch | undefined | void> = this._onDidChangeTreeData.event;
    private branches: GitBranches;

    constructor(private api: API) {
        this.branches = new GitBranches();
        if (this.api.repositories) {
            const repository = this.api.repositories[0];
            repository.state.onDidChange(_ => {
                this.updateBranches(repository);
            });
            this.updateBranches(repository);
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

    checkout(gitBranch: GitBranch) {
        if (!gitBranch || !gitBranch.command || !gitBranch.command.arguments) {
            return;
        }
        this.api.repositories[0].checkout(gitBranch.command.arguments[0])
            .catch((reason) => {
                if (reason.stderr) {
                    vscode.window.showErrorMessage(reason.stderr, 'OK');
                }
            });
    }

    private async updateBranches(repository: Repository) {
        var current = await repository.getBranch('HEAD');
        // Getting refs by repository.getBranches() triggers the update of repository.state,
        // which result in infinite updates, so filter and sort refs manually.
        var refs = repository.state.refs
            .filter(p => p.type === RefType.Head)
            .sort((a: Ref, b: Ref) => {
                if (!a || !a.name || !b || !b.name) {
                    return -1;
                }
                return a.name.localeCompare(b.name);
            });
        var branches = new GitBranches();
        refs.forEach((ref) => {
            if (ref.name && ref.commit) {
                branches.push(new GitBranch(ref.name, vscode.TreeItemCollapsibleState.None, ref.commit, current && current.name === ref.name));
            }
        });
        if (this.branches.equals(branches)) {
            // If branches are not changes, ignore it
            return;
        }
        this.branches = branches;
        this._onDidChangeTreeData.fire();
    }
}

class GitBranches extends Array<GitBranch> {
    equals(obj: GitBranches): boolean {
        if (!obj) {
            return false;
        }
        if (obj.length !== this.length) {
            return false;
        }
        // Elements are sorted by git for-each-ref
        for (let i = 0; i < this.length; i++) {
            if (!this[i].equal(obj[i])) {
                return false;
            }
        }
        return true;
    }
}

export class GitBranch extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly commit: string,
        public readonly current: boolean,
    ) {
        super(label, collapsibleState);
        // icons can be selected from codicons:
        // https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
        // https://microsoft.github.io/vscode-codicons/dist/codicon.html
        this.iconPath = new vscode.ThemeIcon(current ? 'circle-filled' : 'git-branch');
        if (current) {
            this.contextValue = 'currentBranch';
        } else {
            this.contextValue = 'nonCurrentBranch';
            this.command = {
                title: '',
                command: 'gitBranch.checkout',
                tooltip: '',
                arguments: [this.label],
            };
        }
    }

    equal(obj: GitBranch): boolean {
        return obj && this.label === obj.label && this.commit === obj.commit && this.current === obj.current;
    }
}