// console.log("main")
import * as API from "./api.js";
import * as Utils from "./utils.js";
import {Previewer} from "./previewer.js";
import "./spark_md5.js";
import * as Tree from "./tree.js";



type action = "create"|"edit"|"delete"
type state = "idle"|"repo"|"folder"|"log"|"rcyc"
type levelEditRecords = {source:API.RepoUserLevel,target:API.RepoUserLevel};


const appState = {
    //init
    allRepo:new Map() as Map<number,API.Repo>,
    allLevel:new Map() as Map<number,API.RepoUserLevel>,
    allUser:new Map() as Map<number,API.AccountWithoutPwd>,
    user: API.emptyType.user as API.AccountWithoutPwd,
    token:localStorage.getItem("token")??"" as string,
    state:"idle"as state,

    //进入repo时写入
    currentRepo:API.emptyType.repo as API.Repo,
    allFolder:new Map() as Map<number,API.FolderEntry>,
    currentLevel:API.emptyType.lv as API.RepoUserLevel,

    //进入folder时写入
    currentFolder:API.emptyType.folder as API.FolderEntry,
    allFile:new Map() as Map<number,API.FileEntry>,

    update_token:function(token:string){
        localStorage.setItem("token",token);
        this.token=token;
    },

    get_parent_dir:function(dir:number){
        const item = this.allFolder.get(dir);
        if (!item) throw new Error("not found");
        const value = item.parent_id;
        return value
    },

    concat_full_path:function(dir:number){
        const a = []as string[];
        let currentDir= dir;
        const visited = new Set();
        
        while (currentDir!=0){
            // console.log(a);
            if (visited.has(currentDir)) break;
            const item = this.allFolder.get(currentDir);
            if (!item) break;
            a.push(item.name);
            currentDir = item.parent_id;
        }
        a.pop()
        a.reverse();
        return new Utils.Path(a).to_string_with_root()
    },

    walk_folder:function(dir:number){
        //属于本节点的所有子节点，递归，不包含本身
        const result = [] as number[];
        const stack = [dir];
        while (stack.length > 0) {
            const currentId = stack.pop();
            const children = [...appState.allFolder.values()].filter(item => item.parent_id === currentId);
            for (const child of children) {
                result.push(child.id);
                stack.push(child.id);
            }
        }
        return result;
    },

    updateFolderMap:function(items:Array<API.FolderEntry>){
        const tmp:Map<number,API.FolderEntry>=new Map(); 
        for (const item of items){
            tmp.set(item.id,item)
        }
        this.allFolder=tmp;
    },
    updateFileMap:function(items:Array<API.FileEntry>){
        const tmp:Map<number,API.FileEntry>=new Map(); 
        for (const item of items){
            tmp.set(item.id,item)
        }
        this.allFile=tmp;
    },
    updateRepoMap:function(items:Array<API.Repo>){
        const tmp:Map<number,API.Repo>=new Map(); 
        for (const item of items){
            tmp.set(item.id,item)
        }
        this.allRepo=tmp;
    },
    updateAccountMap:function(items:Array<API.AccountWithoutPwd>){
        const tmp:Map<number,API.AccountWithoutPwd>=new Map(); 
        for (const item of items){
            tmp.set(item.id,item)
        }
        this.allUser=tmp;
    },
    updateLevelMap:function(items:Array<API.RepoUserLevel>){
        const tmp:Map<number,API.RepoUserLevel>=new Map(); 
        for (const item of items){
            tmp.set(item.id,item)
        }
        this.allLevel=tmp;
    },
    updateUser:function(){
        for (const entry of this.allUser.values()){
            if (entry.username === localStorage.getItem("username")){
                this.user=entry
            }
        }
    },

    query_level:function(repo_entry:API.Repo){
        const level = [...this.allLevel.values()].filter(v=>v.userid==this.user.id && v.repo ==repo_entry.id)[0];
        if (level ===undefined){
            return {id:0,repo:repo_entry.id,userid:this.user.id,level:0};
        }else{
            return level;
        }
    },
    init:function(allRepo:Array<API.Repo>,allLevel:Array<API.RepoUserLevel>,allUser:Array<API.AccountWithoutPwd>,){
        this.updateRepoMap(allRepo);
        this.updateAccountMap(allUser);
        this.updateLevelMap(allLevel);
        this.updateUser();
        this.token=localStorage.getItem("token")??"" as string;
    },
    into_idle:async function() {
        this.state ="idle";
        const users = await API.accounts_list(appState.token);
        const repos:Array<API.Repo> =await API.repo_list(appState.token);
        const levels:Array<API.RepoUserLevel> =await API.level_all(appState.token);
        this.init(repos,levels,users);
        this.currentRepo=API.emptyType.repo as API.Repo;
        this.allFolder=new Map() as Map<number,API.FolderEntry>;
        this.currentLevel=API.emptyType.lv as API.RepoUserLevel;
        this.currentFolder=API.emptyType.folder as API.FolderEntry;
        this.allFile=new Map() as Map<number,API.FileEntry>;
    },
    into_repo:function(repo_entry:API.Repo,allFolders:Array<API.FolderEntry>) {
        this.state ="repo";
        this.currentRepo=repo_entry as API.Repo;
        this.updateFolderMap(allFolders);
        this.currentLevel = this.query_level(repo_entry);
        this.currentFolder=API.emptyType.folder as API.FolderEntry;
        this.allFile=new Map() as Map<number,API.FileEntry>;
    },
    into_folder:function(folder_entry:API.FolderEntry,allFiles:Array<API.FileEntry>) {
        this.state ="folder";
        this.currentFolder=folder_entry as API.FolderEntry;
        this.updateFileMap(allFiles);
    },
    into_log:function() {
        this.state ="log";
        this.currentRepo=API.emptyType.repo as API.Repo;
        this.allFolder=new Map() as Map<number,API.FolderEntry>;
        this.currentLevel=API.emptyType.lv as API.RepoUserLevel;
        this.currentFolder=API.emptyType.folder as API.FolderEntry;
        this.allFile=new Map() as Map<number,API.FileEntry>;
    },
    into_rcyc:function(){
        this.state ="rcyc";
        this.currentRepo=API.emptyType.repo as API.Repo;
        this.allFolder=new Map() as Map<number,API.FolderEntry>;
        this.currentLevel=API.emptyType.lv as API.RepoUserLevel;
        this.currentFolder=API.emptyType.folder as API.FolderEntry;
        this.allFile=new Map() as Map<number,API.FileEntry>;
    },

}


async function go_back(){
    // console.log(appState.state);
    if (appState.state === "idle"){
        return;
    }
    if (appState.state === "log"){
        await idleState()
    }
    if (appState.state === "rcyc"){
        await idleState()
    }
    if (appState.state === "repo"){
        await idleState()
    }
    if (appState.state === "folder"){
        await repoState(appState.currentRepo)
    }
}



function noMoreContent(){
    const p = document.createElement("div")
    p.id = "noMoreContent";
    p.className = "loading";
    p.textContent = "没有更多内容了";
    return p
}




function LayoutInit() {
    const layout =  document.createElement("div");
    layout.className ="layout";
    
    const sidebar =  document.createElement("div");
    sidebar.className ="sidebar";
    
    const sidebarTitle =  document.createElement("div");
    sidebarTitle.className = "sidebar-title";
    
    const logo =  document.createElement("a");
    logo.href = "https://guanbinwu.github.io";
    logo.target = "_blank";
    logo.rel = "noopener";
    logo.style= "color: inherit; text-decoration: none;font-size:var(-  -fsize_small)";
    logo.textContent ="ShareFilesWW v0.4.0";
    sidebarTitle.append(logo);
    
    const welcome =  document.createElement("div");
    welcome.className="sidebar-info";
    welcome.textContent= "欢迎,";

    const username =  document.createElement("div");
    username.className ="sidebar-info";
    username.id ="sidebar-username";
    username.textContent = localStorage.getItem("username");

    // const goback = Utils.goBack_floating_window(()=>go_back());

    const sidebar_item_container =  document.createElement("div");
    sidebar_item_container.className="sidebar-item-container";
    sidebar_item_container.id = "sidebar-item-container";

    
    
    const sidebar_footer =  document.createElement("div");
    sidebar_footer.className = "sidebar-footer";
    sidebar_footer.innerHTML = "<p>单击：进入目录</p><p>双击：预览文件</p><p>右键：打开菜单</p>"
    
    const bless = document.createElement("p");
    bless.style.paddingTop="20px";
    bless.textContent = "🖖Live long and prosper🖖"

    sidebar_footer.append(bless)
    const main =  document.createElement("div");
    main.className="main";
    main.id="main";

    // const goback = goBack();
    
    sidebar.append(sidebarTitle,welcome,username,sidebar_item_container,sidebar_footer);
    layout.append(sidebar,main);
    // layout.append(main);
    
    return layout;
}



function setting(){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    const title = document.createElement('div');
    title.className="modal-title";
    title.textContent="设置";
    const msg = Utils.messager()
    msg.set("相关功能还在开发中...")
    const cancelfn = ()=>{overlay.remove()}
    const btn_container=Utils.confirmBtns("确定","返回",cancelfn,cancelfn)
    box.append(title,msg.el,btn_container)
    overlay.append(box)
    document.body.append(overlay)
}


