export function testTree():Array<Array<string>>{
    const relations = [
        ["/a2new/a4","/a2new"],
        ["/bbb/TC/TC2/湾谷海报","/bbb/TC/TC2"],
        ["/a2new/湾谷海报自建","/a2new"],
        ["/a2new","/"],
        ["/ccc/ihj","/ccc"],
        ["/bbb","/"],
        ["/nnn","/"],
        ["/UH","/"],
        ["/ccc/a2_cp/a4","/ccc/a2_cp"],
        ["/bbb/TC","/bbb"],
        ["/ccc","/"],
        ["/fast","/"],
        ["/slow","/"],
        ["/fast/a3","/fast"],
        ["/mmm","/"],
        ["/ccc/dpd","/ccc"],
        ["/bbb/TC/TC2/湾谷海报/高分辨率图象","/bbb/TC/TC2/湾谷海报"],
        ["/bbb/TC/TC2","/bbb/TC"],
        ["/ccc/a2_cp","/ccc"],
    ]
    return relations;
}


export const iconMap = {
    csv:"/static/icons/fileicon/csv.svg",
    dir:"/static/icons/fileicon/dir.svg",
    docx:"/static/icons/fileicon/docx.svg",
    other:"/static/icons/fileicon/other.svg",
    pdf:"/static/icons/fileicon/pdf.svg",
    png:"/static/icons/fileicon/png.svg",
    pptx:"/static/icons/fileicon/pptx.svg",
    rar:"/static/icons/fileicon/rar.svg",
    txt:"/static/icons/fileicon/txt.svg",
    xlsx:"/static/icons/fileicon/xlsx.svg",
    zip:"/static/icons/fileicon/zip.svg",
    mp3:"/static/icons/fileicon/audio.svg",
}

const compoundExtensions = [
  ".tar.gz",
  ".tar.bz2",
  ".tar.xz"
];

export class Path{
    segment:Array<string>
    constructor(segments:Array<string> = []){
        this.segment=segments
    }

    push_self(seg:string){
        this.segment.push(seg)
        return this;
    }

    pop_self(){
        this.segment.pop()
        return this;
    }

    push_clone(seg:string){
        return new Path([...this.segment, seg]);
    }
    push_path(path:Path){
        let tmp=this.segment.concat(path.segment);
        return new Path(tmp);
    }
    
    pop_clone(){
        return new Path(this.segment.slice(0, -1));
    }
    
    peek_filename(){
        if (this.segment.length==0) {
            return "";
        }else{
            return this.segment[this.segment.length - 1]!;
        }
    }
    
    to_string_with_root(){
        let s = this.segment.join("/")
        return `/${s}`;
    }

    to_string_no_root(){
        return this.segment.join("/");
    }
    
    from_string(s:string){
        // console.log(s)
        if (s.startsWith("/")){
            s = s.slice(1)
        }
        if (s == ""){
            return new Path();
        }

        for (const  seg of s.split("/")) {
            this.segment.push(seg)
        }
        return this
    }
    get_parent(){
        if (this.segment.length>1){
            return new Path(this.segment.slice(0,-1))
        }
        else {
            return new Path([])
        }
    }
    get_suffix(){
        const tmp = this.segment[this.segment.length - 1];
        if (tmp === undefined) {
            return "";
        }
        let dotIndex = tmp.lastIndexOf(".");

        for (const ext of compoundExtensions) {
            if (tmp.endsWith(ext)) {
            dotIndex = tmp.length - ext.length;
            }
        }
        
        if (dotIndex === -1) {
            return "";
        }
        return tmp.substring(dotIndex);
    }
    add_suffix(suffix:string){
        if (suffix == ""){
            return this;
        }
        const last = this.segment[this.segment.length - 1];
        this.segment[this.segment.length - 1] = last + (suffix.startsWith('.') ? '' : '.') + suffix;
        return this;
    }

    rm_suffix(){
        const suffix = this.get_suffix();
        const tmp = this.segment[this.segment.length - 1];
        if (tmp===undefined){
            return;
        }
        const idx = tmp.length -suffix.length
        this.segment[this.segment.length - 1] = tmp.substring(0,idx);
        return this;
    }
}


export class FMT{
    constructor(){}

    static fmt_time(time:string):string{
        const diff = new Date().getTime() - new Date(time).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        if (days > 0) {
            const d = new Date(time);
            const yy = String(d.getFullYear());
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}/${mm}/${dd}`;
        } else if (hours > 0) {
            return `${hours}小时${minutes}分前`;
        } else if (minutes > 0) {
            return `${minutes}分${seconds}秒前`;
        } else {
            return `${seconds}秒前`;
    }
    }
    
    static  fmt_size(size:number):string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${size.toFixed(2)} ${units[index]}`;
    }
}

export function sleep(delay:number){
    return new Promise((resolve) => setTimeout(resolve, delay))
}

export function levelNotes(level:number){
    const box = document.createElement("div");
    box.id = "level-logo";
    box.style.backgroundColor="var(--ironblack)";
    box.style.display="flex";
    box.style.padding="2px";
    box.style.flexDirection="row";
    box.style.alignItems="center";
    box.style.justifyContent="center";

    const pre = document.createElement("div");
    pre.style.color="var(--white)";
    pre.textContent = "你在当前仓库中的等级为";
    pre.style.paddingRight ="10px";

    const suff = document.createElement("div");
    suff.style.color="var(--white)";
    suff.textContent = "，文件夹右上角的蓝色数字代表文件夹等级。比较用户等级与文件夹等级，你会获得不同的权限。";
    suff.style.paddingLeft ="10px";

    const level_bar = document.createElement("div");
    level_bar.textContent = String(level);
    level_bar.style.backgroundColor="var(--blue)";
    level_bar.style.color="var(--white)";
    level_bar.style.paddingLeft = "10px";
    level_bar.style.paddingRight = "10px";
    // div.append(div2)
    box.append(pre,level_bar,suff)


    return box
}

