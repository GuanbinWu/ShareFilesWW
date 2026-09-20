use std::{error::Error, fmt::{self, }};



#[derive(Debug)]
pub enum SFWWErrors{
    DbError(sqlx::Error),
    IOError(std::io::Error),
    WalkDirErrors(walkdir::Error),
    Base64Error(base64::DecodeError),
    CustomError(CustomError),
}

#[derive(Debug)]
pub enum CustomError {
//accounts
    NoSuchUser,
    BadPwdLen,
    NaivePwd,
    EmptyUsername,
    BadUsernameLen,
    NotInWhiteList,
    UsernameOccupied,
//auth
    IncorectPwd,
    InvalidAction,
    ArgonDecodeFail,
    ExpriedToken,
//network
    Md5Change,
    DismatchMimeType,
    InvalidQueryKey,
    ResponseBuildFail,
    NotUTF8,
//IO
    PathConvertFail,
    IllegalChar,
    FileNameOccupied,
    RepoNameOccupied,
    NoSuchFile,
    NoSuchFolder,
    NoSuchRepo,
    NoSuchLevel,
    ZipError,
//Other
    ParseIdError,
    DatabaseBroken,
    InvalidDependency,

}


impl fmt::Display for CustomError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self{
        CustomError::NoSuchUser => write!(f, "没有此用户"),
        CustomError::BadPwdLen => write!(f, "密码长度不合法"),
        CustomError::NaivePwd => write!(f, "密码过于简单"),
        CustomError::EmptyUsername => write!(f, "用户名不能为空"),
        CustomError::BadUsernameLen => write!(f, "用户名长度过长"),
        CustomError::NotInWhiteList => write!(f, "用户名不在白名单中"),
        CustomError::UsernameOccupied => write!(f, "用户名已被占用"),
        CustomError::IncorectPwd => write!(f, "密码错误"),
        CustomError::InvalidAction => write!(f, "非法操作"),
        CustomError::ArgonDecodeFail => write!(f, "密码哈希解析失败"),
        CustomError::ExpriedToken => write!(f, "token 已过期"),
        CustomError::Md5Change => write!(f, "MD5 校验失败"),
        CustomError::InvalidQueryKey => write!(f, "非法查询键"),
        CustomError::ResponseBuildFail => write!(f, "响应构造失败"),
        CustomError::PathConvertFail => write!(f, "路径转换失败"),
        CustomError::IllegalChar => write!(f, "非法字符"),
        CustomError::FileNameOccupied => write!(f, "文件名已存在"),
        CustomError::RepoNameOccupied => write!(f, "仓库名已存在"),
        CustomError::ParseIdError => write!(f, "ID 解析失败"),
        CustomError::DatabaseBroken=>write!(f, "数据库关系已被破坏"),
        CustomError::InvalidDependency=>write!(f, "不存在的依赖关系"),
        CustomError::NoSuchFile=>write!(f, "文件不存在"),
        CustomError::NoSuchFolder=>write!(f, "文件夹不存在"),
        CustomError::NoSuchRepo=>write!(f, "仓库不存在"),
        CustomError::NoSuchLevel=>write!(f, "等级不存在"),
        CustomError::ZipError=>write!(f, "压缩错误"),
        CustomError::DismatchMimeType=>write!(f, "文件类型不匹配"),
        CustomError::NotUTF8=>write!(f,"无法解码合法的成UTF-8字符")
    }
}}

impl fmt::Display for SFWWErrors {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SFWWErrors::DbError(e) =>write!(f, "{e}"),
            SFWWErrors::IOError(e) =>write!(f, "{e}"),
            SFWWErrors::WalkDirErrors(e) =>write!(f, "{e}"),
            SFWWErrors::Base64Error(e)=>write!(f, "{e}"),
            SFWWErrors::CustomError(e)=>write!(f, "{e}"),
        }
    }
}

impl Error for CustomError {}

impl Error for SFWWErrors {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            SFWWErrors::DbError(e) =>Some(e),
            SFWWErrors::IOError(e) =>Some(e),
            SFWWErrors::WalkDirErrors(e) =>Some(e),
            SFWWErrors::Base64Error(e)=>Some(e),
            SFWWErrors::CustomError(e)=>Some(e),
        }
    }
}


impl From<base64::DecodeError> for SFWWErrors {
    fn from(value: base64::DecodeError) -> Self {
        SFWWErrors::Base64Error(value)
    }
}


impl From<CustomError> for SFWWErrors {
    fn from(value: CustomError) -> Self {
        SFWWErrors::CustomError(value)
    }
}

impl From<std::io::Error> for SFWWErrors {
    fn from(value: std::io::Error) -> Self {
        SFWWErrors::IOError(value)
    }
}


impl From<sqlx::Error> for SFWWErrors {
    fn from(value: sqlx::Error) -> Self {
        SFWWErrors::DbError(value)
    }
}



impl From<walkdir::Error> for SFWWErrors {
    fn from(value: walkdir::Error) -> Self {
        SFWWErrors::WalkDirErrors(value)
    }
}


impl warp::reject::Reject for SFWWErrors {}

// impl From<SFWWErrors> for warp::Rejection {
//     fn from(err: SFWWErrors) -> Self {
//         warp::reject::custom(err)
        
//         // match err {
//         // SFWWErrors::DbError(e) => warp::reject::custom(e),
//         // SFWWErrors::IOError(e)=>warp::reject::reject(),
//         // SFWWErrors::WalkDirErrors(e)=>warp::reject::reject(),
//         // SFWWErrors::Base64Error(e)=>warp::reject::reject(),
//         // SFWWErrors::CustomError(e)=>warp::reject::reject(),
//         // }
//     }
// }

pub fn err_to_reject<T:Into<SFWWErrors>>(e:T)->warp::Rejection{
    e.into().into()
}