function sidebarFixedItems(){
    
    const btn_set = document.createElement("div")
    btn_set.className = "sidebar-item";
    btn_set.id = "setting";
    btn_set.textContent = "设置";
    btn_set.addEventListener("click",(e)=>{
        // console.log("设置");
        setting()
    });

    const btn_log = document.createElement("div")
    btn_log.className = "sidebar-item";
    btn_log.id = "log";
    btn_log.title="查看最新的100条用户记录"
    btn_log.textContent = "查看日志";
    btn_log.addEventListener("click",async (e)=>{
        // console.log("日志");
        await logState();
    });

    const btn_rcyc = document.createElement("div")
    btn_rcyc.className = "sidebar-item";
    btn_rcyc.id = "recycle_bin";
    btn_rcyc.title="查看回收站，被删除的文件可以在这里找到并下载，最多保存30天"
    btn_rcyc.textContent = "回收站";
    btn_rcyc.addEventListener("click",async (e)=>{
        await rcycState()
    });

    const btn_logout = document.createElement("div")
    btn_logout.className = "sidebar-item";
    btn_logout.id = "logout";
    btn_logout.textContent = "登出";
    btn_logout.addEventListener("click",async(e)=>{
        const newtoken = await API.auth_logout(appState.token);
        appState.update_token(newtoken)
        await check_session();
    });
    const btn_usage = document.createElement("div");
    btn_usage.className = "sidebar-item";
    btn_usage.id = "usage";
    btn_usage.textContent = "帮助";
    btn_usage.addEventListener("click",async(e)=>{
        window.location.href = "/static/docs/usage.pdf";
    });
    return [btn_set,btn_log,btn_rcyc,btn_usage,btn_logout]
}

async function idleState(){
    // await initAppState()
    await appState.into_idle();
    const repos = [...appState.allRepo.values()];

    const mainBody = document.getElementById('main');
    const sidebarItems =document.getElementById("sidebar-item-container");
    if (!sidebarItems || !mainBody){return;}
    if (!mainBody){return;}
    sidebarItems.innerHTML=``;
    mainBody.innerHTML= ``;
    const repoEl = renderRepos(repos);
    
    const createRepo = document.createElement("div");
    createRepo.className = "sidebar-item";
    createRepo.id = "createRepo";
    createRepo.textContent="新建仓库";

    createRepo.addEventListener("click",async ()=>{
       await create_repo();
    })

    repoEl.addEventListener("click",async(e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".repo");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.repoId);

        const repo_entry = appState.allRepo.get(id)!;
        await repoState(repo_entry);

    })
    
    repoEl.addEventListener("contextmenu",async(e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".repo");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.repoId);

        const repo_entry = appState.allRepo.get(id)!;
        const my_level = appState.query_level(repo_entry);
        const is_admin = ()=>{
            if (repo_entry.public){return true;}
            else{ return my_level.level===9};
        }
        await repoMenu(e,repo_entry,is_admin());
    })

    mainBody.append(repoEl);
    sidebarItems.append(createRepo,...sidebarFixedItems());
}

async function logState() {
    appState.into_log();
    const items = await API.log(appState.token,100);
    const mainBody = document.getElementById('main');
    const sidebarItems =document.getElementById("sidebar-item-container");
    if (!sidebarItems || !mainBody){return;}
    mainBody.innerHTML="";
    sidebarItems.innerHTML = "";

    const table = document.createElement('table');
    table.className = "file-table";
    table.id = "logTable";

    const thead = document.createElement("thead");
    thead.id = "logTableThead";

    const tbody =document.createElement("tbody");
    tbody.id = "logTableBody";
    
    const headtr = document.createElement('tr');

    const nameTd = document.createElement('th');
    nameTd.textContent = "用户";
    nameTd.style.width ="200px";
    nameTd.className = "th";
    
    const actionTd = document.createElement('th');
    actionTd.textContent = "动作";
    actionTd.style.width ="200px";
    actionTd.className = "th";
    
    const fileTd=document.createElement('th');
    fileTd.textContent ="文件";
    fileTd.style.width ="200px";
    fileTd.className = "th";

    const fodlerTd=document.createElement('th');
    fodlerTd.textContent ="目录";
    fodlerTd.style.width ="200px";
    fodlerTd.className = "th";

    const repoTd=document.createElement('th');
    repoTd.textContent ="仓库";
    repoTd.style.width ="200px";
    repoTd.className = "th";
    
    const timeTd=document.createElement('th');
    timeTd.textContent ="时间";
    timeTd.style.width ="360px";
    timeTd.className = "th";
    
    const argsTd=document.createElement("th");
    argsTd.style.width ="auto";
    argsTd.className = "th";
    argsTd.textContent="参数";

    headtr.append(nameTd,actionTd,fileTd,fodlerTd,repoTd,timeTd,argsTd);

    thead.appendChild(headtr);

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className ="file-tr";
        // tr.classList.add("banned")
        const nameTd = document.createElement('td');
        nameTd.textContent = item.username;        
        const actionTd = document.createElement('td');
        actionTd.textContent = item.action;
        
        const fileTd=document.createElement('td');
        fileTd.textContent = item.file;
        
        const folderTd=document.createElement('td');
        folderTd.textContent = item.folder;

        const repoTd=document.createElement('td');
        repoTd.textContent = item.repo;

        const timeTd=document.createElement('td');
        timeTd.textContent =item.time;
        
        const argsTd=document.createElement("td");
        argsTd.textContent =item.args;
        
        tr.append(nameTd,actionTd,fileTd,folderTd,repoTd,timeTd,argsTd);
        tbody.append(tr);
    });

    table.append(thead,tbody);
    mainBody.append(table,noMoreContent());
    // sidebarItems.append(backRepo());
    sidebarItems.append(...sidebarFixedItems());
    
    const goback = Utils.goBack_floating_window(()=>go_back())
    mainBody.append(goback);

}


async function rcycState() {
    appState.into_rcyc();
    
    const mainBody = document.getElementById('main');
    const sidebarItems =document.getElementById("sidebar-item-container");
    if (!sidebarItems || !mainBody){return;}
    mainBody.innerHTML="";
    sidebarItems.innerHTML = "";

    const fileContainer = document.createElement("div");
    fileContainer.id ="rcyc-container" ;
    fileContainer.className="fileContainer";
    const notes = Utils.rcycNotes()
    const goback = Utils.goBack_floating_window(()=>go_back())
    

    const refreshfn=async()=>{
        const files = await API.rcyc_list(appState.token);
        fileContainer.replaceChildren(rcycTable(files));
    }
    fileContainer.addEventListener("contextmenu",async (e)=>{
        // console.log(appState);
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".file-tr");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.id);
        const folder= Number(El.dataset.folder);
        const repo =Number(El.dataset.repo);
        // console.log(repo);
        const name =El.dataset.fileName;
        const creator = El.dataset.creator;
        if (name ===undefined || creator===undefined)return;
        if (creator!=appState.user.username)return;

        await rcycMenu(e,id,folder,repo,name,refreshfn)
    })

    await refreshfn()

    sidebarItems.append(...sidebarFixedItems());
    mainBody.append(notes,fileContainer,noMoreContent());
    mainBody.append(goback);


}



async function repoState(repo_entry:API.Repo) {
    //进入repo 查看文件夹树
    const folder_entrys = await API.folder_list(appState.token,repo_entry.id);
    appState.into_repo(repo_entry,folder_entrys);
    const my_level = appState.currentLevel.level;  

    const mainBody = document.getElementById('main')!;
    const sidebarItems =document.getElementById("sidebar-item-container")!;
    sidebarItems.innerHTML=``;
    sidebarItems.append(...sidebarFixedItems())    
    mainBody.innerHTML = ``;
    const level_logo= Utils.levelNotes(my_level);
    mainBody.append(level_logo);


    const banned = [...appState.allFolder.values()].filter(v=>v.level>my_level).map(v=>v.id)
    // console.log(banned)
    const tree = Tree.itemsToTree(folder_entrys)!;
    if (!tree)return;
    const treeEle = Tree.renderTree(tree,banned,[])!;
    if (!treeEle)return;
    mainBody.append(treeEle);

    const treeContainer = document.getElementById('fileDirTree')!;
    if(!treeContainer)return;

    treeContainer.addEventListener("click",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".tree-node");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.id);

        const folder_entry = appState.allFolder.get(id)!;
        const permit = Utils.get_permission(repo_entry.public,my_level,folder_entry.level);
        if (permit === "ban")return;
        await folderState(repo_entry,folder_entry,permit);

    })

    treeContainer.addEventListener("contextmenu",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".tree-node");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.id);
        const folder_entry = appState.allFolder.get(id)!;
        const permit = Utils.get_permission(repo_entry.public,my_level,folder_entry.level);
        if (permit === "ban")return;     
        await folderMenu(e,repo_entry,folder_entry,repo_entry.public,my_level,permit);

    })

    const goback = Utils.goBack_floating_window(()=>go_back())
    mainBody.append(goback);
}





function toolBar(refreshfn:(dir_id: number) => Promise<void>,
cwd:HTMLDivElement,
cb_open:() => void,
cb_close:() => void,
cb_cked:() => Array<number>,){
    const toolBar = document.createElement("div");
    toolBar.className = "toolbar";
    toolBar.id = "toolbar";
    
    const span = document.createElement("span");
    span.textContent =" 你目前位于➤";
    span.style.color = "var(--white)"

    const refresh = Utils.toolbar_logo("refreshBtn","/static/icons/tool/refresh.svg","刷新页面")
    const goUp = Utils.toolbar_logo("parentBtn","/static/icons/tool/return.svg","返回上级目录")
    const createText = Utils.toolbar_logo("newFileBtn","/static/icons/tool/newfile.svg","点击创建文本文件")
    const upload = Utils.toolbar_logo("upload","/static/icons/tool/upload.svg","点击上传一个（多个）文件到当前目录下，但不能上传文件夹")
    const multiSelect = Utils.toolbar_logo("multiSelectBtn","/static/icons/tool/download.svg","批量下载多个文件到本地")
    const confirmSelect = Utils.toolbar_logo("cancelSelectBtn","/static/icons/tool/confirm_dowload.svg","批量下载多个文件到本地")

    confirmSelect.style.backgroundColor="var(--blue)"
    confirmSelect.hidden = true;
    

    goUp.addEventListener("click",async(e)=>{
        const pid= appState.get_parent_dir(appState.currentFolder.id);
        if (pid ===0){return;}
        await refreshfn(pid);
    })

    upload.addEventListener("click",async(e)=>{
        const repo :API.Repo= appState.currentRepo;
        const folder:API.FolderEntry=appState.currentFolder;
        await upload_files(repo,folder,refreshfn);
    })

    refresh.addEventListener("click",async(e)=>{
        await refreshfn(appState.currentFolder.id);
    })


    multiSelect.addEventListener("click",()=>{
        confirmSelect.hidden=false;
        multiSelect.hidden=true;
        cb_open()

    })

    confirmSelect.addEventListener("click",async()=>{
        const selectedIds = cb_cked();
        console.log(selectedIds)
        for (const id of selectedIds){
            const file = appState.allFile.get(id)!;
            await download_file(file)
        }
        cb_close()
        multiSelect.hidden=false;
        confirmSelect.hidden=true;
    })

    toolBar.append(span,cwd,refresh,goUp,upload,createText,multiSelect,confirmSelect)
    return toolBar
}




