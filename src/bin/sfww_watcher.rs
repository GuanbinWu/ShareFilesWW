
//职责：在后台监控主程序
//任务：每天3：00定时备份数据库
//任务：每天3：00定时检查回收站中已经超过一个月的文件，删除且清理数据表

use tokio_cron_scheduler;
use tokio;
use sqlx::ConnectOptions;
use ShareFilesWW::modules::database::Store;
use ShareFilesWW::modules::config::Config;
use ShareFilesWW::modules::utils::{self};
use std::sync::Arc;
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
        _key_file)= utils::init();

    let db_url =sqlx::postgres::PgConnectOptions::new()
    .username(&db_user)
    .password(&db_pwd)
    .database(&db_dbname)
    .host(&db_host)
    .port(db_port)
    .to_url_lossy();

    let config = Arc::new(Config::new(storage, data, webrc, max_username_len, min_pwd_len, db_url.to_string(), session_duration, rcyc_bin, key));
    let config_ptr =config.clone();
    let store = Arc::new(Store::new(db_url.as_str()).await);
    let store_ptr=store.clone();
    // let rt = tokio::runtime::Runtime::new().unwrap();
    let sched = tokio_cron_scheduler::JobScheduler::new().await.unwrap();


    sched.add(tokio_cron_scheduler::Job::new_async("0 0 3 * * * *", move |_uuid, _l| {
        let t = config_ptr.clone();
        let s = store_ptr.clone();
        let host = db_host.clone();
        let port = db_port.clone();
        let user = db_user.clone();
        let dbname = db_dbname.clone();
        let pg =pgpass.clone();
        let bkpbklp= bkp.clone();

        let date = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let db_to = bkp.join(&format!("{}.dump",date));

        Box::pin(async move{
            utils::bkp_database(&host,port,user,dbname,&pg,&db_to).await;
            utils::clean_expire_files(30, t, s).await;
            match utils::del_expired_db_bkp(&bkpbklp, 7, ".dump"){
                Ok(_)=>println!("del_expired_db_bkp success keep 7"),
                Err(e)=>panic!("{}",e)
            }
        })
    })
    .expect("创建定时任务失败"))
    .await.unwrap();
    sched.start().await.unwrap();

    tokio::signal::ctrl_c().await.expect("监听 Ctrl+C 失败");
    println!("收到退出信号，正在关闭...");


}
