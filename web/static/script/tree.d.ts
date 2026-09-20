import * as API from "./api.js";
declare class Node {
    id: number;
    item: API.FolderEntry;
    x: number;
    y: number;
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    constructor(item: API.FolderEntry);
}
declare class SingleRootTree {
    nodes: Map<Node, Node>;
    treeWidth: number;
    treeHeight: number;
    constructor(nodeMap: Map<Node, Node>);
    root(): Node | undefined;
    allNodes(): Set<Node>;
    childrenMap(): Map<Node, Node[]> | undefined;
    totalWidth(): number;
    totalHeight(): number;
}
export declare function renderTree(tree: SingleRootTree, disabledIDs: number[], operatingIds: number[], intervalX?: number, intervalY?: number, paddingX?: number, paddingY?: number): HTMLDivElement | undefined;
export declare function emptyTree(): SingleRootTree;
export declare function itemsToTree(folders: Array<API.FolderEntry>): SingleRootTree | undefined;
export {};
//# sourceMappingURL=tree.d.ts.map