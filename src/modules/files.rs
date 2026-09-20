use chrono::{Utc};
use std::collections::VecDeque;
use std::ffi::{OsString,OsStr};
use std::io::{Error, Write};
use std::string;
use std::{path::{Path, PathBuf}, str::FromStr};
use crate::modules::datastruct::{*};
use crate::modules::{ config::Config, errors::{SFWWErrors,CustomError}};
use std::sync::Arc;
use walkdir::WalkDir;


pub trait PathBehavior {
    fn to_web_path(&self,sys_disk_dir:&PathBuf,repo:&str)->Result<PathBuf,SFWWErrors>;
    fn to_sys_path(&self,sys_disk_dir:&PathBuf,repo:&str)->Result<PathBuf,SFWWErrors>;
    fn to_recylce_bin(&self,recycle_bin:&PathBuf)->Result<PathBuf,SFWWErrors>;
    fn to_unix_path(&self) -> Result<PathBuf,SFWWErrors>;
    fn has_path_prefix(&self, prefix: &PathBuf) -> bool;
    fn replace_prefix(&self,prefix: &PathBuf,new_prefix:&PathBuf)->Result<PathBuf,SFWWErrors>;
    fn rm_prefix(&self,prefix: &PathBuf)->Result<PathBuf,SFWWErrors>;
    fn add_prefix(&self,prefix: &PathBuf)->Result<PathBuf,SFWWErrors>;
    fn get_parent(&self)->Result<PathBuf,SFWWErrors>;
    fn concat(&self,path:&PathBuf)->Result<PathBuf,SFWWErrors>;
    fn to_absolute(&self)->Result<PathBuf,SFWWErrors>;
    fn replace_segment_all(&self,old:&OsStr,new:&OsStr)->Result<PathBuf,SFWWErrors>;
}


impl PathBehavior for PathBuf {

    fn to_web_path(&self,sys_disk_dir:&PathBuf,repo:&str)->Result<PathBuf,SFWWErrors>{
        self.rm_prefix(sys_disk_dir)
        .and_then(|x| x.rm_prefix(&PathBuf::from(repo.to_string())))
        .and_then(|v| v.to_unix_path())
        // .and_then(|v|v.add_prefix(&PathBuf::from("/")))     
    }

    fn to_sys_path(&self,sys_disk_dir:&PathBuf,repo:&str)->Result<PathBuf,SFWWErrors>{
        self.add_prefix(&PathBuf::from(repo.to_string()))
        .and_then(|v | v .add_prefix(sys_disk_dir))
        .and_then(|v| v.to_unix_path())
    }

    fn to_recylce_bin(&self,recycle_bin:&PathBuf)->Result<PathBuf,SFWWErrors> {
        let date = Utc::now().format("%Y%m%d").to_string();
        let rand = uuid::Uuid::new_v4().to_string()[..7].to_string();
        let name = if let Some(v) = self.file_name() {
            v.to_os_string()
        }else {
            return Err(CustomError::PathConvertFail.into());
        };
        let mut tmp=recycle_bin.clone();
        tmp.push(format!("{}_{}", date, rand));
        tmp.push(name);
        Ok(tmp)
    }

    fn to_unix_path(&self) -> Result<PathBuf,SFWWErrors>{
        let mut path_str = self.to_string_lossy().replace('\\', "/");
        if path_str.ends_with('/') {
            path_str.pop();
        }
        match PathBuf::from_str(&path_str){
            Ok(v) =>  Ok(v),
            Err(_) =>Err(CustomError::PathConvertFail.into())
        }
    }

    fn has_path_prefix(&self, prefix: &PathBuf) -> bool{
        let path = self.components();
        let prefix = prefix.components();
        let mut path_iter = path.peekable();
        let mut prefix_iter = prefix.peekable();
        while let Some(p) = prefix_iter.next() {
            match path_iter.next() {
                Some(x) if x == p => continue,
                _ => return false,
            }
        }
        true
    }

    fn replace_prefix(&self,prefix: &PathBuf,new_prefix:&PathBuf)->Result<PathBuf,SFWWErrors>{
        if let Ok(rest) = self.strip_prefix(prefix) {
            let mut out = new_prefix.clone();
            out.push(rest);
            return out.to_unix_path()
        } else {
            return Err(CustomError::PathConvertFail.into())
        }
    }

    fn rm_prefix(&self,prefix: &PathBuf)->Result<PathBuf,SFWWErrors>{
        match self.strip_prefix(prefix){
            Ok(v)=> Ok(v.to_path_buf()),
            Err(_)=> Err(CustomError::PathConvertFail.into())
        }
    }

