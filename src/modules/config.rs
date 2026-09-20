use std::{path::PathBuf};

#[derive(Debug,Clone)]
pub struct Config{
    pub storage:PathBuf,
    pub recycle:PathBuf,
    pub data:PathBuf,
    pub webrc:PathBuf,
    pub max_username_len:u64,
    pub min_pwd_len:u8,
    pub db_url:String,
    pub session_duration:u64,
    pub encryption_key:String,
}

impl Config {
    pub fn new(
        storage:PathBuf,
        data:PathBuf,
        webrc:PathBuf,
        max_username_len:u64,
        min_pwd_len:u8,
        db_url:String,
        session_duration:u64,
        recycle:PathBuf,
        encryption_key:String,
    )->Self{
        Config { storage, data, webrc, max_username_len, min_pwd_len, db_url, session_duration, recycle, encryption_key }
    }


    pub fn default()->Self {
        Config{
            storage:PathBuf::from("./storage"),
            data:PathBuf::from("./data"),
            webrc:PathBuf::from("./web"),
            recycle:PathBuf::from("./recycle"),
            max_username_len:20,
            min_pwd_len:6,
            db_url:"postgres://sfww:SFWWpwd123@localhost:5432/sfwwdb".to_string(),
            session_duration:1,
            encryption_key:"0123456789abcdef0123456789abcdef".to_string(),
        }}
    
}
