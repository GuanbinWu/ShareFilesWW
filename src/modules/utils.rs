


use std::net::Ipv4Addr;
use std::path::{PathBuf};
use std::sync::Arc;
use crate::modules::config::Config;
use crate::modules::database::Store;
use chrono::Utc;

pub async fn clean_expire_files(duration:i32,config:Arc<Config>,store:Arc<Store>){
    let time =Utc::now() - chrono::Duration::days(duration as i64);
    let entries = store.query_expired_files(time).await;
    match entries {
        Err(e)=>println!("Error: {}",e),
        Ok(v)=> {
            for i in v {
                let mut path = config.recycle.clone();
                path.push(i.disk_uuid.clone());
                println!("删除 {:?}",&path);

                let x = tokio::fs::remove_file(path.clone()).await;
                match x {
                    Err(e)=>{panic!("删除文件失败\n{}",e)},
                    Ok(_)=> println!("删除 {:?} 成功",&path)
                }
                println!("清理数据库(ID: {:?})",i.id);
                let x = store.del_rcyc(i.id).await;
                match x {
                    Err(e)=>{panic!("删除数据库条目失败，正在处理\n{:?}\n错误信息\n{}",&i,e)},
                    Ok(_)=> println!("删除数据库条目 {:?} 成功",&i.id)
                }
            }
        }
    }
    println!("全部成功");

}


pub fn  del_expired_db_bkp(dir:&PathBuf,keep:usize,suffix:&str)->std::io::Result<()> {
    let mut backups: Vec<(PathBuf, std::time::SystemTime)> = Vec::new();
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if !entry.file_type()?.is_file() {
            continue;
        }

        let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };

        if !file_name.ends_with(suffix) {
            continue;
        }

        let modified = entry
            .metadata()?
            .modified()
            .unwrap_or(std::time::UNIX_EPOCH);
        backups.push((path, modified));
    }

    backups.sort_by(|a, b| b.1.cmp(&a.1));
    
    for (path, _) in backups.into_iter().skip(keep) {
        println!("删除旧备份：{}", path.display());
        std::fs::remove_file(path)?;
    }
    Ok(())
}


pub fn bkp_file(source:&PathBuf,target:&PathBuf){
    let r =std::fs::copy(source, target);
    match r {
        Ok(v) =>println!("File Backup Ok\n{:?}",v),
        Err(e) =>panic!("File Backup Err\n{e}")
    }
}

pub async fn bkp_database(host:&str,port:u16,user:String,database:String,pgpass:&PathBuf,target:&PathBuf){
    //Database
    let e = std::process::Command::new("pg_dump")
    .arg("-h").arg(host)
    .arg("-p").arg(&port.to_string())
    .arg("-U").arg(&user)
    .arg("-d").arg(&database)
    .arg("-F").arg("c")
    .arg("-f").arg(target)
    .arg("--clean")
    .arg("--if-exists")
    .arg("--no-owner")
    .env("PGPASSFILE", pgpass)
    .output();
    
    match e {
        Ok(v) =>
        {if v.status.success(){
            println!("Database Backup Ok\n{:?}",String::from_utf8_lossy(&v.stdout));
        }else {
            panic!("Database Restore Err\n{:?}",String::from_utf8_lossy(&v.stderr));
        }},
        
        Err(e) =>panic!("Database Backup Err\n{e}")
    }

}

pub async fn restore_database(host:&str,port:u16,user:String,database:String,pgpass:&PathBuf,bkp_file:&PathBuf){
    //Database
    let e = std::process::Command::new("pg_restore")
    .arg("-h").arg(&host.to_string())
    .arg("-p").arg(&port.to_string())
    .arg("-U").arg(&user)
    .arg("-d").arg(&database)
    .arg(bkp_file)
    .env("PGPASSFILE", pgpass)
    .output();
    
    match e {
        Ok(v) =>
        {if v.status.success(){
            println!("Database Restore Ok\n{:?}",String::from_utf8_lossy(&v.stdout))
        }else {
            panic!("Database Restore Err\n{:?}",String::from_utf8_lossy(&v.stderr));
        }
    },
        
        Err(e) =>panic!("Database Restore Err\n{e}")
    }

}


pub fn init()->(String, u16, String, String, String, u64, u8, u64, PathBuf, PathBuf, PathBuf, PathBuf, String,PathBuf,PathBuf,PathBuf){
    dotenv::dotenv().ok();
    let pgpass = PathBuf::from(std::env::var("SFWW_PGPASSFILE").unwrap());
    let encrypt_key = PathBuf::from(std::env::var("SWFF_ENCRYPT_KEY").unwrap());
    let max_username_len = std::env::var("SFWW_MAX_USERNAME_LEN").unwrap().parse::<u64>().unwrap();
    let min_pwd_len = std::env::var("SFWW_MIN_PWD_LEN").unwrap().parse::<u8>().unwrap();
    let session_duration= std::env::var("SFWW_SESSION_DURATION").unwrap().parse::<u64>().unwrap();
    let storage = PathBuf::from(std::env::var("SFWW_STORAGE").unwrap());
    let data = PathBuf::from(std::env::var("SFWW_DATA").unwrap());
    let rcyc_bin = PathBuf::from(std::env::var("SFWW_RCYC").unwrap());
    let webrc = PathBuf::from(std::env::var("SFWW_WEBRC").unwrap());
    let bkp = PathBuf::from(std::env::var("SFWW_BKP").unwrap());
    let (host,port,db_name,user,password)=read_db_conf(&pgpass);
    let key = read_key(&encrypt_key);

    return (host,port,db_name,user,password,max_username_len,min_pwd_len,session_duration,storage,data,rcyc_bin,webrc,key,pgpass,bkp,encrypt_key)
}


fn read_db_conf(path:&PathBuf)->(String,u16,String,String,String){
    let content = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {:?}: {}", path, e));
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line.splitn(5, ':').collect();
        if parts.len() != 5 {
            continue;
        }

        let host = parts[0];
        let port = parts[1].parse::<u16>().unwrap();
        let db_name = parts[2];
        let user = parts[3];
        let password = parts[4];
        return (host.to_string(),port,db_name.to_string(),user.to_string(),password.to_string());

    }
    panic!("no matching entry in pgpass");
}

fn read_key(path:&PathBuf)->String{
    let content = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {:?}: {}", path, e));
    let a :Vec<String>= content.lines().into_iter().map(|s|s.trim().to_string()).collect();
    return a[0].clone()
}