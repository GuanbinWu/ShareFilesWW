export type LogEntry = {
    id: number;
    username: string;
    action: string;
    file: string;
    folder: string;
    repo: string;
    time: string;
    args: string;
};
export type Repo = {
    id: number;
    name: string;
    public: boolean;
};
export type RepoWithInitLevel = {
    id: number;
    name: string;
    public: boolean;
    levels: Array<RepoUserLevel>;
};
export type RepoUserLevel = {
    id: number;
    repo: number;
    userid: number;
    level: number;
};
export type FolderEntry = {
    id: number;
    name: string;
    parent_id: number;
    repo: number;
    level: number;
};
export type FileEntry = {
    id: number;
    name: string;
    folder: number;
    repo: number;
    size: number;
    content_type: string;
    md5: string;
    created_at: string;
    modified_at: string;
    creator: string;
    last_modifier: string;
};
export type rcycFileEntry = {
    id: number;
    origin_id: number;
    name: string;
    folder: number;
    repo: number;
    size: number;
    content_type: string;
    md5: string;
    created_at: string;
    modified_at: string;
    creator: string;
    last_modifier: string;
    delete_at: string;
};
export type FileEntryWithBytes = {
    id: number;
    content_type: string;
    md5: string;
    bytes: Blob;
};
export type Account = {
    id: number;
    username: string;
    password: string;
};
export type AccountWithoutPwd = {
    id: number;
    username: string;
};
export type AccountWithNewPwd = {
    account: Account;
    newpwd: string;
};
export declare const emptyType: {
    repo: Repo;
    folder: FolderEntry;
    user: AccountWithoutPwd;
    lv: RepoUserLevel;
};
export declare function accounts_create(account: Account): Promise<AccountWithoutPwd>;
export declare function accounts_edit(account: AccountWithNewPwd): Promise<Response>;
export declare function accounts_delete(account: Account): Promise<Response>;
export declare function accounts_list(token: string): Promise<Array<AccountWithoutPwd>>;
export declare function repo_create(repo: RepoWithInitLevel, token: string): Promise<Repo>;
export declare function repo_list(token: string): Promise<Array<Repo>>;
export declare function repo_edit(newrepo: Repo, token: string): Promise<Response>;
export declare function repo_delete(id: number, token: string): Promise<Response>;
export declare function folder_create(folder: FolderEntry, token: string): Promise<FolderEntry>;
export declare function folder_list(token: string, repo: number): Promise<Array<FolderEntry>>;
export declare function folder_edit(newfolder: FolderEntry, token: string): Promise<Response>;
export declare function folder_delete(id: number, token: string): Promise<Response>;
export declare function folder_download(token: string, id: number): Promise<FileEntryWithBytes>;
export declare function file_upload(token: string, filename: string, folder: number, repo: number, content_type: string, md5: string, bytes: ArrayBuffer): Promise<FileEntry>;
export declare function file_copy(token: string, file_id: number, tgt_folder_id: number): Promise<Response>;
export declare function file_list(token: string, repo: number, folder: number): Promise<Array<FileEntry>>;
export declare function file_download(token: string, id: number): Promise<FileEntryWithBytes>;
export declare function file_edit(newfile: FileEntry, token: string): Promise<Response>;
export declare function file_delete(id: number, token: string): Promise<Response>;
export declare function level_create(level: RepoUserLevel, token: string): Promise<RepoUserLevel>;
export declare function level_edit(newlevel: RepoUserLevel, token: string): Promise<Response>;
export declare function level_list(token: string, action: string, id: number): Promise<Array<RepoUserLevel>>;
export declare function level_all(token: string): Promise<Array<RepoUserLevel>>;
export declare function level_delete(token: string, repo: number, userid: number): Promise<Response>;
export declare function auth_login(account: Account): Promise<string>;
export declare function auth_logout(token: string): Promise<string>;
export declare function auth_verify(token: string): Promise<Response>;
export declare function log(token: string, len: number): Promise<Array<LogEntry>>;
export declare function rcyc_list(token: string): Promise<Array<rcycFileEntry>>;
export declare function rcyc_download(token: string, id: number): Promise<FileEntryWithBytes>;
export declare function rcyc_restore(token: string, id: number): Promise<Response>;
export declare function rcyc_query(token: string, id: number): Promise<rcycFileEntry>;
//# sourceMappingURL=api.d.ts.map