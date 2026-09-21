use std::{collections::HashMap};
use chrono::{Utc};
use std::path::PathBuf;
use warp::{   http::StatusCode, reject::Rejection, reply::Reply};
use crate::modules::{  errors::{ CustomError, err_to_reject}, files::{self, move_file_to_rcyc,restore_file_from_rcyc}, route::AppState};
use crate::modules::auth::{self};
use crate::modules::datastruct::*;


//Folder
pub async fn folder_list_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    // dbg!("~!");
    let repo = if let Some(v) = rq.get("repo"){
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };
    // dbg!(repo);
    let v = state.store.list_folder_by_repo(repo).await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&v))
}


pub async fn folder_create_handler(state:AppState,session:Session,rq:FolderEntry)->Result<impl Reply,Rejection>{
    //查询重名
    if let Some(_)=state.store.query_folder_by_name(&rq.name, rq.repo).await.map_err(err_to_reject)?{
        return Err(err_to_reject(CustomError::FileNameOccupied));
    }else{
        ()
    }

    let repo = state.store.get_repo(rq.repo).await.map_err(err_to_reject)?;

    let p_folder= state.store.get_folder(rq.parent_id).await.map_err(err_to_reject)?;

    let entry = FolderEntry{
        id:0,
        name:rq.name.clone(),
        parent_id:p_folder.id,
        repo:rq.repo,
        level:rq.level,
    };
    // todo!("磁盘也要新建文件夹");
    let new_entry = state.store.add_folder(entry).await.map_err(err_to_reject)?;
    state.store.add_log(LogEntry { 
        id: 0,
        username: session.username,
        action: UserAction::FolderCreate.to_string(), 
        file:String::new(),
        folder: new_entry.name.clone(), 
        repo: repo.name, 
        time: Utc::now(), 
        args: format!("Parent_folder: {}",p_folder.name) })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&new_entry))
}


