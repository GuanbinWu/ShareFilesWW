//职责：为后台手动管理服务提供接口
//目前功能
// todo


// done
// 手动触发数据库备份
// 手动触发数据库恢复
// 生成32位随机密钥
// 管理员重置密码
// 查看数据表剩余容量
// 手动触发磁盘文件清理
// 以语义形式导出数据库与文件
// 以语义形式尝试构建数据库与文件


use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{ PathBuf};
use std::sync::Arc;
use  ShareFilesWW::modules::auth::{self, reset_pwd};
use ShareFilesWW::modules::config::Config;
use  ShareFilesWW::modules::database::Store;
use ShareFilesWW::modules::{cli};
use ShareFilesWW::modules::datastruct::*;
use ShareFilesWW::modules::errors::SFWWErrors;
use ShareFilesWW::modules::utils::{self,*};
use chrono::Utc;
use clap::Parser;
use sqlx::ConnectOptions;

#[tokio::main]
async fn main(){
    let (db_host,
        db_port,
        db_dbname,
        db_user,
        db_pwd,
        max_username_len,
        min_pwd_len,
        session_duration,
        storage,
        data,
        rcyc_bin,
        webrc,
        key,
        pgpass,
        bkp,
        key_file)= utils::init();

    let db_url =sqlx::postgres::PgConnectOptions::new()
    .username(&db_user)
    .password(&db_pwd)
    .database(&db_dbname)
    .host(&db_host)
    .port(db_port)
    .to_url_lossy();

    let config = Arc::new(Config::new(storage, data, webrc, max_username_len, min_pwd_len, db_url.to_string(), session_duration, rcyc_bin, key));
    let store = Arc::new(Store::new(db_url.as_str()).await);


    let cli = cli::SFWWToolCLI::parse();
    match cli.command{
        cli::ToolCommands::CleanBkp(v)=> clean_expire_files(v.days,config,store.clone()).await,
        cli::ToolCommands::DbBkp=>{backup(&db_host,db_port,db_user,db_dbname,&pgpass,&key_file,&bkp).await},
        cli::ToolCommands::DbRestore(v)=>{
            utils::restore_database(&db_host, db_port, db_user, db_dbname, &pgpass, &v.path).await;
        },
        cli::ToolCommands::Keygen(v)=> keygen(v.len),
        cli::ToolCommands::ResetPwd(v)=> resetpwd(&v.username,store.clone()).await,
        cli::ToolCommands::CkCapa=>show_db_capacity(store.clone()).await,
        cli::ToolCommands::Export(v)=>{
            match export_to_dir(&config.storage,store.clone(),&v.path).await{
                Ok(_) =>println!("Ok"),
                Err(e) =>panic!("{}",e)
            }
            
        },
        cli::ToolCommands::Build(v)=>{
            match build_from_disk(&config.storage,store.clone(),&v.path).await{
                Ok(_) =>println!("Ok"),
                Err(e) =>panic!("{}",e)
            }},
    }
    
}

async fn backup(host: &str, port: u16, user: String, database: String, pgpass: &PathBuf,key:&PathBuf,bkp:&PathBuf){

    let mut key_to= bkp.clone();
    key_to.push("key.conf.bkp");

    bkp_file(&key, &key_to);

    let date = Utc::now().format("%Y%m%d_%H%M%S");
    let db_to = bkp.join(&format!("{}.dump",date));
    
    bkp_database(host, port, user, database, pgpass, &db_to).await;
    
    let a = del_expired_db_bkp(bkp,7,".dump");
    match a {
        Ok(_) => println!("Clean expire database Ok"),
        Err(e)=>panic!("{}",e)
    }

}

async fn build_from_disk(storage:&PathBuf,store:Arc<Store>,from:&PathBuf)->Result<(),SFWWErrors>{
    // todo!()

    let repos:Vec<Repo>=store.list_repo().await?;
    let folders:Vec<FolderEntry>  = store.list_folder().await?;
    let files:Vec<FileEntry>  = store.list_file().await?;
    if !repos.is_empty(){
        panic!("Repos数据表不为空,Repos:{:?}",repos.into_iter().map(|f|f.id).collect::<Vec<i32>>())
    }
    if !folders.is_empty(){
        panic!("Folders数据表不为空,Folders:{:?}",folders.into_iter().map(|f|f.id).collect::<Vec<i32>>())
    }
    if !files.is_empty(){
        panic!("Files数据表不为空,Files:{:?}",folders.into_iter().map(|f|f.id).collect::<Vec<i32>>())
    }

    let is_empty= is_dir_empty(storage)?;
    if !is_empty {
        panic!("储存文件夹不为空，拒绝执行");
    }

    //build repos;
    let entries = std::fs::read_dir(from).unwrap();
    let mut repo_names: Vec<String> = Vec::new();
    for entry in entries{
        let f = entry?;
        if f.path().is_dir(){
            let tmp = f.path();
            let name = match tmp.file_name() {
                Some(v)=>v.to_string_lossy(),
                None=>panic!("Invalid Repo name with os path : {:?}",f.path())
            };
            repo_names.push(name.to_string());
        }
    }

    for r_name in repo_names{
        let r_entry = store.clone().add_repo(Repo { id: 0, name: r_name, public: true }).await?;
        let root_folder = store.add_folder(FolderEntry { id: 0, name: "".to_string(), parent_id: 0, repo: r_entry.id, level: 0 }).await?;
        build_a_repo(from, &r_entry, root_folder.id, store.clone(), storage).await?;
    }
    Ok(())
}




