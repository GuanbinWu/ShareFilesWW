

# ShareFilesWW(Share Files Without Wechat)
### Introduction
本项目实现一个逻辑文件系统，利用局域网实现小型团队的文件储存与分享，避免对社交软件（微信群、QQ群）的过分依赖。同时具备权限系统，以解决特定业务的实际需求。

### Features
- 文件夹语义依赖数据库而非实际的文件路径，由此避免了需要额外处理的非法字符串问题。提升了稳健性。
- 支持多用户，并有自定义的权限系统。与unix的user,group,rwx逻辑不同。本项目用等级规定权限。适应多种业务场景的需求。
- 用户密码采用argon2撒盐加密。
- 附带定时工具，用于清理被用户标记为不需要的文件，不必担心磁盘增长。同时可自定义回收站保存时间方便用户撤销删除。
- 附有较为方便的手动工具，用户管理员手动重置密码，导出、导入文件，等。无需亲自进入数据库操作。
- 暂时采用白名单+局域网模式确保网络安全。

### Usage
- 获取源码
```
git clone https://github.com/GuanbinWu/ShareFilesWW.git
```
- 编译二进制文件
```
cargo build --bins --release
```
这会在./target/release 下编译出ShareFilesWW, sfww_tool, sfww_watcher 三个可执行文件。
- 配置环境
```
在项目根目录下新建.env文件，并设置以下字段：
SWFF_ENCRYPT_KEY=xxx //<PathBuf>密钥文件，用于paseto库加密会话token，仅包含一串32字符的密钥，可用sfww_tool生成。
SFWW_MAX_USERNAME_LEN=xxx //<int>最大用户名长度
SFWW_MIN_PWD_LEN=xxx //<int>最短密码长度
SFWW_SESSION_DURATION=xxx //<int>会话有效天数
SFWW_STORAGE=xxx //<PathBuf>磁盘目录，用于储存用户上传的文件，需要为空目录
SFWW_RCYC=xxx //<PathBuf>回收站目录，用户删除的文件会移动到此处，保存若干天，然后被sfww_watcher清理
SFWW_WEBRC=xxx //<PathBuf>前端文件路径，参考本项目提供的./web 路径。
SFWW_DATA=xxx //<PathBuf>data文件夹下需包含两个文件，bad_pwd.txt和username_whitelist.txt，用于用户注册。详见./src/modules/auth.rs
SFWW_PGPASSFILE=xxx //<PathBuf> postgres数据库的登录凭证，使用pgpassfile可以避免在命令行中手动键入数据库密码。参考127.0.0.1:5432:mydatabase:myusername:mypassword
SFWW_BKP=xxx //<PathBuf>备份路径，sfww_watcher定时备份的数据库文件将保存在此目录下。
```
SFWW_STORAGE,SFWW_RCYC,SWFF_ENCRYPT_KEY,SFWW_BKP需要挂载在同一磁盘下，否则无法正常复制文件。
- 新建数据库
参考./unix_db_create.sh脚本。首先需要用postgres默认用户创建新的用户、密码、数据库。然后以新用户身份创建程序运行所需的所有数据表。
- 启动服务
```
./target/release/ShareFilesWW[.exe] -a 127.0.0.1 -p 3344
./target/release/sfww_watcher[.exe]
```
用户在浏览器键入"ip:port/portal/files"进入文件系统。
- 命令行帮助
```
./target/release/ShareFilesWW[.exe] -h
./target/release/sfww_tool[.exe] -h
./target/release/sfww_watcher[.exe] -h
```
可查看参数说明和子命令。
- sfww_tool功能介绍
```
//子命令如下
resetpwd   手动重置某一用户的密码，需输入用户名
keygen     生成随机字符串，可自选长度，可用于生成密钥
dbbkp      手动触发一次数据库备份，并将密钥文件备份一次。
dbrestore  手动触发一次数据库恢复，需要指定备份文件。要求数据表不存在。
clean      手动触发一次残留文件清理。删除已存放超过30天的回收站的文件。
ckcapa     打印当前数据表id使用情况。id均为i32，一般不会爆表，用此命令可以快速查看。
export     对当前逻辑文件系统导出语义化文件夹，要求路径为空。ShareFilesWW主程序通过数据库维护文件树结构，实际落盘方式为装桶。此命令可以将用户前端看到的文件结构“确实地”打包导出。可用于文件迁移。
build      从一个文件系统构建逻辑文件系统，要求路径为空。读取一个文件夹下的内容，按照ShareFilesWW主程序的管理方式构建数据库，要求数据表存在但为空。
help       Print this message or the help of the given subcommand(s)
```
以上命令也会读取.env环境下的部分信息。这里强调手动，是因为上述的部分功能也是sfww_watcher的定时任务之一。
- sfww_watcher功能介绍
职责：每天早上3点执行一次数据库文件的备份，保持备份队列的文件数为7。并检查回收站数据库，删除存放超过30天的文件。
### Design
#### Problem I am trying to solve：
我用着微信、QQ、飞书等软件，“享受”着国内互联网巨头创建的协作办公生态，我的体验是：国内软件不管干啥都离不开“聊天框”这一模板，文件传输显然只是对话的附庸，在person to person 场景下，传文件当然好办。多个用户需要共享文件，也好办，开个群聊即可。但如果一项业务需要多人参与，每个人的读写权限都不同怎么办？显然，leader必须开很多个群聊，把人分门别类。由此造成的管理精力浪费和信息不对称折磨着我的团队合作体验，同时更大的问题是，这种方式在不断耗尽我私人电脑的磁盘资源。
我不想对巨头们领导的发展方向评头论足，但我希望能有一个系统以文件为主体，而非人为主体。文件仅此一份，但对每个用户展现出不同的可见性和读写权限？所以，ShareFilesWW就是我想出的办法（至少在我的办公场景，它能工作）。
致命问题：看上去我自己手搓了一个简陋的Onedrive，为什么不考虑让团队直接用Onedrive？而且它原生支持Office在线编辑，显然除了微软没人能提供这种服务啊。是啊，这真是个好问题。一方面，我是在项目写完之后才发现Onedrive其实已经实现了我想要的协作功能，而且显然做得更好。事实就是，克服了web端开发的一些术语和协议后，这个项目本身没花多少时间，这也不是什么杰作，人人都能在几天内写出这些源码。另一方面，我对Onedrive用得很少，这可能是国内办公生态的一种侧面体现，我无法说服任何人来一起用Onedrive，另一方面身边也真没几个人带着我用Onedrive。但所有人莫名其妙地都能忍受用微信这种聊天软件办公。飞书、钉钉试图做的显然也不是文件传输，而是公司管理，日程表，打卡那一套，整个软件依然构建在“聊天框”上。我面临的客观条件是：（1）团队有一台服务器，（2）团队都在同一局域网下，（3）作为一个编程方面的半吊子脚本小子，我也愿意给自己找点正经项目提升技能，熟悉技术栈，（4）团队对于打开一个网站下载上传文件的抗拒不那么高（5）我只是提供一个替代品，并不是要取代什么，有比没有好，事实上，这个项目运行一段时间之后，团队还是习惯微信群开个共享文档，这部分不是写程序能解决的。综合以上，我决定花点时间写出ShareFilesWW。