    fn add_prefix(&self,prefix: &PathBuf)->Result<PathBuf,SFWWErrors>{
        let mut tmp = prefix.clone();
        tmp.push(self);
        Ok(tmp)
    }

    fn get_parent(&self)->Result<PathBuf,SFWWErrors>{
        match  self.parent(){
        Some(v)=>Ok(v.to_path_buf()),
        None => Ok(PathBuf::from("/"))
        }
    }
    
    fn concat(&self,path:&PathBuf)->Result<PathBuf,SFWWErrors>{
        // dbg!(self);
        let mut tmp = self.clone();
        for i in  path.components().peekable(){
            tmp.push(i);
            // dbg!(&tmp);
            // dbg!(&i);
        }
        Ok(tmp.to_unix_path().unwrap())
    }

    fn to_absolute(&self)->Result<PathBuf,SFWWErrors>{
        let path:&Path = self.as_ref();
        if path.is_absolute() {
            Ok(path.to_path_buf())
        } else {
            Ok(std::env::current_dir()?.join(path))
        }
    }

    fn replace_segment_all(&self,old:&OsStr,new:&OsStr)->Result<PathBuf,SFWWErrors>{
        if !self.iter().any(|segment| segment == old){
            return Err(CustomError::PathConvertFail)?
        }
    let p = self
        .iter()
        .map(|segment| {
            if segment == old {
                new.to_os_string()
            } else {
                segment.to_os_string()
            }
        })
        .collect();
    Ok(p)
    }
}


// pub async fn collect_dirs_files(conf: Arc<Config>,repo:Repo) -> Result<(Vec<FolderEntry>,Vec<FileEntry>), SFWWErrors>{
//     // dbg!(conf.sys_disk_dir.clone().concat(&PathBuf::from(repo.name.clone())));
//     let root=conf.sys_disk_dir.clone().concat(&PathBuf::from(repo.name.clone()))?;
    
//     let mut dirs: Vec<FolderEntry>=Vec::new();
//     let mut files :Vec<FileEntry>=Vec::new();

//     for entry in WalkDir::new(&root) {
//         // dbg!(&entry);
//         let entry = entry?;
//         let sys_path = entry.path().to_path_buf();
//         if entry.file_type().is_dir() {
//             dirs.push(
//                 FolderEntry{
//                 id:0,
//                 name:sys_path.to_web_path(&conf.sys_disk_dir, &repo.name)?,
//                 parent_id:0,
//                 repo:repo.id,
//                 level:Level::new(0).value()}
//             );

//         }else{

//         let bytes=std::fs::read(&sys_path)?;
//         let size = bytes.len() as i64;
//         let content_type = mime_guess::from_path(sys_path.clone())
//             .first_or_octet_stream()
//             .to_string();
//         let md5 = {
//             let digest = md5::compute(&bytes);
//             format!("{:x}", digest)
//         };
//         files.push(
//                 FileEntry { 
//             id: 0, 
//             name: sys_path.to_web_path(&conf.sys_disk_dir, &repo.name)?, 
//             folder: 0, 
//             repo: repo.id, 
//             size: size, 
//             content_type: content_type, 
//             md5: md5, 
//             created_at: Utc::now(), 
//             modified_at: Utc::now(), 
//             creator: repo.name.clone(), 
//             last_modifier: repo.name.clone() }
//             );
//         }
//     }

//     Ok((dirs,files))
// }



pub async fn collect_dirs(storage:&PathBuf,repo:&str) -> Result<Vec<PathBuf>, SFWWErrors>{
    let mut p= storage.clone();
    p.push(repo);
    // dbg!(&p);

    let mut files = Vec::new();
    let mut dqueue: VecDeque<PathBuf> = VecDeque::new();
    dqueue.push_back(p);
    while let Some(dir) = dqueue.pop_front() {
        let mut read_dir = tokio::fs::read_dir(&dir).await?;
        while let Some(entry) = read_dir.next_entry().await? {
            let path = entry.path();
            if path.is_dir() {
                dqueue.push_back(path.clone());
                files.push(path);
            } else {
                // files.push(path);
            }
        }
    }


    // let mut stack:Vec<PathBuf>  = vec![p];
    // while let Some(dir) = stack.pop() {
    //     let mut read_dir = tokio::fs::read_dir(&dir).await?;
    //     while let Some(entry) = read_dir.next_entry().await? {
    //         let path = entry.path();
    //         if path.is_dir() {
    //             stack.push(path.clone());
    //             files.push(path);
    //         } else {
    //             // files.push(path);
    //         }
    //     }
    // }
    Ok(files.into_iter().map(|v| v.to_unix_path().unwrap()).collect())
}

