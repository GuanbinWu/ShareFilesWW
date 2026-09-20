import * as API from "./api.js";
class Node {
    constructor(item) {
        this.id = item.id;
        this.item = item;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.maxWidth = 0;
        this.maxHeight = 0;
    }
}
class SingleRootTree {
    constructor(nodeMap) {
        this.nodes = nodeMap;
        this.treeWidth = 0;
        this.treeHeight = 0;
    }
    root() {
        // console.log("~")
        const nodes = this.allNodes();
        for (const node of nodes) {
            if (node.item.id == node.item.parent_id) {
                return node;
            }
            ;
        }
    }
    allNodes() {
        const all = new Set();
        for (const [child, parent] of this.nodes) {
            all.add(child);
            all.add(parent);
        }
        return all;
    }
    childrenMap() {
        const childrenMap = new Map();
        for (const [child, parent] of this.nodes) {
            if (child.item.id === 0)
                continue;
            if (!childrenMap.has(parent)) {
                childrenMap.set(parent, []);
            }
            ;
            const t = childrenMap.get(parent);
            if (!t)
                return;
            t.push(child);
        }
        return childrenMap;
    }
    totalWidth() {
        const tailNode = [...this.allNodes()].reduce((tailNode, node) => {
            return node.x > tailNode.x ? node : tailNode;
        });
        return tailNode.x + tailNode.maxWidth;
    }
    totalHeight() {
        const bottomNode = [...this.allNodes()].reduce((bottomNode, node) => {
            return node.y > bottomNode.y ? node : bottomNode;
        });
        return bottomNode.y + bottomNode.maxHeight;
    }
}
function getTextWidth(text, fontSize, fontFamily = 'Arial') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
}
export function renderTree(tree, disabledIDs, operatingIds, intervalX = 16, intervalY = 8, paddingX = 40, paddingY = 40) {
    // console.log(tree);
    let assignedtree = assignXY(tree, intervalX, intervalY, paddingX, paddingY, 18, 30);
    // console.log(assignedtree);
    if (!assignedtree) {
        return;
    }
    const width = assignedtree.totalWidth() + paddingX * 2;
    const height = assignedtree.totalHeight() + paddingY * 2;
    const treeLayout = document.createElement("div");
    treeLayout.id = "fileDirTree";
    treeLayout.className = "tree-layout";
    treeLayout.style = `--tree-width:${width}px;--tree-height:${height}px;`;
    treeLayout.append(renderLines(assignedtree));
    for (const node of assignedtree.allNodes()) {
        const is_diabled = disabledIDs.some(v => v === node.item.id);
        const is_opterating = operatingIds.some(v => v === node.item.id);
        const nodeBtn = renderNode(node, is_diabled, is_opterating);
        treeLayout.append(nodeBtn);
    }
    return treeLayout;
}
class CleanLines {
    constructor() {
        this.lines = [];
    }
    is_marked(source, target) {
        //具有相同的起点
        if (target.x1 == source.x1 && target.y1 == source.y1) {
            //source target are vertical
            if (source.x1 === source.x2 && target.x1 == target.x2 && target.y2 <= source.y2) {
                return true;
            }
            //horizental
            if (source.y1 === source.y2 && target.y1 == target.y2 && target.x2 <= source.x2) {
                return true;
            }
        }
        return false;
    }
    is_dot(line) {
        if (line.x1 === line.x2 && line.y1 === line.y2) {
            return true;
        }
        return false;
    }
    push(target) {
        const is_dot = this.is_dot(target);
        if (is_dot)
            return;
        const targetIsCovered = this.lines.some(source => this.is_marked(source, target));
        if (targetIsCovered) {
            return;
        }
        ;
        let idx = -1;
        for (let i = 0; i <= this.lines.length - 1; i++) {
            if (this.is_marked(target, this.lines[i])) {
                idx = i;
            }
        }
        if (idx != -1) {
            this.lines.splice(idx, 1, target);
        }
        else {
            this.lines.push(target);
        }
        // this.lines.push(target);
    }
    collect() {
        return this.lines;
    }
}
function renderNode(node, is_diabled, is_opterating) {
    const lv = document.createElement("span");
    lv.textContent = `${node.item.level}`;
    lv.className = "tree-lv";
    lv.style.bottom = `${node.height / 2}px`;
    lv.style.left = `${node.width}px`;
    if (node.item.id === node.item.parent_id) {
        const root = document.createElement("label");
        root.textContent = "";
        return root;
    }
    const btn = document.createElement("button");
    if (!is_diabled && !is_opterating) {
        btn.className = "tree-node";
    }
    else {
        if (is_diabled) {
            btn.className = "tree-node-ban";
        }
        if (is_opterating) {
            btn.className = "tree-node-operating";
        }
    }
    btn.dataset.id = `${node.item.id}`;
    btn.style = `left:${node.x}px; top:${node.y}px; width:${node.width}px; height:${node.height}px`;
    if (node.item.name === "") {
        btn.textContent = `/${node.item.name}`;
    }
    else {
        btn.textContent = `${node.item.name}`;
    }
    // console.log(JSON.stringify(node.item.name)); // 如果为空字符串会输出 ""
    // console.log(node.item.name.length);
    btn.append(lv);
    return btn;
}
function renderLines(tree) {
    const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lines.setAttribute("class", "tree-lines");
    const tmp = new CleanLines();
    for (const [node, pnode] of tree.nodes) {
        if (pnode.item.id === 0)
            continue;
        const x1 = pnode.x + pnode.width;
        const y1 = pnode.y + pnode.height / 2;
        const x2 = node.x - (node.x - pnode.x - pnode.width) / 2;
        const y2 = y1;
        const x3 = x2;
        const y3 = node.y + node.height / 2;
        const x4 = node.x;
        const y4 = y3;
        // console.log(node,node);
        if (x2 == x3 && y2 == y3) {
            tmp.push({ x1: x1, y1: y1, x2: x4, y2: y4 });
            continue;
        }
        // console.log(tmp);
        tmp.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
        tmp.push({ x1: x2, y1: y2, x2: x3, y2: y3 });
        tmp.push({ x1: x3, y1: y3, x2: x4, y2: y4 });
        // break
    }
    for (const line of tmp.collect()) {
        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line1.setAttribute("x1", `${line.x1}`);
        line1.setAttribute("y1", `${line.y1}`);
        line1.setAttribute("x2", `${line.x2}`);
        line1.setAttribute("y2", `${line.y2}`);
        line1.setAttribute("class", "tree-line");
        lines.appendChild(line1);
    }
    return lines;
}
function assignXY(tree, intervalX, intervalY, offsetX, offsetY, width_per_char, height) {
    let root = tree.root();
    if (!root) {
        return;
    }
    root.x = offsetX;
    root.y = offsetY;
    const childrenMap = tree.childrenMap();
    // console.log(childrenMap);
    if (!childrenMap) {
        return;
    }
    function assignHeight() {
        for (const node of tree.allNodes()) {
            node.height = height;
        }
    }
    function assignWidth() {
        for (const node of tree.allNodes()) {
            // const nodeString = new String(node.item.name);
            // node.width= width_per_char*(nodeString.length+1)+20;
            node.width = getTextWidth(node.item.name, 16) + 60;
        }
    }
    function assignMaxHeight(node) {
        if (!childrenMap) {
            return;
        }
        const children = childrenMap.get(node);
        // console.log(childrenM)
        if (!children) {
            node.maxHeight = node.height + intervalY;
            return;
        }
        node.maxHeight = 0;
        for (const child of children) {
            assignMaxHeight(child);
            node.maxHeight += child.maxHeight + intervalY;
        }
        // node.maxHeight+=intervalY;
    }
    function assignMaxWidth() {
        if (!childrenMap) {
            return;
        }
        for (const node of tree.allNodes()) {
            const t = tree.nodes.get(node);
            if (!t) {
                return;
            }
            const peer = childrenMap.get(t);
            if (!peer) {
                node.maxWidth = node.width;
                continue;
            }
            const max = Math.max(...peer.map(bro => bro.width));
            node.maxWidth = max;
        }
    }
    function assignChildren(node, x, y) {
        node.x = x;
        node.y = y;
        if (!childrenMap) {
            return;
        }
        const children = childrenMap.get(node);
        if (!children)
            return;
        let cursorY = node.y;
        for (const child of children) {
            assignChildren(child, node.x + node.maxWidth + intervalX, cursorY);
            cursorY += child.maxHeight + intervalY;
        }
    }
    assignHeight();
    assignWidth();
    assignMaxHeight(root);
    assignMaxWidth();
    assignChildren(root, root.x, root.y);
    return tree;
}
export function emptyTree() {
    let root = {
        id: 0,
        name: "",
        parent_id: 0,
        repo: 0,
        level: 0,
    };
    let map = new Map();
    map.set(root, root);
    return new SingleRootTree(map);
}
export function itemsToTree(folders) {
    let repo = folders[0].repo;
    if (!repo) {
        return;
    }
    let root = {
        id: 0,
        name: "",
        parent_id: 0,
        repo: repo,
        level: 0,
    };
    folders.push(root);
    folders.sort((a, b) => a.id - b.id);
    const nodePool = new Map();
    const parentMap = new Map();
    function getNode(entry) {
        let node = nodePool.get(entry.id);
        if (!node) {
            node = new Node(entry);
            nodePool.set(entry.id, node);
        }
        return node;
    }
    for (const entry of folders) {
        getNode(entry);
    }
    for (const entry of folders) {
        // if (entry.parent_id === 0) continue;
        const childNode = getNode(entry);
        const parentEntry = folders.find(v => v.id === entry.parent_id);
        if (!parentEntry)
            continue;
        const parentNode = getNode(parentEntry);
        parentMap.set(childNode, parentNode);
    }
    return new SingleRootTree(parentMap);
}
//# sourceMappingURL=tree.js.map