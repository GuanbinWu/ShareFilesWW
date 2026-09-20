
use std::sync::Arc;

use clap::{Parser};
use ShareFilesWW::modules::{config::Config, route::AppState,*};
use sqlx::ConnectOptions;

#[tokio::main]
async fn main() {

    let (db_host,db_port,db_dbname,db_user,db_pwd,max_username_len,min_pwd_len,session_duration,storage,data,rcyc_bin,webrc,key,_pgpass,_bkp,_key_file)= utils::init();
    // dotenv::dotenv().ok();
    // let db_user = std::env::var("SFWW_DB_ROLE").unwrap();
    // let db_pwd = std::env::var("SFWW_DB_PWD").unwrap();
    // let db_dbname = std::env::var("SFWW_DB_NAME").unwrap();
    // let db_host = std::env::var("SFWW_DB_HOST").unwrap();
    // let db_port = std::env::var("SFWW_DB_PORT").unwrap().parse::<u16>().unwrap();
    // let encrypt_key = std::env::var("SWFF_ENCRYPT_KEY").unwrap();
    // let max_username_len = std::env::var("SFWW_MAX_USERNAME_LEN").unwrap().parse::<u64>().unwrap();
    // let min_pwd_len = std::env::var("SFWW_MIN_PWD_LEN").unwrap().parse::<u8>().unwrap();
    // let session_duration= std::env::var("SFWW_SESSION_DURATION").unwrap().parse::<u64>().unwrap();
    // let storage = PathBuf::from(std::env::var("SFWW_STORAGE").unwrap());
    // let data = PathBuf::from(std::env::var("SFWW_DATA").unwrap());
    // let rcyc_bin = PathBuf::from(std::env::var("SFWW_RCYC").unwrap());
    // let webrc = PathBuf::from(std::env::var("SFWW_WEBRC").unwrap());
    

    let cli= cli::SFWWCli::parse();

    let db_url = sqlx::postgres::PgConnectOptions::new()
    .username(&db_user)
    .password(&db_pwd)
    .database(&db_dbname)
    .host(&db_host)
    .port(db_port)
    .to_url_lossy();

    let config = Arc::new(Config::new(storage, data, webrc, max_username_len, min_pwd_len, db_url.to_string(), session_duration, rcyc_bin, key));
    let store = Arc::new(database::Store::new(db_url.as_str()).await);

    let app = route::router(AppState::new(config.clone(), store.clone()));
    let addr =std::net::SocketAddr::new(cli.adress, cli.port);
    warp::serve(app).run(addr).await;

}



#[cfg(test)]
mod tests{

use super::*;

    #[test]
    fn db_conn(){
        dotenv::dotenv().ok();
        let pgfile = std::env::var("PGPASSFILE").unwrap();
        // let db_user = std::env::var("SFWW_DB_ROLE").unwrap();
        // let db_pwd = std::env::var("SFWW_DB_PWD").unwrap();
        // let db_dbname = std::env::var("SFWW_DB_NAME").unwrap();
        // let db_host = std::env::var("SFWW_DB_HOST").unwrap();
        // let db_port = std::env::var("SFWW_DB_PORT").unwrap().parse::<u16>().unwrap();
        // let encrypt_key = std::env::var("SWFF_ENCRYPT_KEY").unwrap();
        // let max_username_len = std::env::var("SFWW_MAX_USERNAME_LEN").unwrap().parse::<u64>().unwrap();
        // let min_pwd_len = std::env::var("SFWW_MIN_PWD_LEN").unwrap().parse::<u8>().unwrap();
        // let session_duration= std::env::var("SFWW_SESSION_DURATION").unwrap().parse::<u64>().unwrap();
        // let storage = PathBuf::from(std::env::var("SFWW_STORAGE").unwrap());
        // let data = PathBuf::from(std::env::var("SFWW_DATA").unwrap());
        // let rcyc_bin = PathBuf::from(std::env::var("SFWW_RCYC").unwrap());
        // let webrc = PathBuf::from(std::env::var("SFWW_WEBRC").unwrap());

        let db_url = sqlx::postgres::PgConnectOptions::new().to_url_lossy();
        assert_eq!(db_url.as_str(),"");
        assert_eq!(pgfile,"./secrets/pgpass.conf");
        // .passfile() 
    }

}