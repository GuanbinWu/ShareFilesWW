use std::{fs::File, path::PathBuf, string};
use chrono::{DateTime,Utc};
use serde::{Deserialize,Serialize};


#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct Repo{
    pub id:i32,
    pub name:String,
    pub public:bool,
}


#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct RepoWithInitLevel{
    pub id:i32,
    pub name:String,
    pub public:bool,
    pub levels:Vec<RepoUserLevel>
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct Level(i16);

impl Level {
    pub fn new(v:i16)->Self{
        if v<0 {
            Level(0)
        }else if v>9 {
            Level(9)
        }else {
            Level(v as i16)
        }
    }
    pub fn value(&self)->i16{
        self.0
    }
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct RepoUserLevel{
    pub id:i32,
    pub repo:i32,
    pub userid:i32,
    pub level:i16}

impl RepoUserLevel {
    pub fn new(id:i32,repo:i32,user:i32,level:Level)->Self{
        RepoUserLevel{
        id:id,
        repo:repo,
        userid:user, 
        level:level.value()}
    }
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct FolderEntry{
    pub id:i32,
    pub name:String,
    pub parent_id:i32,
    pub repo:i32,
    pub level:i16,
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct FileEntry{
    pub id: i32,
    pub name: String,
    pub folder:i32,
    pub repo:i32,
    pub size: i64,
    pub content_type: String,
    pub md5: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub creator:String,
    pub last_modifier:String,
    pub disk_uuid:String,
}


#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct RcycFileEntry{
    pub id: i32,
    pub origin_id:i32,
    pub name: String,
    pub folder:i32,
    pub repo:i32,
    pub size: i64,
    pub content_type: String,
    pub md5: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub creator:String,
    pub last_modifier:String,
    pub disk_uuid:String,
    pub delete_at:DateTime<Utc>,
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct RcycFileEntryNouuid{
    pub id: i32,
    pub origin_id:i32,
    pub name: String,
    pub folder:i32,
    pub repo:i32,
    pub size: i64,
    pub content_type: String,
    pub md5: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub creator:String,
    pub last_modifier:String,
    pub delete_at:DateTime<Utc>,
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct FileEntryNoUuid{
    pub id: i32,
    pub name: String,
    pub folder:i32,
    pub repo:i32,
    pub size: i64,
    pub content_type: String,
    pub md5: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub creator:String,
    pub last_modifier:String,
}

pub struct DeletedFileEntry{
    pub id: i32,
    pub origin_id: i32,
    pub name: String,
    pub folder:i32,
    pub repo:i32,
    pub size: i64,
    pub content_type: String,
    pub md5: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub creator:String,
    pub last_modifier:String,
    pub disk_uuid:String,
    pub delete_at:DateTime<Utc>,
}

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct FileEntryWithBytes{
    pub meta:FileEntry,
    pub bytes: String,
}





#[derive(Debug,Deserialize,Serialize,Clone)]
pub struct Account{
    pub id:i32,
    pub username:String,
    pub password:String,
}
#[derive(Debug,Deserialize,Serialize,Clone)]

pub struct AccountWithOutPwd{
    pub id:i32,
    pub username:String,
}

#[derive(Debug,Deserialize,Serialize,Clone)]
pub struct AccountWithNewPwd{
    // pub id:i32,
    // pub username:String,
    // pub password:String,
    // pub 
    pub account:Account,
    pub newpwd:String,
}


// impl Account {
//     fn new(id:i32,username:String,password:String)->Self{
//         Account { id,username, password }
//     }
//     fn defualt()->Self{
//         Account {id:0,username: "Default".to_string(), password: "Default".to_string() }
//     }
// }

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct AccountForStore{
    pub id:i32,
    pub username:String,
    pub hashed:String
}


// #[derive(Debug,Serialize,Deserialize)]
// pub enum Attempt {
//     Try,
//     Success,
// }
#[derive(Debug,Serialize,Deserialize)]
pub struct  LogEntry {
    pub id:i32,
    pub username:String,
    pub action:String,
    pub file:String,
    pub folder:String,
    pub repo:String,
    pub time:DateTime<Utc>,
    pub args:String,
}

#[derive(Debug,Serialize,Deserialize)]
pub enum UserAction {
    AccountRegist,
    AccountLogin,
    AccountUpdatePwd,
    AccountLogout,
    AccountDelete,

    RepoCreate,
    RepoEdit,
    RepoDelete,

    FileUpload,
    FileDownload,
    FileDelete,
    FileEdit,
    FileCopy,

    FolderCreate,
    FolderDelete,
    FolderEdit,
    FolderDownload,

    LevelCreate,
    LevelDelete,
    LevelEdit,
}

impl std::fmt::Display for UserAction{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // let debug = format!("{:?}", self);
        // let name = debug.split("::").last().unwrap_or(&debug);
        // write!(f, "{}", name)
        match self {
           UserAction::AccountDelete=>write!(f, "注销账户"),
           UserAction::AccountLogin=>write!(f, "登录"),
           UserAction::AccountLogout=>write!(f, "登出"),
           UserAction::AccountRegist=>write!(f, "注册账户"),
           UserAction::AccountUpdatePwd=>write!(f, "更新密码"),
           UserAction::FileDelete=>write!(f, "删除文件"),
           UserAction::FileDownload=>write!(f, "下载文件"),
           UserAction::FileEdit=>write!(f, "编辑文件元信息"),
           UserAction::FileUpload=>write!(f, "上传文件"),
           UserAction::FolderCreate=>write!(f, "创建目录"),
           UserAction::FolderDelete=>write!(f, "删除目录"),
           UserAction::FolderEdit=>write!(f, "编辑目录"),
           UserAction::LevelCreate=>write!(f, "创建用户-仓库等级"),
           UserAction::LevelDelete=>write!(f, "删除用户-仓库等级"),
           UserAction::LevelEdit=>write!(f, "编辑用户-仓库等级"),
           UserAction::RepoCreate=>write!(f, "创建仓库"),
           UserAction::RepoDelete=>write!(f, "删除仓库"),
           UserAction::RepoEdit=>write!(f, "编辑仓库"),
           UserAction::FolderDownload=>write!(f, "下载文件夹"),
           UserAction::FileCopy=>write!(f,"复制文件"),
        }
    }
}


// impl std::fmt::Display for Attempt{
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         let debug = format!("{:?}", self);
//         let name = debug.split("::").last().unwrap_or(&debug);
//         write!(f, "{}", name)
//     }
// }

#[derive(Debug,Serialize,Deserialize,Clone)]
pub struct Session{
    pub exp:DateTime<Utc>,
    pub username:String,
    pub nbf:DateTime<Utc>,
}

impl Default for Session {
    fn default() -> Self {
    Session{exp:Utc::now(),username:String::new(),nbf:Utc::now(),
    }
}
}