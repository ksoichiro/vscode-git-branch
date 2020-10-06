import * as vscode from 'vscode';
import { API, Repository, Ref, RefType } from './api/git';

export class GitBranchProvider implements vscode.TreeDataProvider<GitBranch> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitBranch | undefined | void> = new vscode.EventEmitter<GitBranch | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GitBranch | undefined | void> = this._onDidChangeTreeData.event;
    private entries: GitBranches;

    constructor(private api: API) {
        this.entries = new GitBranches();
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
            return Promise.resolve(element.children);
        }
        return Promise.resolve(this.entries);
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
        var refsHead = repository.state.refs
            .filter(p => p.type === RefType.Head)
            .sort((a: Ref, b: Ref) => {
                if (!a || !a.name || !b || !b.name) {
                    return -1;
                }
                return a.name.localeCompare(b.name);
            });
        var refsTag = repository.state.refs
            .filter(p => p.type === RefType.Tag)
            .sort((a: Ref, b: Ref) => {
                if (!a || !a.name || !b || !b.name) {
                    return -1;
                }
                return b.name.localeCompare(a.name); // TODO sort by version, descending
            });

        var entries = new GitBranches();
        var groupBranch = new GitBranch('Branches', vscode.TreeItemCollapsibleState.Expanded, '', false, GitBranchNodeType.Group, 'group.branches');
        entries.push(groupBranch);
        var branches = new GitBranches();
        refsHead.forEach((ref) => {
            if (ref.name && ref.commit) {
                branches.push(new GitBranch(ref.name, vscode.TreeItemCollapsibleState.None, ref.commit, current && current.name === ref.name, GitBranchNodeType.Branch, ''));
            }
        });
        groupBranch.children = branches;
        if (this.entries.equals(entries)) {
            // If branches are not changes, ignore it
            return;
        }

        var groupTag = new GitBranch('Tags', vscode.TreeItemCollapsibleState.Expanded, '', false, GitBranchNodeType.Group, 'group.tags');
        entries.push(groupTag);
        var tags = new GitBranches();
        refsTag.forEach((ref) => {
            if (ref.name && ref.commit) {
                tags.push(new GitBranch(ref.name, vscode.TreeItemCollapsibleState.None, ref.commit, false, GitBranchNodeType.Tag, ''));
            }
        });
        groupTag.children = tags;

        this.entries = entries;
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

enum GitBranchNodeType {
    Group,
    Branch,
    Tag,
}

export class GitBranch extends vscode.TreeItem {
    public children: GitBranches;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly commit: string,
        public readonly current: boolean,
        public readonly nodeType: GitBranchNodeType,
        public readonly id: string,
    ) {
        super(label, collapsibleState);
        this.children = new GitBranches();
        // icons can be selected from codicons:
        // https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
        // https://microsoft.github.io/vscode-codicons/dist/codicon.html
        if (this.nodeType === GitBranchNodeType.Branch) {
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
        } else if (this.nodeType === GitBranchNodeType.Tag) {
            this.iconPath = new vscode.ThemeIcon('tag');
        }
    }

    equal(obj: GitBranch): boolean {
        return obj
            && this.label === obj.label
            && this.commit === obj.commit
            && this.current === obj.current
            && this.nodeType === obj.nodeType
            && this.id === obj.id
            && this.children.equals(obj.children);
    }
}