pub async fn folder_edit_handler(state:AppState,session:Session,rq:FolderEntry)->Result<impl Reply,Rejection>{

    let folder_entry = state.store.get_folder(rq.id).await.map_err(err_to_reject)?;

    if rq.repo!=folder_entry.repo {
        return Err(err_to_reject(CustomError::InvalidAction));
    }

    let repo_entry = state.store.get_repo(folder_entry.repo).await.map_err(err_to_reject)?;

    let new_folder = state.store.edit_folder(rq.id,rq.clone()).await.map_err(err_to_reject)?;
    
    state.store.add_log(LogEntry {
        id: 0, 
        username: session.username,
        action: UserAction::FolderEdit.to_string(), 
        file:folder_entry.name.clone(),
        folder: folder_entry.name.clone(), 
        repo: repo_entry.name, 
        time: Utc::now(), 
        args: format!("name:{}->{},parent_id:{}->{},level:{}->{}",
        folder_entry.name,
        new_folder.name,
        folder_entry.parent_id,
        new_folder.parent_id,
        folder_entry.level,
        new_folder.level,
    ) })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

pub async fn folder_delete_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    //删除目录之后，要将其子目录挂在父目录下，否则出现孤儿节点。
    let id = if let Some(v) = rq.get("id"){
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let entry = state.store.get_folder(id).await.map_err(err_to_reject)?;
    if entry.parent_id==0 {
        return Err(err_to_reject(CustomError::InvalidAction))
    }
    let repo =state.store.get_repo(entry.repo).await.map_err(err_to_reject)?;


    let chidren  = state.store.get_children_folder_id(entry.id).await.map_err(err_to_reject)?;

    for cid in chidren{
        let c_entry = state.store.get_folder(cid).await.map_err(err_to_reject)?;

        let new_child = FolderEntry{
            id:c_entry.id,
            name:c_entry.name,
            parent_id:entry.parent_id,
            repo:c_entry.repo,
            level:c_entry.level,
        };
        state.store.edit_folder(cid, new_child).await.map_err(err_to_reject)?;
    }



    state.store.del_folder(id).await.map_err(err_to_reject)?;

    let files :Vec<FileEntry>= state.store
        .list_file_by_folder(id)
        .await
        .map_err(err_to_reject)?;

    for i in files{
        move_file_to_rcyc(&i.disk_uuid, state.config.clone()).await.map_err(err_to_reject)?;
        state.store.del_file(i.id).await.map_err(err_to_reject)?;
    }

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FolderDelete.to_string(), 
        file:entry.name.clone(),
        folder: entry.name.clone(), 
        repo: repo.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

pub async  fn folder_dowload_handler(state:AppState,session:Session,rq:HashMap<String,String>)->Result<impl Reply,Rejection>{
    
    let id = if let Some(v) = rq.get("id"){
        v.parse::<i32>().map_err(|_|err_to_reject(CustomError::ParseIdError))?
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey));
    };

    let folder = state.store.get_folder(id).await.map_err(err_to_reject)?;
    let repo = state.store.get_repo(folder.repo).await.map_err(err_to_reject)?;
    let file_ids :Vec<i32>= state.store.query_file_by_folder(repo.id, folder.id).await.map_err(err_to_reject)?
    .into_iter().map(|f|f.id).collect();
    
    let paths_names:Vec<(PathBuf,String)> = state.store.get_file_muti(file_ids).await.map_err(err_to_reject)?
    .into_iter().map(|f|{
            let mut p = state.config.storage.clone();
            p.push(f.disk_uuid);
            (p,f.name)    
    }).collect();

    let zip = files::zip_files(paths_names).await.map_err(err_to_reject)?;
    

    let md5 = {
        let digest = md5::compute(&zip);
        format!("{:x}", digest)
    };
 
    // let res = match action.as_str() {
    //     "flat"=>{
    //         let bytes = tokio::task::spawn_blocking(move|| files::zip_dir_flat(disk_path))
    //         .await.map_err(|_|err_to_reject(CustomError::ArgonDecodeFail))?
    //         .map_err(|e|err_to_reject(e))?;
    //         let md5 = {
    //             let digest = md5::compute(&bytes);
    //             format!("{:x}", digest)
    //         };

    //         state.store.add_log(LogEntry { 
    //             id: 0, 
    //             username: session.username,
    //             action: UserAction::FolderSetLevel.to_string(), 
    //             file:folder.name.clone(),
    //             folder: folder.name.clone(), 
    //             repo: repo.name.clone(),
    //             time: Utc::now(), 
    //             args: String::new() })
    //         .await.map_err(err_to_reject)?;

    //         Ok(warp::http::Response::builder()
    //         .status(200)
    //         .header("Content-Type", "application/zip")
    //         .header("X-Content-MD5", md5)
    //         .body(warp::hyper::Body::from(bytes))
    //         .unwrap())
    // res

    state.store.add_log(LogEntry { 
    id: 0, 
    username: session.username,
    action: UserAction::FolderDownload.to_string(), 
    file:folder.name.clone(),
    folder: folder.name.clone(), 
    repo: repo.name.clone(),
    time: Utc::now(), 
    args: String::new() })
    .await.map_err(err_to_reject)?;

    let res = warp::http::Response::builder()
    .status(200)
    .header("Content-Type", "application/zip")
    .header("X-Content-MD5", md5)
    .body(warp::hyper::Body::from(zip))
    .map_err(|_|err_to_reject(CustomError::ResponseBuildFail));
    
    res
    // Ok(warp::reply())
}


//Repo
pub async fn repo_create_handler(state:AppState,session:Session,rq:RepoWithInitLevel)->Result<impl Reply,Rejection>{
    //查询重名
    if let Some(_) = state.store.query_repo_by_name(&rq.name).await.map_err(err_to_reject)? {
        return Err(err_to_reject(CustomError::RepoNameOccupied));
    }else{
        ()
    };

    let repo = Repo{id:0,name:rq.name.clone(),public:rq.public};
    //更新repo数据库
    let newrepo = state.store.add_repo(repo.clone()).await.map_err(err_to_reject)?;

    //更新repo中的第一个根文件夹
    let _ = state.store.add_folder(FolderEntry { id: 0, name: "".to_string(), parent_id: 0, repo: newrepo.id, level: 0 }).await.map_err(err_to_reject)?;
    
    if !repo.public {
        for lv in rq.levels.iter().filter(|v|v.level!=0).cloned().collect::<Vec<RepoUserLevel>>(){
            let to_add = RepoUserLevel{id:0,repo:newrepo.id,userid:lv.userid,level:lv.level};
            state.store.add_level(to_add).await.map_err(err_to_reject)?;
        }
    }

    state.store.add_log(LogEntry { 
        id: 0,
        username: session.username,
        action: UserAction::RepoCreate.to_string(), 
        file:String::new(),
        folder: String::new(), 
        repo: rq.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&newrepo))
}