#### Model：
- 文件仓库:
一个文件仓库包含一棵单根节点文件夹树，每个文件夹并储存若干文件。一个文件仓库维护一个权限矩阵，每个成员在本仓库中有且只有一个【等级】。由此构成了一个level(user,repo)矩阵。当业务过于复杂时，可以通过新增仓库，提炼出另一套权限关系。因此一个文件仓库对应一种业务模式。
- 文件夹：
文件夹具有等级，用户等级大于文件夹等级时，可以进入其中并完整操作其中的文件，等级相等时，用户可进入文件夹，上传自己的文件，随意操作自己创建的文件，但本目录中的他人的文件只能只能被看见有此条目，而不能读写，这样做的考虑是防止用户上传文件时的重名冲突，因此需要向用户暴露文件夹结构。当用户等级小于文件夹时，无法进入。可见，两种等级构造出了三种场景（完全共享区，提交大厅，归档锁定）。
- 等级：
暂定为0-9共10个整数，这里考虑的是一个业务通常不需要将人分化出9层差异。
- 自治风格：
本项目最大的期待，引入上述系统之后，面对不同的业务场景依靠用户自治演化出权限。用户可以像拼积木一样调整系统结构，而不需要程序员为每种情况打造一个表单页面。因此本项目不想设置“系统管理员”、“仓库管理员”等独立于等级的字段，开发者只负责维护代码，而不应当对业务本身如何处理过多干预。以下是一些例子：
（1）每个用户都要考虑，自己的文件会被更高等级的人随意操作。倘若业务上形成冲突，此时应当新建仓库，划分新的成员与等级。
（2）每个文件夹都有父文件夹。每个文件夹都有等级。设置规则：用户在当前目录下新建的文件夹的等级，需大于等于本文件夹且小于等于当前用户等级。可以想象，这会自然演化出文件夹等级的纵深结构，即，高等级的文件夹一定会诞生于低者之后，从而无需担心2级用户可能面临1-3-2这种文件夹结构的情况。
- 特殊地，对于公共仓库，为了减轻数据库压力，开辟了一个【可见性】字段，可见性为公开时，可以提供额外的放行，从而有效降低level(user,repo)矩阵的条目数。当可见性为私有时，则由等级系统完全接管。
- 文件应当维护一个【创建者】字段，由此解决同等级目录下的权限细分。此时每个人只对自己创建的文件有权限。