async function folderState(repo_entry:API.Repo,folder_entry:API.FolderEntry,permission:Utils.Permission) {
    
    const files = await API.file_list(appState.token,appState.currentRepo.id,folder_entry.id);
    appState.into_folder(folder_entry,files);
    const mainBody = document.getElementById('main');
    const sidebarItems =document.getElementById("sidebar-item-container");
    if (!mainBody ||!sidebarItems){return;}
    sidebarItems.innerHTML=``;
    sidebarItems.append(...sidebarFixedItems());
    mainBody.innerHTML = "";

    const fileContainer = document.createElement("div");
    fileContainer.id ="file-container" ;
    fileContainer.className="fileContainer";

    const cwd = document.createElement("div");
    cwd.className = "path";
    cwd.id = "currentPath";
    const goback = Utils.goBack_floating_window(()=>go_back())

    const refreshfn = async (dir_id:number)=>{        
        const files = await API.file_list(appState.token,appState.currentRepo.id,dir_id);
        const entry = appState.allFolder.get(dir_id);
        if (entry===undefined)return;
        appState.into_folder(entry,files);
        const full_name = appState.concat_full_path(dir_id)
        cwd.textContent = full_name;
        const file_table = fileTable(files,permission)
        fileContainer.replaceChildren(file_table.el);
        mainBody.replaceChildren(toolBar(refreshfn,cwd,file_table.open,file_table.close,file_table.slcted),fileContainer,noMoreContent(),goback);
    }

    refreshfn(folder_entry.id);
    const enable_operate = (file_entry:API.FileEntry) =>{
            if (permission==="limit" && appState.user.username != file_entry.creator)return false;
            return true;
    }
    // fileContainer.addEventListener("click",()=>{})

    fileContainer.addEventListener("dblclick",async(e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const el = target.closest(".file-tr");
        if (!(el instanceof HTMLElement)) return;        
        const id = Number(el.dataset.id);
        const file = appState.allFile.get(id)!;
        const enable=enable_operate(file)
        if (enable){
            await preview(repo_entry,folder_entry,file);
        }
    })

    fileContainer.addEventListener("contextmenu",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const El = target.closest(".file-tr");
        if (!(El instanceof HTMLElement)) return;
        const id = Number(El.dataset.id);
        const file_entry=appState.allFile.get(id)!;
        await fileMenu(e,repo_entry,folder_entry,file_entry,enable_operate(file_entry),refreshfn)
    })

    
}


async function folderMenu(event:PointerEvent,repo_entry:API.Repo,folder_entry:API.FolderEntry,repo_pub:boolean,mylevel:number,permission:Utils.Permission) {
//   console.log(permission);
    //两级自由度
  //当前的权限模式，以及文件夹是否是根目录
  //(limit,is_root) create 只能新建文件夹
  //(limit,not_root) create move 只能新建/移动
  //(free,is_root) create download empty 根目录不能移动，根目录不能编辑。
  //(free,not_root) create move edit download empty del 自由模式的非根目录，授予全部功能。
  const existing = document.querySelector('.context-menu');
  if (existing){existing.remove()}
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  
  if (permission==="ban")return;
    
  const is_root =()=>{
    return folder_entry.name === "" || folder_entry.parent_id===0
  }
  
  const actions = ()=>{
    const actions = []
    actions.push({ label: '新建目录', action: async() => create_folder(repo_entry,folder_entry,mylevel)})
    if (permission==="limit" && !is_root()){
        actions.push({ label: '移动目录', action: async() => move_folder(repo_entry,folder_entry,mylevel)})
        return actions;
    }
    if (permission==="free" && is_root()){
        actions.push({ label: '下载目录', action: async() => download_folder_flat(repo_entry,folder_entry)})
        actions.push({ label: '清空文件', action: async() => empty_folder(repo_entry,folder_entry)})
        return actions;
    }
    if (permission==="free" && !is_root()){
        actions.push({ label: '移动目录', action: async() => move_folder(repo_entry,folder_entry,mylevel)})
        actions.push({ label: '编辑', action: () => edit_folder(repo_entry,folder_entry,mylevel)})
        actions.push({ label: '下载目录', action: async() => download_folder_flat(repo_entry,folder_entry)})
        actions.push({ label: '清空文件', action: async() => empty_folder(repo_entry,folder_entry)})
        actions.push({ label: '删除目录', action: async() => del_folder(repo_entry,folder_entry)})
        return actions;
    }
    return actions;
}
  


    actions().forEach(({ label, action }) => {
    const btn = document.createElement('button');
    btn.className = "menu-item"
    btn.textContent = label;
    btn.onclick = () => {
      action();
      menu.remove();
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const closeOnClick = (e:PointerEvent) => {
    if (!(e.target instanceof Node)) return;
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  
  setTimeout(() => document.addEventListener('click', closeOnClick), 0);
}


async function fileMenu(event:PointerEvent,repo_entry:API.Repo,folder_entry:API.FolderEntry,file_entry:API.FileEntry,enable_edit:boolean,refreshfn:(dir:number)=>void) {
  const existing = document.querySelector('.context-menu');
  if (existing){existing.remove()}
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  const actions = [{ label: '详情', action: () => detail_file(repo_entry,folder_entry,file_entry)}]
  if (enable_edit) {
    actions.push({ label: '复制', action: async() => copy_file(repo_entry,folder_entry,file_entry,refreshfn)})
    actions.push({ label: '重命名', action: async() => edit_file(repo_entry,folder_entry,file_entry,enable_edit,refreshfn)})
    actions.push({ label: '移动', action: async() => move_file(repo_entry,folder_entry,file_entry,refreshfn)})
    actions.push({ label: '下载', action: async() => download_file(file_entry)})
    actions.push({ label: '删除', action: async() => del_file(repo_entry,folder_entry,file_entry,refreshfn)})
  }
actions.forEach(({ label, action }) => {
    const btn = document.createElement('button');
    btn.className = "menu-item";
    btn.textContent = label;
    btn.onclick = () => {
      action();
      menu.remove();
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const closeOnClick = (e:PointerEvent) => {
    if (!(e.target instanceof Node)) return;
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnClick), 0);
}


async function rcycMenu(event:PointerEvent,id:number,folder:number,repo:number,name:string,refreshfn:()=>void) {
  const existing = document.querySelector('.context-menu');
  if (existing){existing.remove()}
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  const actions = [{ label: '下载', action: () => download_rcyc_file(id,name)}]
    actions.push({ label: '还原', action: async() => restore_rcyc_file(id,folder,repo,refreshfn)})
actions.forEach(({ label, action }) => {
    const btn = document.createElement('button');
    btn.className = "menu-item";
    btn.textContent = label;
    btn.onclick = () => {
      action();
      menu.remove();
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const closeOnClick = (e:PointerEvent) => {
    if (!(e.target instanceof Node)) return;
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnClick), 0);
}


async function download_rcyc_file(id:number,name:string) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement("div");
    box.className="modal-box";

    const lding_box =document.createElement("div");
    lding_box.style.display="flex";
    lding_box.style.justifyContent="center";
    lding_box.style.alignItems="center";
    lding_box.style.padding="20px";
    const loading = document.createElement("div");
    loading.className = "spinner";
    const msg = Utils.messager()
    msg.set("正在下载中，请等待...")
    lding_box.append(loading)
    box.append(lding_box,msg.el)
    overlay.append(box)
    document.body.append(overlay);
    try {
        const res = await API.rcyc_download(appState.token,id);
        const md5Base64 = res.md5;
        const blob = res.bytes;
        const buffer = await blob.arrayBuffer();
        let tmp;
        if (md5Base64) {
            const md5Compute = await calcFileMD5(buffer);
            if (md5Compute !== md5Base64) {
                // throw new Error("检测到MD5值不匹配，文件可能在传输途中可能存在信息丢失。本次下载已中止。")
                msg.push("检测到MD5值不匹配，文件在传输途中可能存在信息丢失，下载仍会继续，但请注意文件完整性。")
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        msg.set("Ok")
        msg.push("窗口将于1秒后关闭")
        await Utils.sleep(1000)
        overlay.remove()
    }catch(e){
        if (e instanceof Error){msg.set(e.message)}
        else{msg.set(String(e))}
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.remove();
    });

    
}

async function restore_rcyc_file(id:number,folder:number,repo:number,refreshfn:()=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement("div");
    box.className="modal-box";

    const lding_box =document.createElement("div");
    lding_box.style.display="flex";
    lding_box.style.justifyContent="center";
    lding_box.style.alignItems="center";
    lding_box.style.padding="20px";
    const loading = document.createElement("div");
    loading.className = "spinner";
    const msg = Utils.messager()
    msg.set("正在恢复中，请等待...")
    lding_box.append(loading)
    box.append(lding_box,msg.el)
    overlay.append(box)
    document.body.append(overlay);
    try{
        console.log(repo);
        const repo_entry = appState.allRepo.get(repo);
        console.log(repo_entry);
        if (repo_entry===undefined){
            throw new Error("找不到原始仓库，可能已被删除，无法恢复")
        }
        const folders = await API.folder_list(appState.token,repo);
        if (!folders.some(v=>v.id===folder)){
            throw new Error("找不到原始文件夹，可能已被删除，无法恢复")
        }
        const res = await API.rcyc_restore(appState.token,id);
        msg.set("Ok")
        msg.push("窗口将于1秒后关闭")
        await Utils.sleep(1000)
        overlay.remove()
    }catch(e){
        if (e instanceof Error){
            if (e.message==="文件名已存在"){
            msg.push("这说明此文件被删除后，所在的文件夹又储存了一个同名文件，恢复会造成冲突")}
            msg.set(e.message)}
        else{
            msg.set(String(e))
        }
    }

     overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.remove();
    });
}

//done
async function edit_folder(repo_entry:API.Repo,folder:API.FolderEntry,max_level:number) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const name_editor = nameEditor("编辑文件夹",folder.name,true);
    const level_editor =levelScroll(folder.level,0,max_level,1);
    const message = Utils.messager();

    const confirmfn = async()=>{
        try{
        const new_name=name_editor.get();
        Utils.is_dir_name_valid(new_name);
        // console.log(folder.name,new_name); 
        let new_level = level_editor.get();
        if (repo_entry.public){
            new_level=0
        };

        if (new_level!= folder.level || new_name!=folder.name){
            const new_folder :API.FolderEntry= {id: folder.id,name: new_name,parent_id: folder.parent_id,repo: folder.repo,level:new_level }
            const res = await API.folder_edit(new_folder,appState.token);
        }
        await Utils.sleep(1000)
        message.set("Ok")
        overlay.remove();
        await repoState(repo_entry);
        }catch(e){
            if (e instanceof Error){message.set(e.message)}
            else(message.set(String(e)))
        }
    }

    const  cancelfn= ()=>{overlay.remove()};
    const btn_container = Utils.confirmBtns("确认","返回",confirmfn,cancelfn)
    box.append(name_editor.el,level_editor.el,btn_container,message.el);
    overlay.append(box)
    document.body.append(overlay);
}
//done


async function move_folder(repo_entry:API.Repo,folder_entry:API.FolderEntry,my_level:number) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "选择要移动到的父文件夹";


    //计算不应该被点击的节点
    //1 等级更大的，因为子节点的等级应当大于等于父节点。因此只有等级小于等于当前节点的节点可以成为新的父节点。
    //2 所有子节点,否则会成环。
    //3 当前的父节点，避免无效操作。
    const diableIds=appState.walk_folder(folder_entry.id);
    // diableIds.push(folder_entry.id);
    diableIds.push(folder_entry.parent_id);
    for (const [k,v] of appState.allFolder){
        if (v.level>folder_entry.level){
            diableIds.push(k)
        }
    }

    const tree  = Tree.itemsToTree([...appState.allFolder.values()])!;
    if (tree===undefined)return;
    const tree_container = Tree.renderTree(tree,diableIds,[folder_entry.id]);
    if (tree_container===undefined) return;

    const hint = Utils.messager()
    hint.hint()
    hint.set("你当前操作的文件夹被标记为蓝色。请选择它的父文件夹。灰色文件夹不可点击，否则会出现逻辑错误。")
    
    // const slct_lable = 

    let slct:HTMLElement|null=null;

    tree_container.addEventListener("click",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const el = target.closest(".tree-node");
        if (!(el instanceof HTMLElement)) return;
        const id = Number(el.dataset.id);


        if (slct===null){
            slct=el;
            slct.className="tree-node-slcted";
        }else{
            if (slct!=el){
                slct.className="tree-node";
                slct =el;
                slct.className="tree-node-slcted";
            }
        }
        // console.log(slct.dataset.id);
    })

    const err =Utils.messager();

    const confirmfn = async ()=>{
        try{
        if (slct===null){
            throw new Error("应当选择一个父文件夹");
        }
        const new_folder :API.FolderEntry= {id:folder_entry.id,name:folder_entry.name,level:folder_entry.level,parent_id:Number(slct!.dataset.id),repo:folder_entry.repo}
        const res = await API.folder_edit(new_folder,appState.token);
        err.set("Ok")
        await Utils.sleep(1000);
        overlay.remove()
        await repoState(repo_entry);
    }catch(e){
            if (e instanceof Error){err.set(e.message)}else{err.set(String(e))};
        }

    }

    const cancelfn = ()=>{overlay.remove()}


    const btns = Utils.confirmBtns("确认","取消",confirmfn,cancelfn)
    

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
         overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
       overlay.remove();
    });
    box.append(title,hint.el,tree_container,btns,err.el);
    overlay.append(box);
    document.body.append(overlay);

}
async function create_folder(repo_entry:API.Repo,folder_entry:API.FolderEntry,max_level:number) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const name_editor = nameEditor("新建文件夹名称","",true);
    const level_editor =levelScroll(folder_entry.level,folder_entry.level,max_level,1);
    const msg = Utils.messager();

    const confirmfn = async ()=>{
        try{
        const new_name=name_editor.get();
        const new_level = level_editor.get();
        Utils.is_dir_name_valid(new_name);
    
        if ([...appState.allFolder.values()].some(v=>v.name===new_name)){
            throw new Error(`当前仓库下已经存在一个${new_name}目录！`)
        }

        const f :API.FolderEntry= {id:0,name: new_name,parent_id:folder_entry.id,repo:repo_entry.id,level:new_level}
        const res = await API.folder_create(f,appState.token)
        msg.set("Ok");
        await Utils.sleep(1000);
        overlay.remove();
        await repoState(repo_entry);
        }catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else(msg.set(String(e)))
        }
    }

    
    const  cancelfn= ()=>{overlay.remove()};
    const btn_container = Utils.confirmBtns("确认","返回",confirmfn,cancelfn)
    box.append(name_editor.el,level_editor.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay);
}

