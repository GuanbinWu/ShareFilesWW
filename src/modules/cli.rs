use std::{net::{IpAddr, Ipv4Addr}, path::PathBuf};

use clap::{Parser, Subcommand,Args};

#[derive(Debug, Parser)]
pub struct SFWWCli {
    #[arg(short = 'a',long="adress",help="ipv4地址",default_value_t =IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)))]
    pub adress: IpAddr,
    #[arg(short = 'p',long="port",help="端口",default_value_t =3344)]
    pub port:u16,
}

#[derive(Debug, Parser)]
pub struct WatcherCLI {
    #[command(subcommand)]
    pub command: ToolCommands,
}

#[derive(Debug, Parser)]
pub struct SFWWToolCLI {
    #[command(subcommand)]
    pub command: ToolCommands,
}

#[derive(Debug, Subcommand)]
pub enum ToolCommands {
    #[command(name = "resetpwd",about="重置密码")]
    ResetPwd(ResetArgs),
    #[command(name = "keygen",about= "生成随机密钥")]
    Keygen(KeygenArgs),
    #[command(name = "dbbkp",about= "手动触发一次数据库备份")]
    DbBkp,
    #[command(name = "dbrestore",about= "手动触发一次数据库恢复，需要指定备份文件")]
    DbRestore(PathArg),
    #[command(name = "clean",about= "手动触发一次残留文件清理")]
    CleanBkp(CleanArgs),
    #[command(name = "ckcapa",about= "检查数据表容量")]
    CkCapa,
    #[command(name = "export",about= "对当前逻辑文件系统导出语义化文件夹，要求路径为空")]
    Export(PathArg),
    #[command(name = "build",about= "从一个文件系统构建逻辑文件系统，要求路径为空")]
    Build(PathArg),
    #[command(name = "appwhite",about= "追加一个用户名到白名单里")]
    AppendWhite(ResetArgs),
}

#[derive(Debug, Args)]
pub struct ResetArgs {
    #[arg(short = 'u', long = "user",help="指定要更改的用户名")]
    pub username: String,
}


#[derive(Debug, Args)]
pub struct KeygenArgs {
    #[arg(short = 'l', long = "Length",help="密钥长度")]
    pub len: i32,
}

#[derive(Debug, Args)]
pub struct PathArg {
    #[arg(short = 'f', long = "file",help="文件路径")]
    pub path: PathBuf,
}


#[derive(Debug,Args)]
pub struct CleanArgs{
    #[arg(short = 'd', long = "days",help="超过此天数的回收站文件会被清理")]
    pub days: i32,
}