pub async fn repo_edit_handler(state:AppState,session:Session,rq:Repo)->Result<impl Reply,Rejection>{

    let existing= state.store.get_repo(rq.id).await.map_err(err_to_reject)?;
    state.store.edit_repo(rq.id, rq.clone()).await.map_err(err_to_reject)?;

    //如果是设置为公开，移除后端的所有等级表;
    if existing.public==false && rq.public==true{
        let levels = state.store.query_level_by_repo(existing.id).await.map_err(err_to_reject)?;
        for i in levels{
            state.store.del_level(i.id).await.map_err(err_to_reject)?;
        }
    }
    state.store.add_log(LogEntry { 
                id: 0, 
                username: session.username,
                action: UserAction::RepoEdit.to_string(), 
                file:String::new(),
                folder: String::new(), 
                repo: existing.name.clone(), 
                time: Utc::now(),
                args: format!("name:{}->{},pub:{}->{}",&existing.name,&rq.name,&existing.public,&rq.public)}
            )
            .await.map_err(err_to_reject)?;
    Ok(warp::reply())
    }


pub async fn repo_delete_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let id = if let Some(v) = rq.get("id") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let entry = state.store.get_repo(id).await.map_err(err_to_reject)?;
    

    let folders_id= state.store.query_folder_by_repo(id).await.map_err(err_to_reject)?;

    let files = state.store.query_file_by_repo(id).await.map_err(err_to_reject)?;
    for i in folders_id{
        state.store.del_folder(i).await.map_err(err_to_reject)?;
    }
    for i in files{
        move_file_to_rcyc(&i.disk_uuid, state.config.clone()).await.map_err(err_to_reject)?;
        state.store.del_file(i.id).await.map_err(err_to_reject)?;
    }
    state.store.del_repo(id).await.map_err(err_to_reject)?;

    //清理已存在的等级关系
    let levels = state.store.query_level_by_repo(id).await.map_err(err_to_reject)?;
    for i in levels{
        state.store.del_level(i.id).await.map_err(err_to_reject)?;
    }

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::RepoDelete.to_string(), 
        file:String::new(),
        folder: String::new(), 
        repo: entry.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;

    Ok(warp::reply())
}

pub async fn repo_list_handler(state:AppState,session:Session)->Result<impl Reply,Rejection>{
    let v = state.store.list_repo().await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&v))
}

//Files

pub async fn files_list_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let repo = if let Some(v) = rq.get("repo") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let folder = if let Some(v) = rq.get("folder") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };
    
    let v = state.store.query_file_by_folder(repo,folder).await.map_err(err_to_reject)?;

    // let q = v.into

    Ok(warp::reply::json(&v))
}