async function del_folder(repo_entry:API.Repo,folder_entry:API.FolderEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "你正在删除以下文件夹"
    

    const note = document.createElement('div');
    note.innerHTML=`
    <p>${span_fix_width("文件夹ID:")}${folder_entry.id}</p>
    <p>${span_fix_width("文件夹名称:")}${folder_entry.name}</p>
    <p>${span_fix_width("上级目录:")}${folder_entry.parent_id}</p>
    <p>${span_fix_width("所属仓库:")}${folder_entry.repo}</p>
    <p>${span_fix_width("文件夹等级:")}${folder_entry.level}</p>
    <p>${span_fix_width("所属仓库名:")}${repo_entry.name}</p>
    <p>${span_fix_width("仓库是否公开:")}${repo_entry.public}</p>
    `
    note.style.padding="20px";

    const note2 = Utils.messager()
    note2.set("文件夹中的所有文件将被删除，请三思后行。点击三次确定后开始删除。")

    const msg = Utils.messager()

    let count:number = 0;
    const comfirmfn = async () =>{
        try{count+=1;
            if (count===3){
            const res = await API.folder_delete(folder_entry.id,appState.token);
            msg.set("Ok");
            await Utils.sleep(1000)
            overlay.remove()
            await repoState(repo_entry);
        }}catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else{msg.set(String(e))}
        }
    }
    const cancelfn =()=>{
        overlay.remove()
    }

    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);
    box.append(title,note,note2.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay)
}

async function empty_folder(repo_entry:API.Repo,folder_entry:API.FolderEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "你正在清空以下文件夹"
    

    const note = document.createElement('div');
    note.innerHTML=`
    <p>${span_fix_width("文件夹ID:")}${folder_entry.id}</p>
    <p>${span_fix_width("文件夹名称:")}${folder_entry.name}</p>
    <p>${span_fix_width("上级目录:")}${folder_entry.parent_id}</p>
    <p>${span_fix_width("所属仓库:")}${folder_entry.repo}</p>
    <p>${span_fix_width("文件夹等级:")}${folder_entry.level}</p>
    <p>${span_fix_width("所属仓库名:")}${repo_entry.name}</p>
    <p>${span_fix_width("仓库是否公开:")}${repo_entry.public}</p>
    `
    note.style.padding="20px";

    const note2 = Utils.messager()
    note2.set("文件夹中的所有文件将被删除，但保留此文件夹，同时子目录及其文件不受影响。请三思后行。点击三次确定后开始删除。")

    const msg = Utils.messager()

    let count:number = 0;
    const comfirmfn = async () =>{
        try{count+=1;
            if (count===3){
                const files = await API.file_list(appState.token,repo_entry.id,folder_entry.id);
                for (const f of  files){
                    const res = await API.file_delete(f.id,appState.token);
                }
                msg.set("Ok");
                await Utils.sleep(1000)
                overlay.remove()
        }}catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else{msg.set(String(e))}
        }
    }
    const cancelfn =()=>{
        overlay.remove()
    }
    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);
    box.append(title,note,note2.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay)
}