async fn build_a_repo(from:&PathBuf,repo:&Repo,root_id:i32,store:Arc<Store>,storage:&PathBuf)->Result<(),SFWWErrors>{
    let mut path = from.clone();
    path.push(&repo.name);
    
    let mut folder_queue: VecDeque<(PathBuf,i32)> = VecDeque::new();
    folder_queue.push_back((path,root_id));
    while let Some((ppath,pid)) = folder_queue.pop_front() {
        let mut read_dir = tokio::fs::read_dir(ppath).await?;
        while let Some(entry) = read_dir.next_entry().await? {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap().to_string_lossy();
                let folder_entry = store.add_folder(FolderEntry { id: 0, name: name.to_string(), parent_id: pid, repo: repo.id, level: 0 })
                .await?;
                folder_queue.push_back((path,folder_entry.id));
                continue;
            } 

            if path.is_file(){
                let name = path.file_name().unwrap().to_string_lossy();
                let content = tokio::fs::read(&path).await?;
                let real_size = content.len() as i64;
                let real_md5 = {
                    let digest = md5::compute(&content);
                    format!("{:x}", digest)
                };
                let real_content_type = mime_guess::from_path(path.clone())
                .first_or_octet_stream()
                .to_string();
                
                let uuid = uuid::Uuid::new_v4().to_string();
                let mut target = storage.clone();
                target.push(&uuid);
                tokio::fs::copy(path.clone(),target ).await?;

                let _file_entry = store.add_file(
                    FileEntry { id: 0, name: name.to_string(), folder: pid, repo: repo.id, size: real_size, content_type: real_content_type, md5: real_md5, created_at: Utc::now(), modified_at: Utc::now(), creator: repo.name.clone(), last_modifier: repo.name.clone(), disk_uuid: uuid }
                ).await?;
                continue;
            }
        }
    }
    Ok(())
    


}