pub async fn files_download_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    
    let id = if let Some(v) = rq.get("id") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let file_entry = state.store.get_file(id).await.map_err(err_to_reject)?;
    let repo_entry = state.store.get_repo(file_entry.repo).await.map_err(err_to_reject)?;

    let folder = state.store.get_folder(file_entry.folder).await.map_err(err_to_reject)?;
    // todo!("获取磁盘文件");
    // let disk_path = file_entry.name.to_sys_path(&state.config.sys_disk_dir, &repo_entry.name.clone())?;
    let mut disk_path = state.config.storage.clone();
    disk_path.push(file_entry.disk_uuid);

    // let file = tokio::fs::File::open(&disk_path).await.map_err(err_to_reject)?;
    // let metadata = file.metadata().await.map_err(err_to_reject)?;
    // let len = metadata.len();
    // let body = warp::hyper::Body::wrap_stream(tokio_util::io::ReaderStream::new(file));

    // let res= warp::http::Response::builder()
    //     .status(200)
    //     .header("Content-Type", &file_entry.content_type)
    //     .header("X-Content-MD5", &file_entry.md5)
    //     .header("Content-Length", len)
    //     .header("Content-Disposition", format!("attachment; filename=\"{}\"", file_entry.name))
    //     .body(body)
    //     .map_err(|_|err_to_reject(CustomError::ResponseBuildFail));
    // 读取字节
    let content = tokio::fs::read(&disk_path).await.map_err(err_to_reject)?;
    let real_size = content.len() as i64;
    let real_md5 = {
        let digest = md5::compute(&content);
        format!("{:x}", digest)
    };
    let real_content_type = mime_guess::from_path(disk_path.clone())
        .first_or_octet_stream()
        .to_string();

    // todo!("如果磁盘文件的md5和储存的md5本身就不同咋办？也就是说文件独立于数据库之外发生了变动");
    // 这里选择同步至最新
    if file_entry.md5 != real_md5{
        let new_file=FileEntryNoUuid { 
            id:file_entry.id, 
            name: file_entry.name.clone(), 
            folder: file_entry.folder, 
            repo: file_entry.repo, 
            size: real_size, 
            content_type: real_content_type, 
            md5: real_md5, 
            created_at: file_entry.created_at, 
            modified_at: Utc::now(), 
            creator: file_entry.creator, 
            last_modifier: file_entry.last_modifier};
        state.store.edit_file_meta(id, new_file).await.map_err(err_to_reject)?;
    }

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileDownload.to_string(), 
        file:file_entry.name,
        folder: folder.name, 
        repo: repo_entry.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;

    let res = warp::http::Response::builder()
    .status(200)
    .header("Content-Type", &file_entry.content_type)
    .header("X-Content-MD5", &file_entry.md5)
    .body(warp::hyper::Body::from(content))
    .map_err(|_|err_to_reject(CustomError::ResponseBuildFail));
    res
}


pub async fn files_upload_handler(state:AppState,session:Session,
filename:String,folder:i32,repo:i32,content_type:String,md5:String,bytes:bytes::Bytes
)->Result<impl Reply,Rejection>{
    let filename = percent_encoding::percent_decode_str(&filename).decode_utf8()
    .map_err(|_|err_to_reject(CustomError::NotUTF8))?
    .into_owned();

    let existing = state.store.query_file_by_name(&filename, folder, repo).await.map_err(err_to_reject)?;

    let repo_entry = state.store.get_repo(repo).await.map_err(err_to_reject)?;
    let folder_entry = state.store.get_folder(folder).await.map_err(err_to_reject)?;
    
    let content = &bytes;
    let real_md5 = {
        let digest = md5::compute(&content);
        format!("{:x}", digest)
    };

    let real_type = infer::get(&content)
    .map(|kind| kind.mime_type());

    match real_type {
        Some(v)=>{
            if v != &content_type {
                return Err(err_to_reject(CustomError::DismatchMimeType))
            }else {
            }
        },
        None=>{}
    };

    if real_md5 != md5 {
        return Err(err_to_reject(CustomError::Md5Change))}

    
    let size = content.len() as i64;
    
    let mut new_entry:FileEntryNoUuid;
    if let Some(entry) = existing {
        //文件已存在，故更新字节
        let mut disk_path = state.config.storage.clone();
        disk_path.push(entry.disk_uuid);
        tokio::fs::write(disk_path, bytes).await.map_err(err_to_reject)?;

        let new = FileEntryNoUuid{
            id:entry.id,
            name:entry.name,
            folder:entry.folder,
            repo:entry.repo,
            size:size,
            content_type:content_type,
            md5:real_md5,
            created_at:entry.created_at,
            modified_at:Utc::now(),
            creator:entry.creator,
            last_modifier:session.username.clone(),
        };
        new_entry =state.store.edit_file_meta(entry.id, new).await.map_err(err_to_reject)?;
    }else {
        //上传新文件
        let uuid = uuid::Uuid::new_v4().to_string();
        let mut disk_path = state.config.storage.clone();
        disk_path.push(uuid.clone());
        tokio::fs::write(disk_path, bytes).await.map_err(err_to_reject)?;

        let new = FileEntry{
            id:0,
            name:filename.clone(),
            folder:folder,
            repo:repo,
            size:size,
            content_type:content_type,
            md5:real_md5,
            created_at:Utc::now(),
            modified_at:Utc::now(),
            creator:session.username.clone(),
            last_modifier:session.username.clone(),
            disk_uuid:uuid,
        };
        new_entry =state.store.add_file(new).await.map_err(err_to_reject)?;
    }

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileUpload.to_string(), 
        file:filename,
        folder: folder_entry.name, 
        repo: repo_entry.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;

    Ok(warp::reply::json(&new_entry))
}