pub fn collect_repos(conf:Arc<Config>) -> Result<Vec<String>,Error>{
    let mut names = Vec::new();
    for entry in std::fs::read_dir(&conf.storage)?
    {
        let entry = entry?;
            if entry.file_type()?.is_dir() {
                let name = entry
                    .file_name()
                    .into_string()
                    .map_err(|os| {
                    std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("non-utf8 directory name: {:?}", os),
                    )})?;
                names.push(name);
            }
        }
    Ok(names)
}

pub async fn collect_files(storage:&PathBuf,repo:&str) -> Result<Vec<PathBuf>, SFWWErrors>{
    let mut p= storage.clone();
    p.push(repo); 
    let mut files = Vec::new();
    let mut dqueue :VecDeque<PathBuf>=VecDeque::new();
    dqueue.push_back(p);
    while let Some(dir) = dqueue.pop_front() {
        let mut read_dir = tokio::fs::read_dir(&dir).await?;
        while let Some(entry) = read_dir.next_entry().await? {
            let path = entry.path();
            if path.is_dir() {
                dqueue.push_back(path.clone());
            } else {
                files.push(path);
            }
        }
    }
    Ok(files.into_iter().map(|v| v.to_unix_path().unwrap()).collect())
}

pub fn folder_size(path: impl AsRef<Path>) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let metadata = entry.metadata().ok()?;
            if metadata.is_file() {
                Some(metadata.len())
            } else {
                None
            }
        })
        .sum()
}

pub fn disk_capacity(path: impl AsRef<Path>) -> Option<(u64,u64,u64)> {
    let path = path.as_ref();
    dbg!(&path);
    let disks = sysinfo::Disks::new_with_refreshed_list();
    dbg!(&disks);
    let mut best = None;
    let mut best_len = 0;
    for disk in disks.list() {
        let mount = disk.mount_point();
        if path.starts_with(mount) {
            let len = mount.as_os_str().len();
            if len > best_len {
                best_len = len;
                best = Some((
                    disk.total_space(),
                    disk.available_space(),
                    disk.total_space() - disk.available_space(),
                ));
            }
        }
    }
    dbg!(best)
}


pub async fn move_file_to_rcyc(uuid:&str,conf: Arc<Config>) ->tokio::io::Result<()>{
    let mut source = conf.storage.clone();
    source.push(uuid);
    let mut target = conf.recycle.clone();
    target.push(uuid);
    tokio::fs::rename(source, target).await?;
    Ok(())
}

pub async fn restore_file_from_rcyc(uuid:&str,conf: Arc<Config>) ->tokio::io::Result<()>{
    let mut source = conf.recycle.clone();
    source.push(uuid);
    let mut target = conf.storage.clone();
    target.push(uuid);
    tokio::fs::rename(source, target).await?;
    Ok(())
}

pub fn zip_dir_flat(dir: impl AsRef<Path>) -> std::io::Result<Vec<u8>> {
    let dir = dir.as_ref();
    let mut buffer = Vec::new();
    let cursor = std::io::Cursor::new(&mut buffer);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    #[cfg(unix)]
    let options = options.unix_permissions(0o644);
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if !entry.file_type()?.is_file() {
            continue;
        }
                
        let name = path
            .file_name()
            .ok_or_else(|| std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "invalid file name",
            ))?
            .to_string_lossy()
            .into_owned();
        zip.start_file(name, options)?;
        let mut f = std::fs::File::open(&path)?;
        std::io::copy(&mut f, &mut zip)?;
    }
    let cursor = zip.finish()?;
    Ok(cursor.into_inner().to_vec())
}

pub fn zip_dir_iter(dir: impl AsRef<Path>) -> std::io::Result<Vec<u8>> {
    let dir = dir.as_ref();
    let mut buffer = Vec::new();
    let cursor = std::io::Cursor::new(&mut buffer);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    #[cfg(unix)]
    let options = options.unix_permissions(0o644);
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry?;
        let path = entry.path();
        let rel_path = path.strip_prefix(dir).unwrap();
        if rel_path.as_os_str().is_empty() {
            continue;
        }
        let name = rel_path
            .to_string_lossy()
            .replace('\\', "/");
        if entry.file_type().is_dir() {
            zip.add_directory(name, options)?;
        } else {
            zip.start_file(name, options)?;
            let mut f = std::fs::File::open(path)?;
            std::io::copy(&mut f, &mut zip)?;
        }
    }
    let cursor = zip.finish()?;
    Ok(cursor.into_inner().to_vec())
}

