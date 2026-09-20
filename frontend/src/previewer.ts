import  * as API from "./api.js";
import * as Utils from "./utils.js";
export const Previewer = {
  previewFile(blob:Blob, file:API.FileEntry,full_name:string,uploadfn:(arrayBuffer:ArrayBuffer)=>Promise<void>) {
    const existing = document.querySelector('.previewer');
    if (existing) existing.remove();
    const type = blob.type;
    const filename = new Utils.Path().from_string(file.name).peek_filename()
    if (type === 'application/pdf') {
      this.previewPDF(blob, filename);
    } else if (type.startsWith('text/') || type === 'application/json' ||type ==="") {
      this.previewText(blob, file,full_name,uploadfn);
    } else if (type.startsWith('image/')) {
      this.previewImage(blob);
    }
  },

  previewPDF(blob:Blob, fileName:string) {
    const url = URL.createObjectURL(blob);
    const win = window.open('', fileName);
    if (win) {
      win.document.title = fileName;
      win.location.href = url;
    } else {
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  async previewText(blob:Blob, file:API.FileEntry,full_name:string,uploadfn:(arrayBuffer:ArrayBuffer)=>Promise<void>) {
    const content = await blob.text();
    const overlay = document.createElement('div');
    overlay.className = 'previewer';

    const title =document.createElement('div');
    title.className = "modal-title";
    title.textContent=full_name;
    title.style.width="70%";
    
    const textarea = document.createElement('textarea');
    textarea.id = String(file.id);
    textarea.className = 'text-editor';
    textarea.value = content;
    textarea.readOnly = false;
    
    
    const msg = Utils.messager();
    msg.el.style.width="70%";
    msg.el.style.padding="0px";
    const cancelfn = ()=>{overlay.remove()}
    const confirmfn = async ()=>{
      try{
          const new_content = textarea.value;
          if (content===new_content)return;
          const arrayBuffer = await new Blob([new_content]).arrayBuffer();
          await uploadfn(arrayBuffer);
          msg.set("Ok")
          msg.push("窗口将于1秒后关闭")
          await Utils.sleep(1000)
          overlay.remove()
      }catch(e){
        if (e instanceof Error){msg.set(e.message)}else{msg.set(String(e))}
      }
    }

    const btn_container = Utils.confirmBtns("保存","返回",confirmfn,cancelfn)
    btn_container.style.width="70%";
    overlay.append(title,textarea,btn_container,msg.el);
    document.body.appendChild(overlay);
  },

  previewImage(blob:Blob) {
    const container = document.createElement('div');
    container.className = 'previewer';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    container.appendChild(img);
    document.body.appendChild(container);

    container.addEventListener('click', (e) => {
      if (e.target === container) {
        container.remove();
        URL.revokeObjectURL(img.src);
      }})

    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      container.remove();
      URL.revokeObjectURL(img.src);
    });
  }

};