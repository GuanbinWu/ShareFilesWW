use chrono::{DateTime, Utc};
use rand::{self, Rng,rngs::OsRng};
use warp::{Filter, reject::Rejection};
use std::{ sync::Arc};
use crate::modules::{config::Config, database::Store, errors::*};
use crate::modules::{datastruct::*, errors};

pub async fn is_vaild_pwd(pwd:&str,conf:Arc<Config>)->Result<bool,SFWWErrors>{
    if pwd.len()<conf.min_pwd_len as usize{
        return Err(CustomError::BadPwdLen.into())
    }
    let mut tmp=conf.data.clone();
    tmp.push("bad_pwd.txt");

    let bad_pwd_list:Vec<String>= tokio::fs::read_to_string(tmp)
    .await
    .map_err(|e|  SFWWErrors::from(e))?
    .lines()
    .map(|s|s.to_string())
    .filter(|s| !s.is_empty())
    .collect();    

    if bad_pwd_list.iter().any(|s| s == pwd){
        return Err(CustomError::NaivePwd.into())
    }else {
        return Ok(true)
    }
}

pub fn hash_passwd(passwd:&str)->String {
    let salt=rand::thread_rng().r#gen::<[u8;32]>();
    let conf=argon2::Config::default();
    let hashed=argon2::hash_encoded(passwd.as_bytes(), &salt, &conf).unwrap();
    return hashed
}

pub fn compare_passwd(passwd:&str,hashed:String)->Result<bool, SFWWErrors>{
    let a= argon2::verify_encoded(&hashed, passwd.as_bytes())
    .map_err(|_|CustomError::ArgonDecodeFail.into());
    a
}

pub async fn is_valid_user_name(username:&str,conf:Arc<Config>)->Result<bool, SFWWErrors>{
    if username.is_empty() {
        return Err(CustomError::EmptyUsername.into());
    }
    if username.chars().count() > conf.max_username_len as usize {
        return Err(CustomError::BadUsernameLen.into());
    }
    if !username.chars().all(|c| c.is_alphabetic() || c == '_') {
        return Err(CustomError::IllegalChar.into());
    }
    let mut tmp=conf.data.clone();
    tmp.push("username_whitelist.txt");
    let username_whitelist:Vec<String>= tokio::fs::read_to_string(tmp)
    .await
    .map_err(|e|  SFWWErrors::from(e))?
    .lines()
    .map(|s|s.to_string())
    .filter(|s| !s.is_empty())
    .collect();
    
    if username_whitelist.contains(&username.to_string()){
        Ok(true)
    }else {
        return Err(CustomError::NotInWhiteList.into());
    }
    
}

//管理员功能

pub fn pwd_generator(length: usize)-> String{
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
                             abcdefghijklmnopqrstuvwxyz\
                             0123456789\
                             !@#$%^&*()-_=+[]{};:,.<>?";
    let mut rng = OsRng;
    (0..length)
    .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
    })
    .collect()
}
pub async fn reset_pwd(username:&str,store:Arc<Store>,length: usize)->Result<(),SFWWErrors>{
    let pwd = pwd_generator(length);
    let hashed= hash_passwd(&pwd);
    let id = if let Some(v) = store.query_username(username).await? {
       v 
    }else{
        return Err(CustomError::NoSuchUser.into())
    };
    store.edit_account(id, AccountForStore { 
        id:id, 
        username: username.to_string(), 
        hashed:hashed })
    .await?;
    println!("用户{}(id:{})\n的密码已重置为\n{}\n，请复制后妥善保存。",username,id,&pwd);
    Ok(())
}


//Session
pub fn create_token(username:&str,days:u64,nbf:DateTime<Utc>,key:&str)->String{
    let now_time=Utc::now();
    let dt=now_time+chrono::Duration::days(days as i64);

    paseto::tokens::PasetoBuilder::new()
    .set_encryption_key(&Vec::from(key.as_bytes()))
    .set_expiration(&dt)
    .set_not_before(&nbf)
    .set_claim("username", serde_json::json!(username))
    .build()
    .expect("Fail to construct paseto token builder")
}



pub fn verify_token(token:&str)->Result<Session,String>{
    if token.is_empty() {
        return Err("Token is empty".to_string());
    }
    let token=paseto::tokens::validate_local_token(
        &token,
         None, 
         "0123456789abcdef0123456789abcdef".as_bytes(), 
         &paseto::tokens::TimeBackend::Chrono)
         .map_err(|_|"Cannot DecryptToken".to_string())?;
    // println!("{}",token.clone());
    serde_json::from_value::<Session>(token).map_err(|_|"Cannot DecryptToken".to_string())
}


pub fn auth() -> impl Filter<Extract = (Session,), Error = Rejection> + Clone {
    warp::header::<String>("Authorization")
        .and_then(|token: String| {
            async move {
                match verify_token(&token) {
                    Ok(session) => {
                        Ok(session)},
                    Err(_) => {
                        Err(err_to_reject(errors::CustomError::ExpriedToken))},
                }
            }
        })
}

