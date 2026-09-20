
use std::collections::VecDeque;
type SqlError = sqlx::Error;
use chrono::{DateTime, Utc};
use sqlx::postgres::{PgPoolOptions,PgPool,PgRow};
use sqlx::Row;
use crate::modules::{datastruct::*,config::Config };




#[derive(Debug,Clone)]
pub struct Store{
    // pub config:Arc<Config>,
    pub connection:PgPool
}


impl Store {
    //init
    pub async fn new(db_url:&str) ->Self{
        let db_pool =match PgPoolOptions::new()
        .max_connections(5)
        .connect(db_url).await{
            Ok(pool) =>pool,
            Err(e)=>panic!("Cannot connet to database:{db_url}!\nError:{e}")
        };
        println!("Connect to Database Successfully!");
        Store{connection:db_pool}
    }

    //accounts
    pub async fn add_account(&self,account:AccountForStore)->Result<AccountForStore,SqlError>{
        sqlx::query("INSERT INTO accounts (username,hashed) VALUES ($1,$2) RETURNING id,username,hashed ")
        .bind(account.username)
        .bind(account.hashed)
        .map(|row:PgRow|row.to_account())
        .fetch_one(&self.connection)
        .await
    }
    
    pub async fn get_account(&self,id:i32)->Result<AccountForStore,SqlError>{
        sqlx::query("SELECT * from accounts WHERE id = $1")
        .bind(id)
        .map(|row:PgRow|row.to_account())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn edit_account(&self,id:i32,new_account:AccountForStore)->Result<AccountForStore,SqlError>{
        sqlx::query("UPDATE accounts
            SET username=$1,hashed=$2
            WHERE id =$3
            RETURNING id,username,hashed")
        .bind(new_account.username)
        .bind(new_account.hashed)
        .bind(id)
        .map(|row:PgRow|row.to_account())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn del_account(&self,id:i32)->Result<(),SqlError>{     
        sqlx::query("DELETE FROM accounts WHERE id=$1")
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_|())
    }
        
    pub async fn list_account(&self)->Result<Vec<AccountForStore>,SqlError>{
        sqlx::query("SELECT * from accounts")
        .map(|row:PgRow|row.to_account())
        .fetch_all(&self.connection)
        .await
    }

    //repos
    pub async fn add_repo(&self,repo:Repo)->Result<Repo,SqlError>{
        sqlx::query("INSERT INTO repos (name,public) VALUES ($1,$2) RETURNING id,name,public ")
        .bind(repo.name)
        .bind(repo.public)
        .map(|row:PgRow|row.to_repo())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn get_repo(&self,id:i32)->Result<Repo,SqlError>{
        sqlx::query("SELECT * FROM repos WHERE id=$1 ")
        .bind(id)
        .map(|row:PgRow|row.to_repo())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn edit_repo(&self,id:i32,new_repo:Repo)->Result<Repo,SqlError>{
        sqlx::query("UPDATE repos
            SET name=$1,public=$2
            WHERE id =$3
            RETURNING id,name,public")
        .bind(new_repo.name)
        .bind(new_repo.public)
        .bind(id)
        .map(|row:PgRow|row.to_repo())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn del_repo(&self,id:i32)->Result<(),SqlError>{
        sqlx::query("DELETE FROM repos WHERE id=$1")
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_|())
    }

    pub async fn list_repo(&self)->Result<Vec<Repo>,SqlError>{
        sqlx::query("SELECT * FROM repos")
        .map(|row:PgRow|row.to_repo())
        .fetch_all(&self.connection)
        .await
    }

    //log
    pub async fn add_log(&self,log:LogEntry)->Result<LogEntry,SqlError>{
        sqlx::query("INSERT INTO log (username,action,file,folder,repo,time,args) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING * ")
        .bind(log.username)
        .bind(log.action)
        .bind(log.file)
        .bind(log.folder)
        .bind(log.repo)
        .bind(log.time)
        .bind(log.args)
        .map(|row:PgRow|row.to_log())   
        .fetch_one(&self.connection)
        .await
    }

    pub async fn list_log(&self,len:i32)->Result<Vec<LogEntry>,SqlError>{
        sqlx::query("SELECT * FROM log ORDER BY id DESC LIMIT $1 ")
        .bind(len)
        .map(|row:PgRow|row.to_log())
        .fetch_all(&self.connection)
        .await
    }

    //repouserlevel
    pub async fn add_level(&self,level:RepoUserLevel)->Result<RepoUserLevel,SqlError>{

        sqlx::query("INSERT INTO repouserlevel (repo,userid,level) VALUES ($1,$2,$3) RETURNING * ")
        .bind(level.repo)
        .bind(level.userid)
        .bind(level.level)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn get_level(&self,id:i32)->Result<RepoUserLevel,SqlError>{
        sqlx::query("SELECT * FROM repouserlevel WHERE id =$1")
        .bind(id)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn edit_level(&self,id:i32,new_level:RepoUserLevel)->Result<RepoUserLevel,SqlError>{
        sqlx::query("UPDATE repouserlevel
            SET repo=$1,userid=$2,level=$3
            WHERE id =$4
            RETURNING *")
        .bind(new_level.repo)
        .bind(new_level.userid)
        .bind(new_level.level)
        .bind(id)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn del_level(&self,id:i32)->Result<(),SqlError>{
        sqlx::query("DELETE FROM repouserlevel WHERE id =$1")
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_|())
    }

    pub async fn list_level(&self)->Result<Vec<RepoUserLevel>,SqlError>{
        sqlx::query("SELECT * FROM repouserlevel")
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_all(&self.connection)
        .await
    }

    //folders
    pub async fn add_folder(&self,folder:FolderEntry)->Result<FolderEntry,SqlError>{
        // println!("folder.name = {:?}, len = {}", folder.name, folder.name.len());
        sqlx::query("INSERT INTO folders (name,parent_id,repo,level) VALUES ($1,$2,$3,$4) RETURNING * ")
        .bind(folder.name)
        .bind(folder.parent_id)
        .bind(folder.repo)
        .bind(folder.level)
        .map(|row:PgRow|row.to_folder())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn get_folder(&self,id:i32)->Result<FolderEntry,SqlError>{
        sqlx::query("SELECT * FROM folders WHERE id =$1")
        .bind(id)
        .map(|row:PgRow|row.to_folder())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn edit_folder(&self,id:i32,new_folder:FolderEntry)->Result<FolderEntry,SqlError>{
        sqlx::query("UPDATE folders
            SET name=$1,parent_id=$2,repo=$3,level=$4
            WHERE id =$5
            RETURNING *")
        .bind(new_folder.name)
        .bind(new_folder.parent_id)
        .bind(new_folder.repo)
        .bind(new_folder.level)
        .bind(id)
        .map(|row:PgRow|row.to_folder())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn del_folder(&self,id:i32)->Result<(),SqlError>{
        sqlx::query("DELETE FROM folders WHERE id =$1")
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_|())
    }

    pub async fn list_folder(&self)->Result<Vec<FolderEntry>,SqlError>{
        sqlx::query("SELECT * FROM folders")
        .map(|row:PgRow|row.to_folder())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn list_folder_by_repo(&self,repo:i32)->Result<Vec<FolderEntry>,SqlError>{
        sqlx::query("SELECT * FROM folders WHERE repo=$1")
        .bind(repo)
        .map(|row:PgRow|row.to_folder())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn get_children_folder_id(&self,parent_id:i32)->Result<Vec<i32>,SqlError>{
        sqlx::query("SELECT id FROM folders WHERE parent_id =$1")
        .bind(parent_id)
        .map(|row:PgRow|row.get("id"))
        .fetch_all(&self.connection)
        .await
    }

    pub async fn walk_subfolders(&self,start:i32)->Result<Vec<i32>,SqlError>{
        let mut result =vec![start];
        let mut queue = VecDeque::new();
        queue.push_back(start);
        while let Some(v) = queue.pop_front(){
            let chidren = self.get_children_folder_id(v).await?;
            for child in chidren{
                result.push(child);
                queue.push_back(child);
            }
        }
        Ok(result) 

    }

    pub async fn walk_subfiles(&self,folders:Vec<i32>)->Result<Vec<i32>,SqlError>{
        sqlx::query("SELECT id FROM files WHERE folder = ANY($1)")
        .bind(folders)
        .map(|row:PgRow|row.get("id"))
        .fetch_all(&self.connection)
        .await
    }
    //files
    pub async fn add_file(&self,file:FileEntry)->Result<FileEntryNoUuid,SqlError>{
        sqlx::query("INSERT INTO files 
        (name,folder,repo,size,content_type,md5,created_at,modified_at,creator,last_modifier,disk_uuid) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING * ")
        .bind(file.name)
        .bind(file.folder)
        .bind(file.repo)
        .bind(file.size)
        .bind(file.content_type)
        .bind(file.md5)
        .bind(file.created_at)
        .bind(file.modified_at)
        .bind(file.creator)
        .bind(file.last_modifier)
        .bind((file.disk_uuid))
        .map(|row:PgRow|row.to_file_no_uuid())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn get_file(&self,id:i32)->Result<FileEntry,SqlError>{
        sqlx::query("SELECT * FROM files WHERE id =$1")
        .bind(id)
        .map(|row:PgRow|row.to_file())
        .fetch_one(&self.connection)
        .await
    }
    
    pub async fn get_file_muti(&self,ids:Vec<i32>)->Result<Vec<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE id = ANY($1)")
        .bind(ids)
        .map(|row:PgRow|row.to_file())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn edit_file_meta(&self,id:i32,new_file:FileEntryNoUuid)->Result<FileEntryNoUuid,SqlError>{
        sqlx::query("UPDATE files 
        SET name =$1,folder=$2,repo=$3,size=$4,content_type=$5,md5=$6,created_at=$7,modified_at=$8,creator=$9,last_modifier=$10
        WHERE id=$11
        RETURNING * ")
        .bind(new_file.name)
        .bind(new_file.folder)
        .bind(new_file.repo)
        .bind(new_file.size)
        .bind(new_file.content_type)
        .bind(new_file.md5)
        .bind(new_file.created_at)
        .bind(new_file.modified_at)
        .bind(new_file.creator)
        .bind(new_file.last_modifier)
        .bind(id)
        .map(|row:PgRow|row.to_file_no_uuid())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn del_file(&self,id:i32)->Result<(),SqlError>{
        sqlx::query(
            r#"
            WITH deleted AS (
                DELETE FROM files
                WHERE id = $1
                RETURNING id, name, folder, repo, size, content_type, md5,
                        created_at, modified_at, creator, last_modifier, disk_uuid
            )
            INSERT INTO file_del_records (
                origin_id, name, folder, repo, size, content_type, md5,
                created_at, modified_at, creator, last_modifier, disk_uuid, delete_at
            )
            SELECT id, name, folder, repo, size, content_type, md5,
                created_at, modified_at, creator, last_modifier, disk_uuid, NOW()
            FROM deleted
            "#,
        )
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_| ())

    }

    pub async fn list_file(&self)->Result<Vec<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files")
        .map(|row:PgRow|row.to_file())
        .fetch_all(&self.connection)
        .await
    }
    
    //rcyc
    pub async fn rcyc_list(&self)->Result<Vec<RcycFileEntryNouuid>,SqlError>{
        sqlx::query("SELECT * FROM file_del_records;")
        .map(|row:PgRow|row.to_rcyc_file_no_uuid())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn get_rcyc(&self,id:i32)->Result<RcycFileEntry,SqlError>{
        sqlx::query("SELECT * FROM file_del_records WHERE id = $1;")
        .bind(id)
        .map(|row:PgRow|row.to_rcyc_file())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn query_rcyc(&self,id:i32)->Result<RcycFileEntryNouuid,SqlError>{
        sqlx::query("SELECT * FROM file_del_records WHERE id = $1;")
        .bind(id)
        .map(|row:PgRow|row.to_rcyc_file_no_uuid())
        .fetch_one(&self.connection)
        .await
    }

    pub async fn restore_rcyc(&self,id:i32)->Result<(),SqlError>{
        sqlx::query(
            r#"
            WITH restored AS (
            DELETE FROM file_del_records
            WHERE id = $1
            RETURNING origin_id, name, folder, repo, size, content_type, md5,
                    created_at, modified_at, creator, last_modifier, disk_uuid
            )
            INSERT INTO files (id, name, folder, repo, size, content_type, md5,
                created_at, modified_at, creator, last_modifier, disk_uuid)
            SELECT origin_id, name, folder, repo, size, content_type, md5,
                created_at, modified_at, creator, last_modifier, disk_uuid
            FROM restored
            "#,
        )
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_| ())
    }
    pub async fn del_rcyc(&self,id:i32)->Result<(),SqlError>{
        sqlx::query("DELETE FROM file_del_records WHERE id = $1;")
        .bind(id)
        .execute(&self.connection)
        .await
        .map(|_|())
    }
    // utils
    pub async fn list_file_by_folder(&self,folder:i32)->Result<Vec<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE folder=$1")
        .bind(folder)
        .map(|row:PgRow|row.to_file())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn list_file_by_repo(&self,repo:i32)->Result<Vec<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE repo=$1")
        .bind(repo)
        .map(|row:PgRow|row.to_file())
        .fetch_all(&self.connection)
        .await
    }



    pub async fn query_repo_by_name(&self,name:&str)->Result<Option<i32>,SqlError>{
        sqlx::query("SELECT id FROM repos WHERE name=$1")
        .bind(name)
        .map(|row:PgRow|row.get("id"))
        .fetch_optional(&self.connection)
        .await
        // .map_err(err_to_reject)
    }

    pub async fn query_username(&self,name:&str)->Result<Option<i32>,SqlError>{
        sqlx::query("SELECT id FROM accounts WHERE username=$1")
        .bind(name)
        .map(|row:PgRow|row.get("id"))
        .fetch_optional(&self.connection)
        .await
    }

    pub async fn query_folder_by_name(&self,name:&str,repo:i32)->Result<Option<i32>,SqlError>{
        sqlx::query("SELECT id FROM folders WHERE name =$1 AND repo=$2")
        .bind(name)
        .bind(repo)
        .map(|row:PgRow|row.get("id"))
        .fetch_optional(&self.connection)
        .await
    }

    pub async fn query_folder_by_repo(&self,repo:i32)->Result<Vec<i32>,SqlError>{
        sqlx::query("SELECT * FROM folders WHERE repo=$1")
        .bind(repo)
        .map(|row:PgRow|row.get("id"))
        .fetch_all(&self.connection)
        .await
    }

    pub async fn query_file_by_repo(&self,repo:i32)->Result<Vec<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE repo=$1")
        .bind(repo)
        .map(|row:PgRow|row.to_file())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn query_file_by_folder(&self,repo:i32,folder:i32)->Result<Vec<FileEntryNoUuid>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE repo=$1 AND folder=$2")
        .bind(repo)
        .bind(folder)
        .map(|row:PgRow|row.to_file_no_uuid())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn query_file_by_name(&self,name:&str,folder:i32,repo:i32)->Result<Option<FileEntry>,SqlError>{
        sqlx::query("SELECT * FROM files WHERE name =$1 AND repo=$2 AND folder=$3")
        .bind(name)
        .bind(repo)
        .bind(folder)
        .map(|row:PgRow|row.to_file())
        .fetch_optional(&self.connection)
        .await
    }

    pub async fn query_level_by_repo(&self,repo:i32)->Result<Vec<RepoUserLevel>,SqlError>{
        sqlx::query("SELECT * FROM repouserlevel WHERE repo=$1")
        .bind(repo)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn query_level_by_user(&self,userid:i32)->Result<Vec<RepoUserLevel>,SqlError>{
        sqlx::query("SELECT * FROM repouserlevel WHERE userid=$1")
        .bind(userid)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_all(&self.connection)
        .await
    }


    pub async fn query_level(&self,repo:i32,userid:i32)->Result<Option<RepoUserLevel>,SqlError>{
        sqlx::query("SELECT * FROM repouserlevel WHERE userid=$1 AND repo=$2")
        .bind(userid)
        .bind(repo)
        .map(|row:PgRow|row.to_repouserlevel())
        .fetch_optional(&self.connection)
        .await
    }

    pub async fn query_expired_files(&self,time:DateTime<Utc>)->Result<Vec<RcycFileEntry>,SqlError>{
        sqlx::query("SELECT * FROM file_del_records WHERE delete_at < $1")
        .bind(time)
        .map(|row:PgRow|row.to_rcyc_file())
        .fetch_all(&self.connection)
        .await
    }

    pub async fn query_table_capacity(&self)->Result<Vec<(&str,i64,i64)>,SqlError>{
        let tables: [&'static str; 7] = ["accounts","file_del_records","files","folders","log","repos","repouserlevel"];
        let mut result:Vec<(&str, i64, i64)>=Vec::with_capacity(tables.len());
        for table in tables {
            let last_value: i64 =
                sqlx::query_scalar(sqlx::AssertSqlSafe(
                    format!("SELECT last_value FROM {}_id_seq", table)))
                .fetch_optional(&self.connection)
                .await?
                .unwrap();
            let max_id: i64 = sqlx::query_scalar(
                sqlx::AssertSqlSafe(
                    format!("SELECT max_value FROM pg_sequences WHERE sequencename = '{}_id_seq'", table))
            )
            .bind(&table)
            .fetch_optional(&self.connection)
            .await?
            .flatten()
            .unwrap();
            result.push((table, last_value,max_id));
        }
        Ok(result)
    }
}
    

trait PgRowConvert {
    fn to_account(&self)-> AccountForStore;
    fn to_log(&self)-> LogEntry;
    fn to_repo(&self)-> Repo;
    fn to_folder(&self)-> FolderEntry;
    fn to_file(&self)-> FileEntry;
    fn to_repouserlevel(&self)-> RepoUserLevel;
    fn to_file_no_uuid(&self)-> FileEntryNoUuid;
    fn to_rcyc_file(&self)-> RcycFileEntry;
    fn to_rcyc_file_no_uuid(&self)-> RcycFileEntryNouuid;
}


impl PgRowConvert for PgRow {
    fn to_account(&self)-> AccountForStore{
        AccountForStore { id: self.get("id"), username: self.get("username"), hashed: self.get("hashed") }
    }
    fn to_log(&self)-> LogEntry{
        LogEntry { 
            id: self.get("id"), 
            username: self.get("username"),
            action: self.get("action"),
            file:self.get("file"),
            folder:self.get("folder"),
            repo: self.get("repo"), 
            time: self.get("time"), 
            args: self.get("args") }
    }
    fn to_repo(&self)-> Repo{
        Repo { id: self.get("id"), name: self.get("name"), public: self.get("public") }
    }
    fn to_folder(&self)-> FolderEntry{
        // let p = serde_json::from_value::<PathBuf>(self.get("name")).unwrap();
        FolderEntry { id: self.get("id"), name: self.get("name"),parent_id:self.get("parent_id"),repo: self.get("repo"), level:self.get("level")}
    }
    fn to_file(&self)-> FileEntry{
        // let p = serde_json::from_value::<PathBuf>(self.get("name")).unwrap();
        FileEntry { 
            id: self.get("id"), 
            name: self.get("name"), 
            folder: self.get("folder"), 
            repo: self.get("repo"), 
            size: self.get("size"), 
            content_type: self.get("content_type"), 
            md5: self.get("md5"), 
            created_at: self.get("created_at"), 
            modified_at: self.get("modified_at"), 
            creator: self.get("creator"), 
            last_modifier: self.get("last_modifier"),
            disk_uuid:self.get("disk_uuid"),
    }
    
    }
    fn to_repouserlevel(&self)-> RepoUserLevel{
        RepoUserLevel { id: self.get("id"), repo: self.get("repo"), userid: self.get("userid"), level: self.get("level") }
    }
    fn to_file_no_uuid(&self)-> FileEntryNoUuid{
        FileEntryNoUuid { 
            id: self.get("id"), 
            name: self.get("name"), 
            folder: self.get("folder"), 
            repo: self.get("repo"), 
            size: self.get("size"), 
            content_type: self.get("content_type"), 
            md5: self.get("md5"), 
            created_at: self.get("created_at"), 
            modified_at: self.get("modified_at"), 
            creator: self.get("creator"), 
            last_modifier: self.get("last_modifier"),
    }}

    fn to_rcyc_file(&self)->RcycFileEntry{
        RcycFileEntry { 
            id: self.get("id"),
            origin_id:self.get("origin_id"), 
            name: self.get("name"), 
            folder: self.get("folder"), 
            repo: self.get("repo"), 
            size: self.get("size"), 
            content_type: self.get("content_type"), 
            md5: self.get("md5"), 
            created_at: self.get("created_at"), 
            modified_at: self.get("modified_at"), 
            creator: self.get("creator"), 
            last_modifier: self.get("last_modifier"),
            disk_uuid:self.get("disk_uuid"),
            delete_at:self.get("delete_at"),
    }}

    fn to_rcyc_file_no_uuid(&self)->RcycFileEntryNouuid{
        RcycFileEntryNouuid { 
            id: self.get("id"),
            origin_id:self.get("origin_id"), 
            name: self.get("name"), 
            folder: self.get("folder"), 
            repo: self.get("repo"), 
            size: self.get("size"), 
            content_type: self.get("content_type"), 
            md5: self.get("md5"), 
            created_at: self.get("created_at"), 
            modified_at: self.get("modified_at"), 
            creator: self.get("creator"), 
            last_modifier: self.get("last_modifier"),
            delete_at:self.get("delete_at"),
    }}



}


#[cfg(test)]
mod tests{
use super::*;

    #[tokio::test]
    async fn list_dir_all(){
        let config =std::sync::Arc::new( Config::default());
        let store = Store::new(&config.db_url).await;
        // dbg!(store.walk_subfolders(4).await);

        // dbg!(store.walk_subfiles(vec![1]).await);
    }
}