pub async  fn zip_files(paths_with_name:Vec<(impl AsRef<Path>,String)>)->std::io::Result<Vec<u8>> {
    let mut buffer = Vec::new();
    let cursor = std::io::Cursor::new(&mut buffer);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    #[cfg(unix)]
    let options = options.unix_permissions(0o644);
    for (p,name) in paths_with_name{
        let data = tokio::fs::read(p).await?;
        zip.start_file(name, options)?;
        zip.write_all(&data)?;
    }
    let cursor = zip.finish()?;
    Ok(cursor.into_inner().to_vec())
}


#[cfg(test)]
mod tests{
use std::str::FromStr;

use super::*;

    #[test]
    fn replace_prefix(){
        let path = PathBuf::from("./web_test/a2/a4/test.txt");
        let prefix = PathBuf::from("./web_test/a2");
        let new =PathBuf::from("./web_test/ccc/a2_copy");
        let y= PathBuf::from("./web_test/ccc/a2_copy/a4/test.txt");
        assert_eq!(path.replace_prefix(&prefix, &new).unwrap(),y);

        let path = PathBuf::from("./web_test/a2/xxx");
        let prefix = PathBuf::from("./web_test/a2/xxx");
        let new =PathBuf::from("./web_test/a2/yyy");
        let y= PathBuf::from("./web_test/a2/yyy");
        assert_eq!(path.replace_prefix(&prefix, &new).unwrap(),y);


        let path = PathBuf::from("./web_test/a2/xxx");
        let prefix = PathBuf::from("./web_test/a2/xxx");
        let new =PathBuf::from("./web_test/all");
        let y= PathBuf::from("./web_test/all");
        assert_eq!(path.replace_prefix(&prefix, &new).unwrap(),y);

        let path = PathBuf::from("./web_test/a2/xxx");
        let prefix = PathBuf::from("./web_test/a2");
        let new =PathBuf::from("./web_test/all");
        let y= PathBuf::from("./web_test/all/xxx");
        assert_eq!(path.replace_prefix(&prefix, &new).unwrap(),y);



        let path = PathBuf::from("./web_test/a/b/c/测试/d/e/f");
        let prefix = PathBuf::from("./web_test/a/b/c/测试");
        let new =PathBuf::from("./web_test/a/b/c/变化");
        let y= PathBuf::from("./web_test/a/b/c/变化/d/e/f");
        assert_eq!(path.replace_prefix(&prefix, &new).unwrap(),y);
    }
    #[test]
    fn to_unix_style(){
        assert_eq!(PathBuf::from(r"C:\Users\me\file.txt").to_unix_path().unwrap(), PathBuf::from("C:/Users/me/file.txt").to_unix_path().unwrap());
        assert_eq!(PathBuf::from(r"..\data\input.csv").to_unix_path().unwrap(), PathBuf::from("../data/input.csv").to_unix_path().unwrap());
        assert_eq!(PathBuf::from(r"/usr/local/bin").to_unix_path().unwrap(), PathBuf::from("/usr/local/bin").to_unix_path().unwrap());
        assert_eq!(PathBuf::from(r"\\server\share\dir").to_unix_path().unwrap(), PathBuf::from("//server/share/dir").to_unix_path().unwrap());
    }
    
    #[test]
    fn web_to_sys(){
        let sys=PathBuf::from("./web_test");
        let zone = "public";
        let a = PathBuf::from("./web_test/public/1.txt");
        let b = PathBuf::from("1.txt");
        assert_eq!(a.to_web_path(&sys, zone).unwrap(),b);
        assert_eq!(b.to_sys_path(&sys, zone).unwrap(),a);

        let a = PathBuf::from("");
        let b = PathBuf::from("./web_test/测试");

        assert_eq!(a.to_sys_path(&sys, "测试").unwrap(),b);
    }
    
    #[test]
    fn concat(){
        let a=PathBuf::from("./web_test");
        let b = PathBuf::from("public/name.txt");
        let c = PathBuf::from("./web_test/public/name.txt");
        // dbg!(&a);
        assert_eq!(a.concat(&b).unwrap(),c);
    }

    #[test]
    fn replace_segment(){
        let a=PathBuf::from("./web_test/public/name.txt");
        let old = OsString::from("public");
        let new = OsString::from("Unix");
        let b = PathBuf::from("./web_test/Unix/name.txt");
        assert_eq!(a.replace_segment_all(&old, &new).unwrap(),b);

        let a=PathBuf::from("./web_test/public/name.txt");
        let old = OsString::from("unix");
        let new = OsString::from("Unix");
        let b = PathBuf::from("./web_test/Unix/name.txt");
        dbg!(a.replace_segment_all(&old, &new));
        // assert_eq!(.unwrap(),SFWWErrors::CustomError(CustomErr::PathConvertFail));
    }
}