//todo!
async function download_folder_flat(repo_entry:API.Repo,folder_entry:API.FolderEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement("div");
    box.className="modal-box";
    const lding_box =document.createElement("div");
    lding_box.style.display="flex";
    lding_box.style.justifyContent="center";
    lding_box.style.alignItems="center";
    lding_box.style.padding="20px";
    const loading = document.createElement("div");
    loading.className = "spinner";
    const msg = Utils.messager()
    msg.set("正在下载中，请等待...")
    lding_box.append(loading)
    box.append(lding_box,msg.el)
    overlay.append(box)
    document.body.append(overlay);
    try {
        // const res = await API.file_download(appState.token,file.id);
        const res =await API.folder_download(appState.token,folder_entry.id);
         const md5Base64 = res.md5;
        const blob = res.bytes;
        const buffer = await blob.arrayBuffer();
        let tmp;
        if (md5Base64) {
            const md5Compute = await calcFileMD5(buffer);
            if (md5Compute !== md5Base64) {
                msg.push("检测到MD5值不匹配，文件在传输途中可能存在信息丢失，下载仍会继续，但请注意文件完整性。")
                // throw new Error()
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folder_entry.name}.zip`
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await Utils.sleep(1000)
        overlay.remove()
    }catch(e){
        if (e instanceof Error){msg.set(e.message)}
        else{msg.set(String(e))}
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.remove();
    });

}

async function upload_files(repo_entry:API.Repo,folder_entry:API.FolderEntry,refreshfn:(dir:number)=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement("div");
    box.className="modal-box";
    const lding_box =document.createElement("div");
    lding_box.style.display="flex";
    lding_box.style.justifyContent="center";
    lding_box.style.alignItems="center";
    lding_box.style.padding="20px";
    const loading = document.createElement("div");
    loading.className = "spinner";
    const msg = Utils.messager()

    lding_box.append(loading)
    box.append(lding_box,msg.el)
    overlay.append(box)
    document.body.append(overlay);

    try{
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        const files:Array<File> = await new Promise((resolve) => {
            fileInput.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                resolve(target.files ? Array.from(target.files) : []);
                fileInput.remove();
                    });

            fileInput.addEventListener('cancel', (e) => {
                resolve([]);
                fileInput.remove();
            });
            fileInput.click();
        });

        if (files.length===0) {overlay.remove();return;};

        for (const file of files) {
            if([...appState.allFile.values()].some(f=>f.name == file.name)){
                // window(`当前文件夹下已经有一个${file.name}文件,本次上传全部取消`)
                throw new Error(`当前文件夹下已经有一个${file.name}文件,本次上传全部取消`)
                return;
            }
        }

        for (const file of files) {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const md5 = await calcFileMD5(arrayBuffer);
            const res = await API.file_upload(appState.token,file.name,folder_entry.id,repo_entry.id,file.type,md5,arrayBuffer);
        }
        msg.set("Ok")
        msg.push("将于1秒后关闭");
        await Utils.sleep(1000);
        overlay.remove()
    }catch(e){
        if (e instanceof Error){msg.set(e.message)}
        else{msg.set(String(e))};
        
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.remove();
    });


    refreshfn(folder_entry.id)
}

function span_fix_width(s:string){
        const p = document.createElement('span');
        p.style.display= "inline-block";
        p.style.width="140px";
        p.textContent = s;
        return p.outerHTML
}

async function  detail_file(repo_entry:API.Repo,folder_entry:API.FolderEntry,file_entry:API.FileEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const t = document.createElement('div');
    t.className= "modal-title";
    t.textContent = "查看文件详情";

    const detail = document.createElement('div');
    detail.style.padding = "20px";
    
    // console.log(span_fix_width("ID"));
    detail.innerHTML=`
    <p>${span_fix_width("ID:")}${file_entry.id}</p>
    <p>${span_fix_width("文件名:")}${file_entry.name}</p>
    <p>${span_fix_width("所属文件夹:")}${file_entry.folder}</p>
    <p>${span_fix_width("所属文件夹名称:")}${folder_entry.name}</p>
    <p>${span_fix_width("所属仓库:")}${file_entry.repo}</p>
    <p>${span_fix_width("所属仓库名:")}${repo_entry.name}</p>
    <p>${span_fix_width("大小:")}${file_entry.size}</p>
    <p>${span_fix_width("文件类型:")}${file_entry.content_type}</p>
    <p>${span_fix_width("MD5:")}${file_entry.md5}</p>
    <p>${span_fix_width("创建于:")}${file_entry.created_at}</p>
    <p>${span_fix_width("最后一次修改于:")}${file_entry.modified_at}</p>
    <p>${span_fix_width("创建者:")}${file_entry.creator}</p>
    <p>${span_fix_width("最后一次修改者:")}${file_entry.last_modifier}</p>
    `

    const comfirmfn =()=>{
        overlay.remove()
    }
    const cancelfn =()=>{
        overlay.remove()
    }
    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);

    box.append(t,detail,btn_container);
    overlay.append(box)
    document.body.append(overlay)

}

async function download_file(file:API.FileEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement("div");
    box.className="modal-box";
    const lding_box =document.createElement("div");
    lding_box.style.display="flex";
    lding_box.style.justifyContent="center";
    lding_box.style.alignItems="center";
    lding_box.style.padding="20px";
    const loading = document.createElement("div");
    loading.className = "spinner";
    const msg = Utils.messager()
    msg.set("正在下载中，请等待...")
    lding_box.append(loading)
    box.append(lding_box,msg.el)
    overlay.append(box)
    document.body.append(overlay);
    try {
        const res = await API.file_download(appState.token,file.id);
         const md5Base64 = res.md5;
        const blob = res.bytes;
        const buffer = await blob.arrayBuffer();
        let tmp;
        if (md5Base64) {
            const md5Compute = await calcFileMD5(buffer);
            if (md5Compute !== md5Base64) {
                // throw new Error("检测到MD5值不匹配，文件在传输途中可能存在信息丢失。本次下载已中止。")
                msg.push("检测到MD5值不匹配，文件在传输途中可能存在信息丢失，下载仍会继续，但请注意文件完整性。")
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await Utils.sleep(1000)
        overlay.remove()
    }catch(e){
        if (e instanceof Error){msg.set(e.message)}
        else{msg.set(String(e))}
    }
     overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.remove();
    });

}


async function preview(repo:API.Repo,folder:API.FolderEntry,file:API.FileEntry){
    const full_name = appState.concat_full_path(folder.id)+"/"+file.name;
    // console.log(full_name)
    const res = await API.file_download(appState.token,file.id);
    const array_buffer = await res.bytes.arrayBuffer();
    const uploadfn = async (arrayBuffer:ArrayBuffer)=>{
        const md5 = await calcFileMD5(arrayBuffer);
        const res = await API.file_upload(appState.token,file.name,file.folder,file.repo,file.content_type,md5,arrayBuffer);
    }
    await Previewer.previewFile(res.bytes,file,full_name,uploadfn);
}


//todo
async function copy_file(repo:API.Repo,folder:API.FolderEntry,file:API.FileEntry,refreshfn:(dir:number)=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "选择要复制的目标";

    const diableIds=[] as number[];
    for (const [k,v] of appState.allFolder){
        if (v.level>appState.currentLevel.level){
            diableIds.push(k)
        }
    }

    const tree  = Tree.itemsToTree([...appState.allFolder.values()])!;
    if (tree===undefined)return;
    const tree_container = Tree.renderTree(tree,diableIds,[]);
    if (tree_container===undefined) return;

    const hint = Utils.messager()
    hint.hint()
    hint.set("请选择目标文件夹。你不能将文件复制到等级大于你的目录。")
    
    let slct:HTMLElement|null=null;

    tree_container.addEventListener("click",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const el = target.closest(".tree-node");
        if (!(el instanceof HTMLElement)) return;
        const id = Number(el.dataset.id);

        if (slct===null){
            slct=el;
            slct.className="tree-node-slcted";
        }else{
            if (slct!=el){
                slct.className="tree-node";
                slct =el;
                slct.className="tree-node-slcted";
            }
        }
        // console.log(slct.dataset.id);
    })

    const err =Utils.messager();

    const confirmfn = async ()=>{
        try{
        if (slct===null){
            throw new Error("应当选择一个目标文件夹");
        }
        const existing_files = await API.file_list(appState.token,repo.id,Number(slct.dataset.id));
        if (existing_files.some(v=>v.name===file.name)){
            throw new Error(`目标文件夹下已经有一个${file.name}文件，重名冲突！`);
        }

        const res = await API.file_copy(appState.token,file.id,Number(slct.dataset.id));
        err.set("Ok");
        err.push("将于1秒后关闭");
        await Utils.sleep(1000);
        overlay.remove()
        refreshfn(folder.id);
    }catch(e){
            if (e instanceof Error){err.set(e.message)}else{err.set(String(e))};
        }
    }

    const cancelfn = ()=>{overlay.remove()}


    const btns = Utils.confirmBtns("确定","取消",confirmfn,cancelfn)
    

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
         overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
       overlay.remove();
    });
    box.append(title,hint.el,tree_container,btns,err.el);
    overlay.append(box);
    document.body.append(overlay);

}

async function move_file(repo:API.Repo,folder:API.FolderEntry,file:API.FileEntry,refreshfn:(dir:number)=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "选择要移动的目标";

    const diableIds=[] as number[];
    for (const [k,v] of appState.allFolder){
        if (v.level>appState.currentLevel.level){
            diableIds.push(k)
        }
    }

    const tree  = Tree.itemsToTree([...appState.allFolder.values()])!;
    if (tree===undefined)return;
    const tree_container = Tree.renderTree(tree,diableIds,[]);
    if (tree_container===undefined) return;

    const hint = Utils.messager()
    hint.hint()
    hint.set("请选择目标文件夹。你不能将文件移动到等级大于你的目录。")
    
    let slct:HTMLElement|null=null;

    tree_container.addEventListener("click",async (e)=>{
        e.preventDefault();
        const target = e.target;
        if (!(target instanceof Element)) return;
        const el = target.closest(".tree-node");
        if (!(el instanceof HTMLElement)) return;
        const id = Number(el.dataset.id);


        if (slct===null){
            slct=el;
            slct.className="tree-node-slcted";
        }else{
            if (slct!=el){
                slct.className="tree-node";
                slct =el;
                slct.className="tree-node-slcted";
            }
        }
        // console.log(slct.dataset.id);
    })

    const err =Utils.messager();

    const confirmfn = async ()=>{
        try{
        if (slct===null){
            throw new Error("应当选择一个文件夹");
        }
        const existing_files = await API.file_list(appState.token,repo.id,Number(slct.dataset.id));

        if (existing_files.some(v=>v.name===file.name)){
            throw new Error(`目标文件夹下已经有一个${file.name}文件，重名冲突！`);
        }

        const new_file :API.FileEntry = {
            id:file.id,
            name:file.name,
            folder:Number(slct.dataset.id), 
            repo:file.repo, 
            size:file.size, 
            content_type:file.content_type,
            md5: file.md5,
            created_at: file.created_at,
            modified_at: file.modified_at,
            creator: file.creator,
            last_modifier: file.last_modifier,
        };
        const res = await API.file_edit(new_file,appState.token);
        err.set("Ok")
        await Utils.sleep(1000);
        overlay.remove()
        refreshfn(folder.id);
    }catch(e){
            if (e instanceof Error){err.set(e.message)}else{err.set(String(e))};
        }
    }

    const cancelfn = ()=>{overlay.remove()}


    const btns = Utils.confirmBtns("确定","取消",confirmfn,cancelfn)
    

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
         overlay.remove();
      }})

    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
       overlay.remove();
    });
    box.append(title,hint.el,tree_container,btns,err.el);
    overlay.append(box);
    document.body.append(overlay);

}

async function edit_file(repo:API.Repo,folder:API.FolderEntry,file:API.FileEntry,enable_edit:boolean,refreshfn:(dir:number)=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    const fname = file.name;
    const name_editor = nameEditor("编辑文件名称",fname,enable_edit);
    const creator_editor = creatorEditor("选择文件拥有者",[...appState.allUser.values()],enable_edit)
    const msg = Utils.messager();
    const comfirmfn = async()=>{
        try{
        const name_input=name_editor.get();
        const creator = creator_editor.get().textContent;
        // console.log(creator)
        Utils.is_file_name_valid(name_input);
        const path =name_input;
        // console.log(file.name,path); 

        const new_file :API.FileEntry= {
                id: file.id,
                name: path,
                folder: file.folder,
                repo: file.repo,
                size: file.size,
                content_type: file.content_type,
                md5: file.md5,
                created_at: file.created_at,
                modified_at: file.modified_at,
                creator: creator,
                last_modifier: appState.user.username,
        }
        if (path!=file.name || creator !=file.creator){   
            const res = await API.file_edit(new_file,appState.token,);
        }
        
        
        await Utils.sleep(1000)
        msg.set("Ok")
        overlay.remove();
        }catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else(msg.set(String(e)))
        }
    }
    const cancelfn =()=>{
        overlay.remove()
    }
    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);

    
    box.append(name_editor.el,creator_editor.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay)
}

async function del_file(repo:API.Repo,folder:API.FolderEntry,file:API.FileEntry,refreshfn:(dir:number)=>void) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "你正在删除以下文件"
    

    const note = document.createElement('div');
    note.innerHTML=`
    <p>${span_fix_width("ID:")}${file.id}</p>
    <p>${span_fix_width("名称:")}${file.name}</p>
    <p>${span_fix_width("创建人:")}${file.name}</p>
    <p>${span_fix_width("名称:")}${file.name}</p>
    <p>${span_fix_width("所属目录:")}${folder.name}</p>
    <p>${span_fix_width("所属仓库:")}${repo.name}</p>
    `
    note.style.padding="20px"

    const note2 = Utils.messager()
    note2.set("文件将被删除，请三思后行。点击三次确定后开始删除。")
    const msg = Utils.messager()

    let count:number = 0;
    const comfirmfn = async () =>{
        try{count+=1;
            if (count===3){
            const res = await API.file_delete(file.id,appState.token);
            msg.set("Ok")
            await Utils.sleep(1000)
            overlay.remove()
            refreshfn(folder.id)
            
        }}catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else{msg.set(String(e))}
        }
    }
    const cancelfn =()=>{
        overlay.remove()
    }
    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);
    
    box.append(title,note,note2.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay)

}

async function create_repo() {
    const repo_entry:API.Repo = {id:0,name:"",public:false}
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    
    const checkfn = (chekced:boolean)=>{
        if (chekced){
            porxy_box.removeChild(level_editor.el)
        }else{
            porxy_box.appendChild(level_editor.el)
        }
    }
    
    const level_editor = levelEditor(true,repo_entry);
    const name_editor = nameEditor("设置仓库名称",repo_entry.name,true);
    const pub_editor=publicityEditor("设置公开性",repo_entry.public,true,checkfn);
    const msg =Utils.messager();

    const confirmfn = async () => {
        try{
            const name = name_editor.get();
            const publicity = pub_editor.get();
            const levels = level_editor.get();
            const valid =Utils.is_dir_name_valid(name);
            if  ( publicity ===false && !levels.map(v=>v.target.level).some(v=>v===9)){
                throw new Error("对于非公开的仓库，至少应该存在一位9级用户，否则未来无人能管理此仓库！")
            }
            const newRepo :API.RepoWithInitLevel= {
                id:0,
                name:name,
                public:publicity,
                levels:levels.filter(i=>i.target.level!=0).map(i => i.target)
            }
            const res = await API.repo_create(newRepo,appState.token);
            msg.set("Ok")
            await Utils.sleep(1000)
            overlay.remove()
            await idleState();
        }catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else{
                msg.set(String(e))
            }
        }
    }
    const cancelfn = ()=>{
        overlay.remove()
    }

    const btn_container=Utils.confirmBtns("确定","返回",confirmfn,cancelfn)
    const porxy_box = document.createElement("div");

    porxy_box.append(name_editor.el,pub_editor.el,level_editor.el);
    box.append(porxy_box,btn_container,msg.el);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmfn();
      if (e.key === 'Escape') cancelfn();
    });

    overlay.append(box);
    document.body.appendChild(overlay);
    if (repo_entry.public){checkfn(true);}

}

async function edit_repo(repo_entry:API.Repo,is_admin:boolean) {

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;
    
    const checkfn = (chekced:boolean)=>{
        if (chekced){
            porxy_box.removeChild(level_editor.el)
        }else{
            porxy_box.appendChild(level_editor.el)
        }
    }
    
    const level_editor = levelEditor(is_admin,repo_entry);
    const name_editor = nameEditor("编辑仓库名称",repo_entry.name,is_admin);
    const pub_editor=publicityEditor("设置公开性",repo_entry.public,is_admin,checkfn);
    const msg = Utils.messager();
    const confirmfn = async () => {
        try{
        const name = name_editor.get();
        const publicity = pub_editor.get();
        const levels = level_editor.get();
        const valid =Utils.is_dir_name_valid(name);

        if  (! levels.map(v=>v.target.level).some(v=>v===9)){
            throw new Error("至少应该存在一位9级用户，否则未来无人能管理此仓库！")
        }
        const newRepo :API.Repo= {id:repo_entry.id,name:name,public:publicity}

        //edit repo
        if (name!=repo_entry.name || publicity!=repo_entry.public){
            const res = API.repo_edit(newRepo,appState.token)
        }

        //pub to private ,need to create all levels
        if (publicity!=repo_entry.public && publicity ===false){
            for (const i of levels){
                if (i.target.level!=0){
                    const res = API.level_create(i.target,appState.token)
                }
            }
        }

        //private to pub, we need to delete all levels
        if (publicity!=repo_entry.public && publicity ===true){
            for (const i of levels){
                if (i.source.level!=0){
                    const res = API.level_delete(appState.token,i.target.repo,i.target.userid)
                }
            }
        }
        
        //private to private,but level changed
        if (publicity===repo_entry.public && publicity===false){
            for (const i of levels){
                //to create
                if (i.source.level===0 && i.target.level!=0){
                    const res = await API.level_create(i.target,appState.token)
                }
                //to edit
                if (i.source.level!==0 && i.target.level!=0 && i.source.level != i.target.level){
                    const res = await API.level_edit(i.target,appState.token)
                }

                //to del
                if (i.source.level !=0 && i.target.level===0){
                    const res = await API.level_delete(appState.token,i.source.repo,i.source.userid)
                }
            }
        }
        msg.set("Ok")
        await Utils.sleep(1000);
        overlay.remove()
        await idleState()
    }catch(e){
        if (e instanceof Error) {msg.set(e.message)}else{msg.set(String(e))};
    }
    }
    const cancelfn = ()=>{
        overlay.remove()
    }

    const btn_container=Utils.confirmBtns("确定","返回",confirmfn,cancelfn)
    const porxy_box = document.createElement("div");

    porxy_box.append(name_editor.el,pub_editor.el,level_editor.el);
    box.append(porxy_box,btn_container,msg.el);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmfn();
      if (e.key === 'Escape') cancelfn();
    });

    

    overlay.append(box);
    document.body.appendChild(overlay);
    if (repo_entry.public){checkfn(true);}
}

async function del_repo(repo_etntry:API.Repo) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = ``;

    const title = document.createElement('div');
    title.className  = "modal-title";
    title.textContent = "你正在删除以下仓库"
    

    const note = document.createElement('div');
    note.innerHTML=`
    <p>${span_fix_width("ID:")}${repo_etntry.id}</p>
    <p>${span_fix_width("名称:")}${repo_etntry.name}</p>
    <p>${span_fix_width("是否公开:")}${repo_etntry.public}</p>
    `
    note.style.padding="20px"

    const note2 = Utils.messager()
    note2.set("仓库中的所有文件，以及管理的所有成员等级将被删除，请三思后行。点击三次确定后开始删除")
    const msg = Utils.messager()

    let count:number = 0;
    const comfirmfn = async () =>{
        try{count+=1;
            if (count===3){
            const res = await API.repo_delete(repo_etntry.id,appState.token);
            msg.set("Ok")
            await Utils.sleep(1000)
            overlay.remove()
            await idleState()
        }}catch(e){
            if (e instanceof Error){msg.set(e.message)}
            else{msg.set(String(e))}
        }
    }
    const cancelfn =()=>{
        overlay.remove()
    }
    const btn_container=Utils.confirmBtns("确定","返回",comfirmfn,cancelfn);
    
    box.append(title,note,note2.el,btn_container,msg.el);
    overlay.append(box)
    document.body.append(overlay)

}

declare const SparkMD5: any;
async function calcFileMD5(arrayBuffer:ArrayBuffer):Promise<string> {
  const spark = new SparkMD5.ArrayBuffer();
  spark.append(arrayBuffer);
  return spark.end(); 
}

function levelScroll(init_value:number,min:number,max:number,step:number) {
    // let reduced_value:number;
    
    const reduced_value = Math.min(max, Math.max(min, init_value));
    const box = document.createElement("div");
    const name_title = document.createElement("div");
    name_title.className="modal-title";
    name_title.textContent="设置等级";
    const input_container = document.createElement("div");
    
    input_container.style.padding="20px";
    input_container.style.display="flex";
    input_container.style.flexDirection="row";
    input_container.style.width="100%"

    const slider = document.createElement("input");
    slider.className="level-slider";
    slider.type="range";
    slider.min=String(min);
    slider.max =String(max);
    slider.step=String(step);
    slider.style.flex="1";
    slider.value=String(reduced_value);

    const show = document.createElement("div");
    show.textContent = String(reduced_value);
    show.style.color="blue";

    slider.addEventListener('input', () => {
        show.textContent = slider.value;
    });
    input_container.append(slider,show)
    box.append(name_title,input_container)
    const collect = ()=>{
        return Number(slider.value);}
    return {el:box,get:collect}
}



async function repoMenu(event:PointerEvent,repo_entry:API.Repo,is_admin:boolean) {
  const existing = document.querySelector('.context-menu');
  if (existing){existing.remove()}
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  let actions = [{ label: '编辑', action: async()=>{menu.remove();edit_repo(repo_entry,is_admin)}},]
  if (is_admin){
        actions.push({label: '删除', action: async()=>{menu.remove();del_repo(repo_entry)}})
  }

  actions.forEach(({ label, action }) => {
    const btn = document.createElement('button');
    btn.className = "menu-item"
    btn.textContent = label;
    btn.onclick = async() => {
      await action();
      menu.remove();
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const closeOnClick = (e:PointerEvent) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnClick), 0);

}



function renderRepos(repos:Array<API.Repo>){
    repos.sort((a, b) => a.id - b.id);
    const repoContainer = document.createElement("div");
    repoContainer.className = "repo-container";
    repoContainer.id = "repoContainer";

    repos.forEach(repo =>{

        const repoDiv = document.createElement("div");
        repoDiv.className = "repo";
        repoDiv.dataset.repoId = `${repo.id}`;
        repoDiv.dataset.repoName = repo.name;

        const nameP = document.createElement("p");
        nameP.style.fontSize = "var(--fsize_big)";
        nameP.textContent = repo.name;

        const pubP = document.createElement("p");
        let x:string;
        if (repo.public){x="公开"}else{x="非公开"};
        pubP.textContent = `${x}`;
        repoDiv.append(nameP,pubP);
        repoContainer.append(repoDiv);

    })
    repoContainer.append(noMoreContent());
    return repoContainer
}

function fileTableHeader(){
    const thead = document.createElement("thead");
    thead.id = "fileTableThead";
    const basic_width="112px";
    const headtr = document.createElement('tr');
    const cbTd = document.createElement('th');
    cbTd.className = 'check-col';

    const nameTd = document.createElement('th');
    nameTd.textContent = "文件名";
    nameTd.style.width ="auto";
    nameTd.className = "th";
    

    const sizeTd = document.createElement('th');
    sizeTd.textContent = "大小";
    sizeTd.style.width =basic_width;
    sizeTd.className = "th";
    

    const createdatTd=document.createElement('th');
    createdatTd.textContent ="创建时间";
    createdatTd.style.width =basic_width;
    createdatTd.className = "th";
    

    const modifiedatTd=document.createElement('th');
    modifiedatTd.textContent ="最后修改于";
    modifiedatTd.style.width =basic_width;
    modifiedatTd.className = "th";
    

    const creatorTd=document.createElement("th");
    creatorTd.style.width =basic_width;
    creatorTd.className = "th";
    creatorTd.textContent="创建者";
    

    const modifierTd=document.createElement("th");
    modifierTd.textContent="最后修改者";
    modifierTd.style.width =basic_width;
    modifierTd.className = "th";
    headtr.append(cbTd,nameTd,sizeTd,createdatTd,modifiedatTd,creatorTd,modifierTd);
    headtr.append(modifierTd);
    thead.append(headtr);
    return thead
}

function rcycTableHeader(){
    const thead = document.createElement("thead");
    thead.id = "fileTableThead";
    const basic_width="112px";
    const headtr = document.createElement('tr');
    const cbTd = document.createElement('th');
    cbTd.className = 'check-col';

    const nameTd = document.createElement('th');
    nameTd.textContent = "文件名";
    nameTd.style.width ="auto";
    nameTd.className = "th";

    const sizeTd = document.createElement('th');
    sizeTd.textContent = "大小";
    sizeTd.style.width =basic_width;
    sizeTd.className = "th";
    

    const createdatTd=document.createElement('th');
    createdatTd.textContent ="创建时间";
    createdatTd.style.width =basic_width;
    createdatTd.className = "th";
    

    const modifiedatTd=document.createElement('th');
    modifiedatTd.textContent ="最后修改于";
    modifiedatTd.style.width =basic_width;
    modifiedatTd.className = "th";
    

    const creatorTd=document.createElement("th");
    creatorTd.style.width =basic_width;
    creatorTd.className = "th";
    creatorTd.textContent="创建者";
    
    const modifierTd=document.createElement("th");
    modifierTd.textContent="最后修改者";
    modifierTd.style.width =basic_width;
    modifierTd.className = "th";

    const deletedTimeTd=document.createElement("th");
    deletedTimeTd.textContent="被删除于";
    deletedTimeTd.style.width =basic_width;
    deletedTimeTd.className = "th";

    headtr.append(cbTd,nameTd,sizeTd,createdatTd,modifiedatTd,creatorTd,modifierTd,deletedTimeTd);
    thead.append(headtr);
    return thead
}

function rcycTable(items:Array<API.rcycFileEntry>){
    const table = document.createElement('table');
    table.className = "file-table";
    table.id = "rcycTable";

    const tbody =document.createElement("tbody");
    tbody.id = "rcycTableBody";
    const thead = rcycTableHeader();
    items.sort((a, b) => a.id-b.id);

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id=String(item.id);
        tr.dataset.folder = String(item.folder);
        tr.dataset.repo = String(item.repo);
        tr.dataset.creator = item.creator;
        tr.dataset.fileName = item.name;
        
        tr.className="file-tr";
        if (item.creator!=appState.user.username){
            tr.classList.add("banned")
        }
        const cbTd = document.createElement('td');
        cbTd.className = 'check-col';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'file-cb';
        cb.dataset.id = String(item.id);
        cb.style.display="none";
        cbTd.append(cb)

        const nameTd = document.createElement('td');
        const iconContainer = document.createElement('img');
        iconContainer.width =18;
        iconContainer.height=18; 
        iconContainer.src = getIcon(item);
        const fileName = item.name;
        const textSpan = document.createElement('span');
        textSpan.textContent = ' ' + fileName;
        iconContainer.style.verticalAlign = 'middle';
        textSpan.style.verticalAlign = 'middle';
        nameTd.append(iconContainer,textSpan);

        const sizeTd = document.createElement('td');
        sizeTd.textContent = Utils.FMT.fmt_size(item.size);        

        const createdatTd=document.createElement('td');
        createdatTd.textContent =Utils.FMT.fmt_time(item.created_at);
        
        const modifiedatTd=document.createElement('td');
        modifiedatTd.textContent =Utils.FMT.fmt_time(item.modified_at);
        
        const creatorTd=document.createElement("td");
        creatorTd.textContent=item.creator;
        
        const modifierTd=document.createElement("td");
        modifierTd.textContent=item.last_modifier;

        const deleteTimeTd=document.createElement("td");
        deleteTimeTd.textContent=Utils.FMT.fmt_time(item.delete_at);

        tr.append(cbTd,nameTd,sizeTd,createdatTd,modifiedatTd,creatorTd,modifierTd,deleteTimeTd);
        tbody.appendChild(tr);
  });
  table.append(thead,tbody);
  return table

}


function fileTable(items:Array<API.FileEntry>,permission:Utils.Permission) {

    const seletor :Array<{
        open: () => void;
        close: () => void;
        cb_return: () => {id: number;ck: boolean;};
    }>= [];

    const slctor_open=()=>{
        for (const i of seletor){
            i.open()
        }
    }

    const slctor_close=()=>{
        for (const i of seletor){
            i.close()
        }
    }
    
    const slctor_checked =()=>{
        let tmp :Array<number>= [];
        for (const i of seletor){
            const ck = i.cb_return()
            if (ck.ck)
                tmp.push(ck.id)
        }
        return tmp
    }
    

    const table = document.createElement('table');
    table.className = "file-table";
    table.id = "fileTable";

    const tbody =document.createElement("tbody");
    tbody.id = "fileTableBody";
    const thead = fileTableHeader();
    items.sort((a, b) => a.id-b.id);

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id=String(item.id);
        tr.className="file-tr";
        if (permission==="limit" && item.creator!=appState.user.username){
            tr.classList.add("banned")
        }

        const cbTd = document.createElement('td');
        cbTd.className = 'check-col';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'file-cb';
        cb.dataset.id = String(item.id);

        cbTd.append(cb)

        const cb_fn ={
            open:()=>{
                cb.style.display="";
            },
            close:()=>{
                cb.checked=false;
                cb.style.display="none";
                // console.trace()
            },
            cb_return:()=>{
                return {id:item.id,ck:cb.checked,}
            }
        }
        cb_fn.close()

        if (permission==="free" || item.creator===appState.user.username){
            seletor.push(cb_fn);
        }

        const nameTd = document.createElement('td');
        const iconContainer = document.createElement('img');
        iconContainer.width =18;
        iconContainer.height=18; 
        iconContainer.src = getIcon(item);
        
        const fileName = item.name;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = ' ' + fileName;

        iconContainer.style.verticalAlign = 'middle';
        textSpan.style.verticalAlign = 'middle';
        nameTd.append(iconContainer,textSpan);

        const sizeTd = document.createElement('td');
        sizeTd.textContent = Utils.FMT.fmt_size(item.size);        

        const createdatTd=document.createElement('td');
        createdatTd.textContent =Utils.FMT.fmt_time(item.created_at);
        
        const modifiedatTd=document.createElement('td');
        modifiedatTd.textContent =Utils.FMT.fmt_time(item.modified_at);
        
        const creatorTd=document.createElement("td");
        creatorTd.textContent=item.creator;
        
        const modifierTd=document.createElement("td");
        modifierTd.textContent=item.last_modifier;
        tr.append(cbTd,nameTd,sizeTd,createdatTd,modifiedatTd,creatorTd,modifierTd);
        tbody.appendChild(tr);
  });
  table.append(thead,tbody);
  return {el:table,open:slctor_open,close:slctor_close,slcted:slctor_checked}
}


function getIcon(item:API.FileEntry) {
    const a = item.name.split('.').pop();
    if (!a) return Utils.iconMap.other;

    const ext = a.toLowerCase();
    if (ext in Utils.iconMap){
        return Utils.iconMap[ext as keyof typeof Utils.iconMap];
    }
    return Utils.iconMap.other;
}







// type repoEdit={name:string, pub:boolean,levels: Array<levelEditRecords>}

// async function RepoEditor(title:string,placeholder:string,enable_edit:boolean,pub:boolean,repo_id:number|null):Promise<repoEdit|null> {
//   return new Promise(resolve => {
//     const overlay = document.createElement('div');
//     overlay.className = 'modal-overlay';
//     const box = document.createElement('div');
//     box.className = 'modal-box';
//     box.innerHTML = ``;
//     const close = (value:repoEdit|null) => {
//       overlay.remove();
//       resolve(value);
//     };
    
//     const checkfn = (chekced:boolean)=>{
//         if (chekced){
//             porxy_box.removeChild(level_editor.el)
//         }else{
//             porxy_box.appendChild(level_editor.el)
//         }
//     }
    
//     const level_editor = levelEditor(enable_edit,repo_id);
//     const name_editor = nameEditor(title,placeholder,enable_edit);
//     const pub_editor=publicityEditor("设置公开性",pub,enable_edit,checkfn);

//     const confirmfn = () => {
//         const name = name_editor.get();
//         const publicity = pub_editor.get();
//         const valid =Utils.is_dir_name_valid(name);
//         const levels = level_editor.get();
        
//         close({name:name,pub:publicity,levels:levels});
//     }
//     const cancelfn = ()=>{
//         close(null)
//     }

//     const btn_container=Utils.confirmBtns("确定","返回",confirmfn,cancelfn)
//     const porxy_box = document.createElement("div");

//     porxy_box.append(name_editor.el,pub_editor.el,level_editor.el);
//     box.append(porxy_box,btn_container);

//     overlay.addEventListener('click', e => {
//       if (e.target === overlay) close(null);
//     });

//     box.addEventListener('keydown', e => {
//       if (e.key === 'Enter') confirmfn();
//       if (e.key === 'Escape') cancelfn();
//     });
//     // name.focus();

//     overlay.append(box);
//     document.body.appendChild(overlay);
//     if (pub){checkfn(true);}
//   });
// }



function levelEntry(min:number,max:number,level_entry:API.RepoUserLevel,enable_edit:boolean){
    const box = document.createElement("div");
    box.className = "level_entry_box";
    box.style.display= "flex";
    box.style.flexDirection="row";
    box.style.border ="1px solid";
    const name = document.createElement("div");
    name.id=`${level_entry.userid}`;
    const username = appState.allUser.get(level_entry.userid)!.username;
    name.textContent=`${username}`;
    name.style.minWidth="100px";
    name.style.padding = "0px 16px";

    const leftBtn = document.createElement("div");
    leftBtn.textContent = "<";
    leftBtn.style.color="blue";

    const level_value = document.createElement("div");
    level_value.style.padding = "0px 6px";
    level_value.textContent = String(0);
    level_value.style.color="blue";

    const rightBtn = document.createElement("div");
    rightBtn.textContent = ">";
    rightBtn.style.color="blue";

    function setValue(v: number) {
        if (v<min) {level_value.textContent = String(min);return;}
        if(v>max) {level_value.textContent = String(max);return;}
        level_value.textContent = String(v);
    }

    if (enable_edit){
        leftBtn.addEventListener("click", () => {
            setValue(Number(level_value.textContent) - 1);
        });

        rightBtn.addEventListener("click", () => {
            setValue(Number(level_value.textContent) + 1);
        });}

    setValue(level_entry.level)
    box.append(name,leftBtn, level_value, rightBtn)

    function collect(){
        const source = level_entry;
        const target: API.RepoUserLevel= {id:level_entry.id,repo:level_entry.repo,userid:level_entry.userid,level:Number(level_value.textContent)};
        return {source:source,target:target} as levelEditRecords;
    }

    return {el:box,get:collect}
}

function publicityEditor(title:string,publicity:boolean,enable_edit:boolean,checkfn:(checked:boolean)=>void){
    const t = document.createElement("div");
    t.className = "modal-title";
    t.textContent=title;
    const check = document.createElement("input")
    check.type="checkbox";
    check.checked=publicity;

    const lables=document.createElement("div");
    lables.textContent="打勾表明仓库处于公开状态，此时无需设置成员等级";
    const check_container =document.createElement("div");
    check_container.style.padding="20px";
    check_container.style.display="flex";
    check_container.style.flexDirection="row";
    check_container.style.alignItems="center";
    check_container.style.justifyContent="center";
    check_container.append(check,lables)
    const box = document.createElement("div");
    box.append(t,check_container)

    check.addEventListener("click",()=>{
        checkfn(check.checked)
    })

    const collect = ()=>{
        return check.checked
    }
    if (!enable_edit){
        check.disabled=true;
    }
    return {el:box,get:collect}

}

function nameEditor(title:string,placeholder:string,enable_edit:boolean){
    const box = document.createElement("div");
    const name_title = document.createElement("div");
    name_title.className="modal-title";
    name_title.textContent=title;
    const input_container = document.createElement("div");
    input_container.style.padding="20px";
    const name = document.createElement("input");
    name.id="repoName";
    name.type="text";
    name.className="modal-input";
    name.placeholder=placeholder;
    name.value=placeholder;
    input_container.append(name);
    box.append(name_title,input_container)
    const collect = ()=>{
        return name.value
    }
    if (!enable_edit){
        name.disabled=true;
    }
    return {el:box,get:collect}
}
function creatorEditor(title:string,users:Array<API.AccountWithoutPwd>,enable_edit:boolean){
    const box = document.createElement("div");
    const t = document.createElement("div");
    t.className="modal-title";
    t.textContent=title;
    const input_container = document.createElement("div");
    input_container.style.padding="20px";

    const slct =document.createElement("select");
    slct.className="creator_selector";
    slct.id="creator_slctor";
    // slct.style.width="100%";
    // slct.style.fontSize="20px";
    
    users.sort((a,b)=>a.id-b.id)
    for (const user of users){
        const option = document.createElement("option");
        option.id = String(user.id);
        option.textContent = user.username;
        // check.style.fontSize="20px"
        option.className="creator_option"

        slct.append(option)
    }
    input_container.append(slct)
    box.append(t,input_container)

    const collect = ()=>{
        return slct.selectedOptions[0]!
    }
    return {el:box,get:collect}
}

function levelEditor(enable_edit:boolean,repo_entry:API.Repo){
    const level_title = document.createElement("div");
    level_title.className="modal-title";
    level_title.textContent="管理成员等级";
    const notes = document.createElement("ul");

    notes.innerHTML=`<li>每个仓库维护一套成员等级，成员等级从0到9。非公开仓库只有它的9级用户可以编辑。</li>
    <li>仓库中的每个文件夹也具有等级。</li>
    <li>若成员等级 > 文件夹等级，成员可查看并自由操作其中文件（共享文件）。</li>
    <li>若成员等级 = 文件夹等级，成员可查看文件夹、上传文件、操作自己创建的文件，但无法下载或预览他人的文件（业务窗口）。</li>
    <li>若成员等级 < 文件夹等级，成员无法查看文件夹（锁定归档）。</li>

    `
    notes.style.listStyleType="none";
    notes.style.padding="20px";
    

    const box = document.createElement("div");
    box.className = "level_editor_box";
    box.style.display= "flex";
    box.style.flexDirection="column";

    const entry_area = document.createElement("div");
    entry_area.style.display= "flex";
    entry_area.style.flexDirection="row";
    entry_area.style.flexWrap="wrap";
    entry_area.style.width="840px";
    entry_area.style.gap="20px";
    entry_area.style.padding="10px";
    
    const allEntry:Array<{el: HTMLDivElement;get: () => levelEditRecords;}>=[];
    for (const [id,user] of appState.allUser){        
        let entry: {el: HTMLDivElement;get: () => levelEditRecords};

        const level = [...appState.allLevel.values()].find(v=>v.userid===id && v.repo==repo_entry.id);
        console.log(level)
        if (level===undefined){
            entry = levelEntry(0,9,{id:0,repo:repo_entry.id,userid:id,level:0},enable_edit);
        }else{
            entry = levelEntry(0,9,level,enable_edit);
        }
        entry_area.appendChild(entry.el);
        allEntry.push(entry);
    }
    box.append(level_title,notes,entry_area)
    function collect(){
        const allRecords :Array<levelEditRecords>=[];
        for (const i of allEntry){
            allRecords.push(i.get())
        }
        return allRecords
    }
    return {el:box,get:collect}
}

async function check_session(){
  const res = await API.auth_verify(appState.token)
  if (res.status ===401){

    window.location.href = "/portal/login";
  }
  if (res.ok)return;
}


function readFileAsBase64(file:File):Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const base64 = dataUrl.split(',')[1]!;
        resolve(base64);
      } else {
        reject(new Error('读取结果不是字符串'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file:File):Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(arrayBuffer:ArrayBuffer):string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }
  return btoa(binary);
}

async function main() {
    await check_session()
    document.body.append(LayoutInit())
    await idleState()
}

// repoState();
main()