export function rcycNotes(){
    const box = document.createElement("div");
    box.id = "level-logo";
    box.style.backgroundColor="var(--ironblack)";
    box.style.display="flex";
    box.style.padding="2px";
    box.style.flexDirection="row";
    box.style.alignItems="center";
    box.style.justifyContent="center";

    const pre = document.createElement("div");
    pre.style.color="var(--white)";
    pre.textContent = "被删除的文件将在回收站保存30天，而后彻底清空。你只能下载/恢复自己创建的文件。";
    pre.style.paddingRight ="10px";

    box.append(pre)

    return box
}

export function confirmBtns(confirmName:string,cancelName:string,confirmfn:()=>void,cancelfn:()=>void){
    const confirm = document.createElement("button");
    confirm.className="modal-btn";
    confirm.id = "confirmBtn";
    confirm.textContent=confirmName;
    confirm.addEventListener("click",async ()=>{
            confirmfn()
    })

    const cancel = document.createElement("button");
    cancel.className="modal-btn";
    cancel.id = "cancelBtn";
    cancel.textContent=cancelName;
    cancel.addEventListener("click",()=>{
                cancelfn()
    })

    const btnBox = document.createElement("div");
    // btnBox.style.padding="6px";
    btnBox.className="modal-btn-container";

    const container = document.createElement("div");
    container.style.padding="0px";
    
    btnBox.append(cancel,confirm)
    container.append(btnBox)
    return container
}


export function messager(){
    const msg = document.createElement("div");
    msg.className = "msg";
    // msg.style.padding="0px 20px 0px 20px";

    const msg2 = document.createElement("div");
    msg2.className = "msg";
    // msg2.style.padding="0px 20px 0px 20px";

    const box = document.createElement("div");
    box.style.padding="0px 16px 0px 16px";
    box.append(msg,msg2)
    
    const setter = (v:string)=>{
        msg.textContent=v
    }
    const ch_type =()=>{
        msg.className="msg-hint";
    }

    const pusher = (v:string)=>{
        msg2.textContent=v
    }

    return {el:box,set:setter,push:pusher,hint:ch_type}
}

export type Permission = "free"|"limit"|"ban"
export function get_permission(repo_public:boolean,user_level:number,folder_level:number){
    if (repo_public) {
        return "free";
    }else{
        if (user_level<folder_level) return "ban";
        if (user_level===folder_level) return "limit";
        if (user_level>folder_level) return "free";
    }
    return "ban"
}

export  function toolbar_logo(id:string,src:string,title:string){
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.id = id;
    btn.title=title;
    const iconContainer = document.createElement('img');
    iconContainer.width =20;
    iconContainer.height=20; 
    iconContainer.src = src;
    btn.append(iconContainer)
    return btn
}


function make_draggable(div:HTMLDivElement){
    let dragging:boolean;
    let offsetX:number;
    let offsetY:number;

    div.addEventListener('pointerdown', (event) => {
        dragging = true;
        const rect = div.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        // 如果原来使用了 right/bottom，拖动时改为 left/top
        div.style.left = `${rect.left}px`;
        div.style.top = `${rect.top}px`;
        div.style.right = 'auto';
        div.style.bottom = 'auto';
        div.setPointerCapture(event.pointerId);
        div.classList.add('dragging');
    });
    div.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        div.style.left = `${event.clientX - offsetX}px`;
        div.style.top = `${event.clientY - offsetY}px`;
    });
    div.addEventListener('pointerup', (event) => {
        dragging = false;
        div.releasePointerCapture(event.pointerId);
        div.classList.remove('dragging');
    });
    div.addEventListener('pointercancel', () => {
        dragging = false;
        div.classList.remove('dragging');
    });
}

export function goBack_floating_window(gobackfn:()=>void) {
    const div = document.createElement("div");
    div.className = "floating-window";

    const icon = document.createElement('img');
    icon.className="floating-icon";
    icon.src = "/static/icons/tool/goBack.svg";       
    icon.style.verticalAlign = 'middle';
    icon.title="返回上一视图";
    
    icon.addEventListener("click",()=>
        gobackfn()
    )

    div.append(icon)
    return div
}

export function is_dir_name_valid(name:string){
  if (!name ){
    throw new Error("空名称显然行不通，你在试图操作虚空，这很危险！")
  }
  const hasWhitespace = /\s/.test(name); 
  if(hasWhitespace){
    throw new Error("你在文件名中藏了个空白字符（空格/换行/制表符...），真狡猾！你会搞坏磁盘的！")
  }
  const okChars = /^[A-Za-z0-9_\p{Script=Han}]+$/u;
  if (!okChars.test(name)) {
    throw new Error('包含特殊字符是个坏主意, 只接受中英文、数字和下划线！');
  }
  return true
}

export function is_file_name_valid(name:string){
  if (!name ){
    throw new Error("空名称显然行不通，你在试图操作虚空，这很危险！")
  }
  const hasWhitespace = /\s/.test(name); 
  if(hasWhitespace){
    throw new Error("你在文件名中藏了个空白字符（空格/换行/制表符...），真狡猾！你会搞坏磁盘的！")
  }
  const okChars = /^[A-Za-z0-9_.\p{Script=Han}]+$/u;
  if (!okChars.test(name)) {
    throw new Error('包含特殊字符是个坏主意, 只接受中英文、数字、点和下划线！');
  }
  return true
}