pub async fn files_copy_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    // dbg!(1);
    let id = if let Some(v) = rq.get("id") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey));
    };

    let tgt_folder_id = if let Some(v) = rq.get("folder") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey));
    };
    // dbg!(2);
    let src_file = state.store.get_file(id).await.map_err(err_to_reject)?;
    let src_folder = state.store.get_folder(src_file.folder).await.map_err(err_to_reject)?;
    let src_repo = state.store.get_repo(src_file.repo).await.map_err(err_to_reject)?;

    // let tgt_repo = state.store.get_repo(tgt_folder_id).await.map_err(err_to_reject)?;
    let tgt_folder = state.store.get_folder(tgt_folder_id).await.map_err(err_to_reject)?;

    let existings = state.store.query_file_by_folder(tgt_folder.repo, tgt_folder.id).await.map_err(err_to_reject)?;

    if existings.iter().any(|f|f.name==src_file.name){
        return Err(err_to_reject(CustomError::FileNameOccupied));
    }

    let new_uuid = uuid::Uuid::new_v4().to_string();
    
    let mut origin = state.config.storage.clone();
    let mut target = state.config.storage.clone();
    origin.push(src_file.disk_uuid);
    target.push(new_uuid.clone());
    
    tokio::fs::copy(origin, target).await.map_err(err_to_reject)?;

    let new_file_entry = FileEntry{
        id:0,
        name:src_file.name.clone(),
        folder:tgt_folder_id,
        repo:tgt_folder.repo,
        size:src_file.size,
        content_type:src_file.content_type,
        md5:src_file.md5,
        created_at:Utc::now(),
        modified_at:Utc::now(),
        creator:session.username.clone(),
        last_modifier:session.username.clone(),
        disk_uuid:new_uuid,
    };
    
    state.store.add_file(new_file_entry).await.map_err(err_to_reject)?;

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileCopy.to_string(), 
        file:src_file.name,
        folder: src_folder.name, 
        repo: src_repo.name, 
        time: Utc::now(), 
        args: tgt_folder.name
    })
    .await.map_err(err_to_reject)?;

    Ok(warp::reply())
}

pub async fn files_edit_handler(state:AppState,session:Session,rq:FileEntryNoUuid)->Result<impl Reply,Rejection>{

    let file_entry = state.store.get_file(rq.id).await.map_err(err_to_reject)?;
    let folder_entry= state.store.get_folder(file_entry.folder).await.map_err(err_to_reject)?;
    let repo_entry= state.store.get_repo(file_entry.repo).await.map_err(err_to_reject)?;

    if file_entry.repo != rq.repo 
    || file_entry.md5 != rq.md5 
    || file_entry.size !=rq.size 
    || file_entry.content_type != rq.content_type
    || file_entry.created_at != rq.created_at
    {
        return Err(err_to_reject(CustomError::InvalidAction));
    }
    let newfile = state.store.edit_file_meta(rq.id, rq).await.map_err(err_to_reject)?;
    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileEdit.to_string(), 
        file:file_entry.name.clone(),
        folder: folder_entry.name, 
        repo: repo_entry.name, 
        time: Utc::now(), 
        args: format!("name:{}->{},folder:{}->{},creator:{}->{}",
            file_entry.name,
            newfile.name,
            file_entry.id,
            newfile.id,
            file_entry.creator,
            newfile.creator,
    ) })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

