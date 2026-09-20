
use crate::modules::{auth::{self}, config::Config, database::Store, errors::CustomError, handlers::{self}};
use std::{collections::{HashMap},};
use warp::{Filter, http::{Method}, reject::{Rejection}, reply::{Reply}};
use std::sync::Arc;
use crate::modules::datastruct::*;
use crate::modules::errors::SFWWErrors;

#[derive(Clone)]
pub struct AppState{
    pub config:Arc<Config>,
    pub store:Arc<Store>,
}

impl AppState {
    pub fn new(config: Arc<Config>  ,store:Arc<Store>)->Self{
        AppState { config, store }
    }
}

pub fn router(state:AppState)-> impl Filter<Extract = impl Reply, Error = std::convert::Infallible> + Clone{
    let mut path = state.config.webrc.clone();
        path.push("static");
    let statics = warp::path("static").and(warp::fs::dir(path));

    statics
        .or(portal(state.clone()))
        .or(account_filter(state.clone())
        .or(files_filter(state.clone()))
        .or(folders_filter(state.clone()))
        .or(log_filter(state.clone()))
        .or(session_filter(state.clone()))
        .or(repo_filter(state.clone()))
        .or(level_filter(state.clone()))
        .or(rcyc_filter(state))
        .recover(revcover_handler)
    )
    
}

fn with_state(state:AppState)->impl Filter<Extract = (AppState,),Error = std::convert::Infallible>+Clone{
    warp::any().map(move || state.clone() )
}

fn portal(state:AppState)->impl Filter<Extract = impl Reply,Error = Rejection>+Clone{ 
    let tmp = state.clone();
    let login_portal = 
        warp::path("portal")
        .and(warp::path("login"))
        .and(warp::path::end())
        .and(warp::get())
        .map( move || {
            let mut path=tmp.config.webrc.clone();
            path.push("pages/login.html");
            let page = std::fs::read_to_string(&path).unwrap_or_default();
            warp::reply::html(page)
        });
    
    let main_portal = 
        warp::path("portal")
        .and(warp::path("files"))
        .and(warp::path::end())
        .and(warp::get())
        .map( move || {
            let mut path=state.config.webrc.clone();
            path.push("pages/main.html");
            let page = std::fs::read_to_string(&path).unwrap_or_default();
            warp::reply::html(page)
        });
    
    login_portal.or(main_portal)

}