fn is_dir_empty(path: &PathBuf) -> std::io::Result<bool> {
    let mut entries = std::fs::read_dir(path)?;
    Ok(entries.next().is_none())
}
async fn export_to_dir(storage:&PathBuf,store:Arc<Store>,to:&PathBuf)->Result<(),SFWWErrors>{
    //check target dir is empty
    let is_empty= is_dir_empty(to)?;
    if !is_empty {
        panic!("目标文件夹不为空，拒绝执行")
    }
    // check database validity
    let repos:HashMap<i32, Repo>=store.list_repo().await?.into_iter().map(|v|(v.id,v)).collect::<HashMap<i32,Repo>>();
    let folders: HashMap<i32, FolderEntry> = store.list_folder().await?.into_iter().map(|v|(v.id,v)).collect::<HashMap<i32,FolderEntry>>();
    let files: HashMap<i32, FileEntry> = store.list_file().await?.into_iter().map(|v|(v.id,v)).collect::<HashMap<i32,FileEntry>>();
    
    let repo_set1 = repos.keys().cloned().collect::<HashSet<i32>>();
    let repo_set2 =folders.values().map(|v|v.repo).collect::<HashSet<i32>>();
    let repo_set3 =files.values().map(|v|v.repo).collect::<HashSet<i32>>();

    if !repo_set2.is_subset(&repo_set1) || !repo_set3.is_subset(&repo_set1) {
        panic!("检查到数据库中出现了不一致的Repo。
        Repos: {:?} 
        Folder记载的Repos: {:?}
        Files记载的Repos:{:?}",repo_set1,repo_set2,repo_set3)
    }

    let folder_set1 = folders.keys().cloned().collect::<HashSet<i32>>();
    let folder_set2 = files.values().map(|v|v.folder).collect::<HashSet<i32>>();

    if !folder_set2.is_subset(&folder_set1){
        panic!("检查到数据库中出现了不一致的Folder。
        Folders: {:?}
        Files记载的Folders:{:?}",folder_set1,folder_set2)
    }

    // Create all folders
    //去除所有非叶节点
    let all_pfolder = folders.values().map(|f|f.parent_id).collect::<HashSet<i32>>();
    let leaf_folders= folders.iter()
    .filter(|(k,_f)|!all_pfolder.contains(k))
    .map(|(k, v)| (*k, v.clone()))
    .collect::<HashMap<i32,FolderEntry>>();
    
    //拼接全名
    let leaf_folders = leaf_folders
    .into_iter()
    .map(|(_,v)|{
        let mut path = to.clone();
        concat_full_name(&mut path, &v, &folders, &repos);
        path
    })
    .collect::<Vec<PathBuf>>();
    
    for i in leaf_folders{
        std::fs::create_dir_all(i)?;
    }
    // todo!("Create all files");
    for (_,f) in files{
        let mut path = to.clone();
        let folder = folders.get(&f.folder).unwrap();
        concat_full_name(&mut path, folder, &folders, &repos);
        path.push(f.name);
        let mut source = storage.clone();
        source.push(f.disk_uuid);
        std::fs::copy(source, path)?;
    }
    
    Ok(())
}



fn concat_full_name(root:&mut PathBuf,f:&FolderEntry,folders:&HashMap<i32,FolderEntry>,repos:&HashMap<i32,Repo>){
    let mut segs: Vec<&str> =Vec::new();
    segs.push(&f.name);
    let repo_name = repos.get(&f.repo).unwrap().name.clone();
    let mut pid =  f.parent_id;
    while pid !=0 {
        let pf = folders.get(&pid).unwrap();
        segs.push(pf.name.as_str());
        pid = pf.parent_id;
    }
    root.push(repo_name);
    while let Some(v) = segs.pop() {
        root.push(v);
    }
}






fn keygen(len:i32){
    let v = auth::pwd_generator(len as usize);
    println!("{}",v)
}

async fn resetpwd(name:&str,store:Arc<Store>){
    let r = reset_pwd(name,store,16).await;
    match r {
        Err(e)=>println!("{}",e),
        Ok(_)=>()
    }
}

async fn show_db_capacity(store:Arc<Store>){
    // todo!()
    match store.query_table_capacity().await{
        Ok(v)=>{
            for i in v{
                println!("Table: {:<20} Last_value: {:>15} Capacity: {:>15} Useful: {:>15}",i.0,i.1,i.2,i.2-i.1);
            }
        },
        Err(e)=>println!("{}",e)
    }
}



#[cfg(test)]

mod tests {


use ShareFilesWW::modules::files::{self};

use super::*;
    #[test]
    fn concat(){
    // let root = "./root/";
    let mut repos: HashMap<i32, Repo> = HashMap::new();
    repos.insert(1, Repo { id: 1, name: "Repo".to_string(), public: true });
    
    let mut folders: HashMap<i32, FolderEntry> = HashMap::new();
    folders.insert(1, FolderEntry { id: 1, name: "".to_string(), parent_id: 0, repo: 1, level: 0 });
    folders.insert(2, FolderEntry { id: 2, name: "2".to_string(), parent_id: 1, repo: 1, level: 0 });
    folders.insert(5, FolderEntry { id: 5, name: "5".to_string(), parent_id: 2, repo: 1, level: 0 });
    folders.insert(7, FolderEntry { id: 7, name: "7".to_string(), parent_id: 5, repo: 1, level: 0 });
    folders.insert(11, FolderEntry { id: 11, name: "11".to_string(), parent_id: 1, repo: 1, level: 0 });
    folders.insert(19, FolderEntry { id: 19, name: "19".to_string(), parent_id: 11, repo: 1, level: 0 });

    let mut path = PathBuf::from("./root/");
    super::concat_full_name(&mut path,
        &FolderEntry { id: 7, name: "7".to_string(), parent_id: 5, repo: 1, level: 0 },
        &folders,&repos);

    assert_eq!(path,PathBuf::new());
}
    #[test]
    fn path_empty_push(){
        let mut x = PathBuf::from("./storage");
        let y = x.clone();
        x.push("");
        assert_eq!(x,y)
    }

    #[tokio::test]
    async fn bfs_dirs(){
        let p = PathBuf::from("./");
        let a = files::collect_dirs(&p, "web").await;
        // assert_eq!(a.unwrap(),1);
        dbg!(&a);
        // for i in a.unwrap(){
        //     dbg!(i.get_parent());
        // }
        let b =files::collect_files(&p, "web").await;
        dbg!(&b);
    }


}