pub async fn files_delete_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let id = if let Some(v) = rq.get("id") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let file_entry = state.store.get_file(id).await.map_err(err_to_reject)?;
    let folder_entry= state.store.get_folder(file_entry.folder).await.map_err(err_to_reject)?;
    let repo_entry= state.store.get_repo(file_entry.repo).await.map_err(err_to_reject)?;

    move_file_to_rcyc(&file_entry.disk_uuid, state.config.clone()).await.map_err(err_to_reject)?;
    state.store.del_file(id).await.map_err(err_to_reject)?;

    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileDelete.to_string(), 
        file:file_entry.name,
        folder: folder_entry.name, 
        repo: repo_entry.name, 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

//Auth

pub async fn auth_login_handler(state:AppState,rq:Account)->Result<impl Reply,Rejection>{
    let username = rq.username;
    let password =rq.password;
    let id =if let Some(v)= state.store.query_username(&username).await.map_err(err_to_reject)?{
        v
    }else {
        return Err(err_to_reject(CustomError::NoSuchUser))
    };

    let account = state.store.get_account(id).await.map_err(err_to_reject)?;

    let check =auth::compare_passwd(&password, account.hashed).map_err(err_to_reject)?;

    if !check{
        return Err(err_to_reject(CustomError::IncorectPwd))
    }
    let token = auth::create_token(&username, state.config.session_duration, Utc::now(),&state.config.encryption_key);

    state.store.add_log(LogEntry { 
        id: 0, 
        username: username,
        action: UserAction::AccountLogin.to_string(), 
        file:String::new(),
        folder: String::new(), 
        repo: String::new(), 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;
        
    Ok(warp::reply::with_status(
    token,
    StatusCode::OK))
}

pub async fn auth_logout_handler(state:AppState,session:Session)->Result<impl Reply,Rejection>{
    let username = &session.username.clone();
    let nbf = Utc::now() - chrono::Duration::days(365 * 100);
    let token = auth::create_token(username, 0, nbf,&state.config.encryption_key);
    
    state.store.add_log(LogEntry { 
        id: 0, 
        username: username.to_string(),
        action: UserAction::AccountLogout.to_string(), 
        file:String::new(),
        folder: String::new(), 
        repo: String::new(), 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;
    
    Ok(warp::reply::with_status(
    token,
    StatusCode::OK,
    ))
}

pub async fn auth_verify_handler(state:AppState,rq:HashMap<String,String>)->Result<impl Reply,Rejection>{
    let token = if let Some(v) = rq.get("token") {
        v.to_string()
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    match auth::verify_token(&token){
        Ok(session) => {
            if session.exp.gt(&Utc::now()) && session.nbf.le(&Utc::now()) {
                Ok(warp::reply::with_status("Valid Token", warp::http::StatusCode::OK))}
            else{
                Ok(warp::reply::with_status("Invalid Token", warp::http::StatusCode::UNAUTHORIZED))
            }
        },
        Err(_) => Ok(warp::reply::with_status("Invalid Token", warp::http::StatusCode::UNAUTHORIZED))
    }
}

//Level
pub async fn level_list_handlers(state:AppState,session:Session,rq:HashMap<String,String>)->Result<impl Reply,Rejection>{
    let action = if let Some(v) = rq.get("action") {
        v.to_string()
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    match action.as_str() {
        "repo" =>{
            let id = if let Some(v) = rq.get("id") {
                v.parse::<i32>().map_err(|_|err_to_reject(CustomError::ParseIdError))?
            }else {
                return Err(err_to_reject(CustomError::InvalidQueryKey))
            };
            let r = state.store.query_level_by_repo(id).await.map_err(err_to_reject)?;
        Ok(warp::reply::json(&r))
        },
        "userid"=>{
            let id = if let Some(v) = rq.get("id") {
                v.parse::<i32>().map_err(|_|err_to_reject(CustomError::ParseIdError))?
            }else {
                return Err(err_to_reject(CustomError::InvalidQueryKey))
            };
            let r = state.store.query_level_by_user(id).await.map_err(err_to_reject)?;
        Ok(warp::reply::json(&r))
        },
        "all"=>{
            let r = state.store.list_level().await.map_err(err_to_reject)?;
            Ok(warp::reply::json(&r))
        },
        _=> Err(err_to_reject(CustomError::InvalidAction))
    }


    
}



pub async fn level_create_handlers(state:AppState,session:Session,rq:RepoUserLevel)->Result<impl Reply,Rejection>{
    let newlevel = state.store.add_level(rq).await.map_err(err_to_reject)?;
    
    Ok(warp::reply::json(&newlevel))
}

pub async fn level_edit_handlers(state:AppState,session:Session,rq:RepoUserLevel)->Result<impl Reply,Rejection>{
    let entry = if let Some(v)=state.store.query_level(rq.repo, rq.userid).await.map_err(err_to_reject)?{
        v
    }else{
        return Err(err_to_reject(CustomError::NoSuchLevel));
    };
    let a= RepoUserLevel{
        id:entry.id,
        repo:entry.repo,
        userid:entry.userid,
        level:Level::new(rq.level).value()};
    state.store.edit_level(entry.id,a).await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

pub async fn level_delete_handlers(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let uid = if let Some(v) = rq.get("userid") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let rid = if let Some(v) = rq.get("repo") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };
    let entry = if let Some(v)=state.store.query_level(rid, uid).await.map_err(err_to_reject)?{
        v
    }else{
        return Err(err_to_reject(CustomError::NoSuchLevel));
    };
    state.store.del_level(entry.id).await.map_err(err_to_reject)?;
    Ok(warp::reply())
}

//Log
pub async fn log_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let len = if let Some(v) = rq.get("len") {
        *v
    }else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let events = state.store.list_log(len).await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&events))
}

//Account
pub async fn account_edit_handler(state:AppState,action:HashMap<String,String>,rq:AccountWithNewPwd)->Result<impl Reply,Rejection>{
    let action = if let Some(v) = action.get("action") {
        v.to_string()
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let valid_action = match action.as_str(){
        "newpwd"=> true,
        _=> return Err(err_to_reject(CustomError::InvalidAction))
    };



    let username = rq.account.username;
    let password = rq.account.password;
    let newpwd = rq.newpwd;


    let id = if let Some(v)=state.store.query_username(&username).await.map_err(err_to_reject)?{
        v
    }else{
        return Err(err_to_reject(CustomError::NoSuchUser));
    };

    let account = state.store.get_account(id).await.map_err(err_to_reject)?;
    let check =auth::compare_passwd(&password, account.hashed).map_err(err_to_reject)?;
    
    let valid_pwd = auth::is_vaild_pwd(&newpwd, state.config.clone()).await.map_err(err_to_reject)?;
    if check && valid_pwd && valid_action {
        // dbg!(&newpwd);
        let hashed = auth::hash_passwd(&newpwd);
        let new = AccountForStore{id:0,username:username.clone(),hashed};
        state.store.edit_account(id, new).await.map_err(err_to_reject)?;
        state.store.add_log(LogEntry { 
            id: 0, 
            username: username.to_string(),
            action: UserAction::AccountUpdatePwd.to_string(), 
            file:String::new(),
            folder: String::new(), 
            repo: String::new(), 
            time: Utc::now(), 
            args: String::new() })
        .await.map_err(err_to_reject)?;
        Ok(warp::reply())
    }else {
        Err(err_to_reject(CustomError::IncorectPwd))
    }

}

pub async fn account_create_handler(state:AppState,rq:Account)->Result<impl Reply,Rejection>{
    let username = rq.username;
    let password = rq.password;

    let existing = if let Some(v) = state.store.query_username(&username).await.map_err(err_to_reject)? {
        // dbg!(v);
        true
    } else {
        false
    };
    
    if existing{
        return Err(err_to_reject(CustomError::UsernameOccupied));
    }
    // dbg!(&existing);
    let _is_valid = auth::is_vaild_pwd(&password, state.config.clone()).await?;
    // dbg!(&_is_valid);
    let _is_valid_name = auth::is_valid_user_name(&username, state.config.clone()).await?;
    // dbg!(&_is_valid_name);
    

    let hashed = auth::hash_passwd(&password);
    let new = AccountForStore{id:0,username:username.clone(),hashed};
    let newaccount = state.store.add_account(new).await.map_err(err_to_reject)?;
    state.store.add_log(LogEntry { 
            id: 0, 
            username: username,
            action: UserAction::AccountRegist.to_string(), 
            file:String::new(),
            folder: String::new(), 
            repo: String::new(), 
            time: Utc::now(), 
            args: String::new() })
        .await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&AccountWithOutPwd{id:newaccount.id,username:newaccount.username}))
}

pub async fn account_delete_handler(state:AppState,rq:Account)->Result<impl Reply,Rejection>{
    let username = rq.username;

    let id = if let Some(v)=state.store.query_username(&username).await.map_err(err_to_reject)?{
        v
    }else{
        return Err(err_to_reject(CustomError::NoSuchUser));
    };

    let entry = state.store.get_account(id).await.map_err(err_to_reject)?;
    
    let check = auth::compare_passwd(&rq.password, entry.hashed)?;
    if check{
        state.store.del_account(id).await.map_err(err_to_reject)?;

        state.store.add_log(LogEntry { 
            id: 0, 
            username: entry.username,
            action: UserAction::AccountDelete.to_string(), 
            file:String::new(),
            folder: String::new(), 
            repo: String::new(), 
            time: Utc::now(), 
            args: String::new() })
        .await.map_err(err_to_reject)?;
        Ok(warp::reply())
    }else{
        return Err(err_to_reject(CustomError::IncorectPwd))
    }
}

pub async fn account_list_handler(state:AppState,session:Session)->Result<impl Reply,Rejection>{
    let accounts = state.store.list_account().await.map_err(err_to_reject)?;
    let tmp:Vec<AccountWithOutPwd> = accounts.into_iter().map(|a|AccountWithOutPwd{id:a.id,username:a.username}).collect();
    Ok(warp::reply::json(&tmp))
}

//rcyc
pub async fn rcyc_list_handler(state:AppState,session:Session)->Result<impl Reply,Rejection>{    
    let v= state.store.rcyc_list().await.map_err(err_to_reject)?;
    Ok(warp::reply::json(&v))
}

pub async fn rcyc_restore_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let id  = if let Some(v) = rq.get("id") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };
    let del_file = state.store.get_rcyc(id).await.map_err(err_to_reject)?;

    let folder = state.store.get_folder(del_file.folder).await.map_err(err_to_reject)?;
    let repo = state.store.get_repo(del_file.repo).await.map_err(err_to_reject)?;
    let existing = state.store.query_file_by_folder(repo.id, folder.id).await.map_err(err_to_reject)?;
    if existing.iter().any(|f|f.name==del_file.name){
        return Err(err_to_reject(CustomError::FileNameOccupied));
    }

    restore_file_from_rcyc(&del_file.disk_uuid,state.config.clone()).await.map_err(err_to_reject)?;
    state.store.restore_rcyc(id).await.map_err(err_to_reject)?;

    Ok(warp::reply())
}