### API
此处列出前后端通信路由，具体参数可见./web/static/script/api.js源码或./src/modules/route.rs。

|业务|HTTP方法 |路由                                            |是否需要token|用途|
|----|----    |----                                            |----|----|
|入口|GET     |/portal/login                                  |n|登录界面|
|入口|GET     |/protal/files                                  |n|文件门户界面|
|用户|POST    |/api/accounts/create                           |n|注册账户|
|用户|PATCH   |/api/accounts/edit?action=newpwd               |n|编辑用户信息|
|用户|DELETE  |/api/accounts/delete?id=xxx                    |n|注销账户|
|用户|GET     |/api/accounts/list                             |y|获取系统中所有用户名|
|仓库|GET     |/api/repo/list                                  |y|获取所有的repo|
|仓库|PATCH   |/api/repo/edit                                  |y|修改仓库状态|
|仓库|POST    |/api/repo/create                                |y|创建仓库|
|仓库|DELETE  |/api/repo/delete?id=xxx                         |y|删除仓库|
|目录|GET     |/api/folders/list?repo=xxx                      |y|列出目录|
|目录|POST    |/api/folders/create                             |y|新建目录|
|目录|PATCH   |/api/folders/edit                               |y|编辑目录|
|目录|DELETE  |/api/folders/delete?id=xxx                      |y|删除目录|
|目录|GET     |/api/folders/download?action=xxx&id=xxx         |y|删除目录|
|文件|POST    |/api/files/create                               |y|上传文件|
|文件|POST    |/api/files/copy?id=xxx&folder=xxx               |y|上传文件|
|文件|GET     |/api/files/download?id=xxx                      |y|下载文件|
|文件|DELETE  |/api/files/delete?id=xxx                        |y|删除文件|
|文件|PATCH   |/api/files/edit?action=xxx                      |y|编辑文件|
|文件|GET     |/api/files/list?repo=xxx&&folder=xxx            |y|列出文件|
|权限|GET     |/api/level/list?action=xxx&id==xxx              |y|列出指定repo的所有权限记录|
|权限|POST    |/api/level/create                               |y|上传一条LEVEL|
|权限|PATCH   |/api/level/edit                                 |y|修改一条LEVEL|
|权限|DELETE  |/api/level/delete?repo=xxx&userid=xxx           |y|删除一条LEVEL|
|鉴权|GET     |/api/auth/verify/?token=xxx                     |n|验证会话有效期|
|鉴权|GET     |/api/auth/logout                               |n|登出|
|鉴权|GET     |/api/auth/login                                |n|登录|
|日志|GET     |/api/log?len=100                                |y|获取日志|
|恢复|GET     |/api/rcyc/list                                  |y|获取文件回收站目录|
|恢复|GET     |/api/rcyc/download?id=xxx                       |y|获取文件回收站目录|
|恢复|GET     |/api/rcyc/get?id=xxx                            |y|获取回收站中某条文件|
|恢复|PATCH   |/api/rcyc/restore?id=xxx                        |y|恢复回收站文件|
