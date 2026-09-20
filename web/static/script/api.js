export const emptyType = {
    repo: { id: 0, name: "", public: true },
    folder: { id: 0, name: "", parent_id: 0, repo: 0, level: 0 },
    user: { id: 0, username: "" },
    lv: { id: 0, repo: 0, userid: 0, level: 0 },
};
const Base = {
    account: "/api/accounts",
    folder: "/api/folders",
    file: "/api/files",
    repo: "/api/repo",
    auth: "/api/auth",
    log: "/api/log",
    level: "/api/level",
    rcyc: "/api/rcyc",
};
const subRoute = {
    create: "create",
    edit: "edit",
    delete: "delete",
    list: "list",
    download: "download",
    copy: "copy",
    restore: "restore",
    get: "get"
};
const method = {
    get: "GET",
    post: "POST",
    delete: "DELETE",
    patch: "PATCH",
};
const queryKey = {
    action: "action",
    len: "len",
    id: "id",
    token: "token",
    repo: "repo",
    userid: "userid",
    folder: "folder",
};
export async function accounts_create(account) {
    const res = await fetch(`${Base.account}/${subRoute.create}`, {
        method: method.post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function accounts_edit(account) {
    const res = await fetch(`${Base.account}/${subRoute.edit}?${queryKey.action}=newpwd`, {
        method: method.patch,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function accounts_delete(account) {
    const res = await fetch(`${Base.account}/${subRoute.delete}`, {
        method: method.delete,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function accounts_list(token) {
    const res = await fetch(`${Base.account}/${subRoute.list}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function repo_create(repo, token) {
    const res = await fetch(`${Base.repo}/${subRoute.create}`, {
        method: method.post,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(repo)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function repo_list(token) {
    const res = await fetch(`${Base.repo}/${subRoute.list}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function repo_edit(newrepo, token) {
    const res = await fetch(`${Base.repo}/${subRoute.edit}`, {
        method: method.patch,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(newrepo)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function repo_delete(id, token) {
    const res = await fetch(`${Base.repo}/${subRoute.delete}?${queryKey.id}=${id}`, {
        method: method.delete,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function folder_create(folder, token) {
    const res = await fetch(`${Base.folder}/${subRoute.create}`, {
        method: method.post,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(folder)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function folder_list(token, repo) {
    const res = await fetch(`${Base.folder}/${subRoute.list}?${queryKey.repo}=${repo}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function folder_edit(newfolder, token) {
    const res = await fetch(`${Base.folder}/${subRoute.edit}`, {
        method: method.patch,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(newfolder)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function folder_delete(id, token) {
    const res = await fetch(`${Base.folder}/${subRoute.delete}?${queryKey.id}=${id}`, {
        method: method.delete,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function folder_download(token, id) {
    const res = await fetch(`${Base.folder}/${subRoute.download}?${queryKey.id}=${id}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    const bytes = await res.blob();
    const md5 = res.headers.get('X-Content-MD5');
    const contentType = res.headers.get('Content-Type');
    return { id: id, content_type: contentType, md5: md5, bytes: bytes };
}
export async function file_upload(token, filename, folder, repo, content_type, md5, bytes) {
    const res = await fetch(`${Base.file}/${subRoute.create}`, {
        method: method.post,
        headers: { 'Content-Type': content_type,
            'X-File-Name': encodeURIComponent(filename),
            'X-Content-MD5': md5,
            "X-Content-Folder": String(folder),
            "X-Content-Repo": String(repo),
            "Authorization": token,
        },
        body: bytes
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function file_copy(token, file_id, tgt_folder_id) {
    const res = await fetch(`${Base.file}/${subRoute.copy}?${queryKey.id}=${file_id}&${queryKey.folder}=${tgt_folder_id}`, {
        method: method.post,
        headers: {
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function file_list(token, repo, folder) {
    const res = await fetch(`${Base.file}/${subRoute.list}?${queryKey.repo}=${repo}&${queryKey.folder}=${folder}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function file_download(token, id) {
    const res = await fetch(`${Base.file}/${subRoute.download}?${queryKey.id}=${id}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    const bytes = await res.blob();
    const md5 = res.headers.get('X-Content-MD5');
    const contentType = res.headers.get('Content-Type');
    return { id: id, content_type: contentType, md5: md5, bytes: bytes };
}
export async function file_edit(newfile, token) {
    const res = await fetch(`${Base.file}/${subRoute.edit}`, {
        method: method.patch,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(newfile)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function file_delete(id, token) {
    const res = await fetch(`${Base.file}/${subRoute.delete}?${queryKey.id}=${id}`, {
        method: method.delete,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function level_create(level, token) {
    const res = await fetch(`${Base.level}/${subRoute.create}`, {
        method: method.post,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(level)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function level_edit(newlevel, token) {
    const res = await fetch(`${Base.level}/${subRoute.edit}`, {
        method: method.patch,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(newlevel)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function level_list(token, action, id) {
    const res = await fetch(`${Base.level}/${subRoute.list}?${queryKey.action}=${action}&${queryKey.id}=${id}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function level_all(token) {
    const res = await fetch(`${Base.level}/${subRoute.list}?${queryKey.action}=all`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function level_delete(token, repo, userid) {
    const res = await fetch(`${Base.level}/${subRoute.delete}?${queryKey.repo}=${repo}&${queryKey.userid}=${userid}`, {
        method: method.delete,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function auth_login(account) {
    const res = await fetch(`${Base.auth}/login`, {
        method: method.post,
        headers: { "Content-Type": "application/json",
        },
        body: JSON.stringify(account)
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.text();
}
export async function auth_logout(token) {
    const res = await fetch(`${Base.auth}/logout`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token, },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.text();
}
export async function auth_verify(token) {
    const res = await fetch(`${Base.auth}/verify?${queryKey.token}=${token}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
        },
    });
    if (res.status != 200 && res.status != 401) {
        throw new Error(await res.text());
    }
    return res;
}
export async function log(token, len) {
    const res = await fetch(`${Base.log}?${queryKey.len}=${len}`, {
        method: method.get,
        headers: { "Content-Type": "application/json",
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function rcyc_list(token) {
    const res = await fetch(`${Base.rcyc}/${subRoute.list}`, {
        method: method.get,
        headers: {
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
export async function rcyc_download(token, id) {
    const res = await fetch(`${Base.rcyc}/${subRoute.download}?${queryKey.id}=${id}`, {
        method: method.get,
        headers: {
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    const bytes = await res.blob();
    const md5 = res.headers.get('X-Content-MD5');
    const contentType = res.headers.get('Content-Type');
    return { id: id, content_type: contentType, md5: md5, bytes: bytes };
}
export async function rcyc_restore(token, id) {
    const res = await fetch(`${Base.rcyc}/${subRoute.restore}?${queryKey.id}=${id}`, {
        method: method.patch,
        headers: {
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res;
}
export async function rcyc_query(token, id) {
    const res = await fetch(`${Base.rcyc}/${subRoute.get}?${queryKey.id}=${id}`, {
        method: method.get,
        headers: {
            "Authorization": token,
        },
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return await res.json();
}
//# sourceMappingURL=api.js.map