pub async fn rcyc_download_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let id  = if let Some(v) = rq.get("id") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let del_file = state.store.get_rcyc(id).await.map_err(err_to_reject)?;
    if session.username != del_file.creator {return Err(err_to_reject(CustomError::InvalidAction))}
    let mut path = state.config.recycle.clone();
    path.push(del_file.disk_uuid);

    // 读取字节
    let content = tokio::fs::read(&path).await.map_err(err_to_reject)?;
    state.store.add_log(LogEntry { 
        id: 0, 
        username: session.username,
        action: UserAction::FileDownload.to_string(), 
        file:del_file.name,
        folder: "rcyc".to_string(), 
        repo: "rcyc".to_string(), 
        time: Utc::now(), 
        args: String::new() })
    .await.map_err(err_to_reject)?;

    let res = warp::http::Response::builder()
    .status(200)
    .header("Content-Type", &del_file.content_type)
    .header("X-Content-MD5", &del_file.md5)
    .body(warp::hyper::Body::from(content))
    .map_err(|_|err_to_reject(CustomError::ResponseBuildFail));
    res

    // Ok(warp::reply())
}


pub async fn rcyc_get_handler(state:AppState,session:Session,rq:HashMap<String,i32>)->Result<impl Reply,Rejection>{
    let id  = if let Some(v) = rq.get("id") {
        *v
    } else {
        return Err(err_to_reject(CustomError::InvalidQueryKey))
    };

    let del_file = state.store.query_rcyc(id).await.map_err(err_to_reject)?;

    Ok(warp::reply::json(&del_file))

}