fn account_filter(state:AppState) ->impl Filter<Extract = impl  Reply,Error=Rejection>+Clone{

    let base = 
    warp::path("api")
    .and(warp::path("accounts"))
    .and(with_state(state));

    let create = base.clone()    
    .and(warp::path("create"))
    .and(warp::path::end())
    .and(warp::post())
    .and(warp::body::json::<Account>())
    .and_then(handlers::account_create_handler);

    let edit = base.clone()    
    .and(warp::path("edit"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(warp::query::<HashMap<String,String>>())
    .and(warp::body::json::<AccountWithNewPwd>())
    .and_then(handlers::account_edit_handler);

    let delete=base.clone()
    .and(warp::path("delete"))
    .and(warp::path::end())
    .and(warp::delete())
    .and(warp::body::json::<Account>())
    .and_then(handlers::account_delete_handler);

    let list =base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and_then(handlers::account_list_handler);

    create.or(edit).or(delete).or(list)
}

fn repo_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{

    let base = warp::path("api")
    .and(warp::path("repo"))
    .and(with_state(state));

    let list = base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and_then(handlers::repo_list_handler);
    
    let edit = base.clone()
    .and(warp::path("edit"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(auth::auth())
    .and(warp::body::json::<Repo>())
    .and_then(handlers::repo_edit_handler);

    let create = base.clone()
        .and(warp::path("create"))
        .and(warp::path::end())
        .and(warp::post())
        .and(auth::auth())
        .and(warp::body::json::<RepoWithInitLevel>())
        .and_then(handlers::repo_create_handler);

    let delete = base.clone()
    .and(warp::path("delete"))
    .and(warp::path::end())
    .and(warp::delete())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::repo_delete_handler);

    list.or(edit).or(create).or(delete)
}

fn folders_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    let base = 
    warp::path("api")
    .and(warp::path("folders"))
    .and(with_state(state));

    let list = base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::folder_list_handler);
    
    let create = base.clone()
    .and(warp::path("create"))
    .and(warp::path::end())
    .and(warp::post())
    .and(auth::auth())
    .and(warp::body::json::<FolderEntry>())
    .and_then(handlers::folder_create_handler);
    
    let delete = base.clone()
    .and(warp::path("delete"))
    .and(warp::path::end())
    .and(warp::delete())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::folder_delete_handler);

    let edit = base.clone()
    .and(warp::path("edit"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(auth::auth())
    .and(warp::body::json::<FolderEntry>())
    .and_then(handlers::folder_edit_handler);
    
    let download =base.clone()
    .and(warp::path("download"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,String>>())
    .and_then(handlers::folder_dowload_handler);
    list.or(edit).or(create).or(delete).or(download)
}


fn files_filter(state:AppState) ->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    let base = 
    warp::path("api")
    .and(warp::path("files"))
    .and(with_state(state));
    
    let create = base.clone()
    .and(warp::path("create"))
    .and(warp::path::end())
    .and(warp::post())
    .and(auth::auth())
    .and(warp::header::<String>("x-file-name"))
    .and(warp::header::<i32>("x-content-folder"))
    .and(warp::header::<i32>("x-content-repo"))
    .and(warp::header::<String>("content-type"))
    .and(warp::header::<String>("x-content-md5"))
    .and(warp::body::bytes())
    .and_then(handlers::files_upload_handler);

    let copy = base.clone()
    .and(warp::path("copy"))
    .and(warp::path::end())
    .and(warp::post())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::files_copy_handler);
    
    let delete = base.clone()
    .and(warp::path("delete"))
    .and(warp::path::end())
    .and(warp::delete())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::files_delete_handler);

    let edit = base.clone()
    .and(warp::path("edit"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(auth::auth())
    .and(warp::body::json::<FileEntryNoUuid>())
    .and_then(handlers::files_edit_handler);

    let download = base.clone()
    .and(warp::path("download"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::files_download_handler);

    let list = base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::files_list_handler);
    download.or(edit).or(create).or(delete).or(list).or(copy)

}

fn rcyc_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    let base = 
    warp::path("api")
    .and(warp::path("rcyc"))
    .and(with_state(state));
    
    let list = base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and_then(handlers::rcyc_list_handler);

    let get = base.clone()
    .and(warp::path("get"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::rcyc_get_handler);
    
    let restore = base.clone()
    .and(warp::path("restore"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::rcyc_restore_handler);
    

    let download = base.clone()
    .and(warp::path("download"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::rcyc_download_handler);
    list.or(restore).or(download).or(get)
}


fn log_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    warp::path::path("api")
    .and(warp::path("log"))
    .and(warp::path::end())
    .and(with_state(state))
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::log_handler)
}


fn mycors()->warp::filters::cors::Builder{
    warp::cors()
    .allow_any_origin()
    .allow_header("content-type")
    .allow_methods(&[Method::GET,Method::DELETE,Method::POST,Method::PATCH])
}

fn session_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    let base = warp::path("api")
    .and(warp::path("auth"))
    .and(with_state(state));

    let verify = base.clone()
    .and(warp::path("verify"))
    .and(warp::path::end())
    .and(warp::get())

    .and(warp::query::<HashMap<String,String>>())
    .and_then(handlers::auth_verify_handler);


    let login = base.clone()
    .and(warp::path("login"))
    .and(warp::path::end())
    .and(warp::post())
    .and(warp::body::json::<Account>())
    .and_then(handlers::auth_login_handler);

    let logout = base.clone()
    .and(warp::path("logout"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and_then(handlers::auth_logout_handler);
    
    login.or(logout).or(verify)
}


fn level_filter(state:AppState)->impl Filter<Extract = impl Reply,Error=Rejection>+Clone{
    
    let base = warp::path("api")
    .and(warp::path("level"))
    .and(with_state(state));

    let list = base.clone()
    .and(warp::path("list"))
    .and(warp::path::end())
    .and(warp::get())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,String>>())
    .and_then(handlers::level_list_handlers);


    let create = base.clone()
    .and(warp::path("create"))
    .and(warp::path::end())
    .and(warp::post())
    .and(auth::auth())
    .and(warp::body::json::<RepoUserLevel>())
    .and_then(handlers::level_create_handlers);

    let edit = base.clone()
    .and(warp::path("edit"))
    .and(warp::path::end())
    .and(warp::patch())
    .and(auth::auth())
    .and(warp::body::json::<RepoUserLevel>())
    .and_then(handlers::level_edit_handlers);

    let delete = base.clone()
    .and(warp::path("delete"))
    .and(warp::path::end())
    .and(warp::delete())
    .and(auth::auth())
    .and(warp::query::<HashMap<String,i32>>())
    .and_then(handlers::level_delete_handlers);

    list.or(create).or(edit).or(delete)

}


async fn revcover_handler(err:warp::Rejection)-> Result<impl warp::Reply,std::convert::Infallible>{

    if let Some(e) = err.find::<SFWWErrors>() {
        match e {
            SFWWErrors::CustomError(t)=>{
                match t {
                    CustomError::ExpriedToken => Ok(warp::reply::with_status(e.to_string(), warp::http::StatusCode::UNAUTHORIZED)),
                    _=> Ok(warp::reply::with_status(e.to_string(), warp::http::StatusCode::INTERNAL_SERVER_ERROR))
                }
            },
            _ => Ok(warp::reply::with_status(e.to_string(), warp::http::StatusCode::INTERNAL_SERVER_ERROR)) 
        }
    }else{
        Ok(warp::reply::with_status("?".to_string(), warp::http::StatusCode::INTERNAL_SERVER_ERROR))
    }
}