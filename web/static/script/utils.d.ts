export declare function testTree(): Array<Array<string>>;
export declare const iconMap: {
    csv: string;
    dir: string;
    docx: string;
    other: string;
    pdf: string;
    png: string;
    pptx: string;
    rar: string;
    txt: string;
    xlsx: string;
    zip: string;
    mp3: string;
};
export declare class Path {
    segment: Array<string>;
    constructor(segments?: Array<string>);
    push_self(seg: string): this;
    pop_self(): this;
    push_clone(seg: string): Path;
    push_path(path: Path): Path;
    pop_clone(): Path;
    peek_filename(): string;
    to_string_with_root(): string;
    to_string_no_root(): string;
    from_string(s: string): Path;
    get_parent(): Path;
    get_suffix(): string;
    add_suffix(suffix: string): this;
    rm_suffix(): this | undefined;
}
export declare class FMT {
    constructor();
    static fmt_time(time: string): string;
    static fmt_size(size: number): string;
}
export declare function sleep(delay: number): Promise<unknown>;
export declare function levelNotes(level: number): HTMLDivElement;
export declare function rcycNotes(): HTMLDivElement;
export declare function confirmBtns(confirmName: string, cancelName: string, confirmfn: () => void, cancelfn: () => void): HTMLDivElement;
export declare function messager(): {
    el: HTMLDivElement;
    set: (v: string) => void;
    push: (v: string) => void;
    hint: () => void;
};
export type Permission = "free" | "limit" | "ban";
export declare function get_permission(repo_public: boolean, user_level: number, folder_level: number): "ban" | "free" | "limit";
export declare function toolbar_logo(id: string, src: string, title: string): HTMLButtonElement;
export declare function goBack_floating_window(gobackfn: () => void): HTMLDivElement;
export declare function is_dir_name_valid(name: string): boolean;
export declare function is_file_name_valid(name: string): boolean;
//# sourceMappingURL=utils.d.ts.map