import * as API from "./api.js";
import * as Utils from "./utils.js";




function main() {
    type AllState = "waitLogin"|"regist"|"newpwd"|"del_account"
    const state={
        state:"waitLogin" as AllState,
        to_login:function(){
            // msg.textContent="";
            // console.log("to_login")
            this.state = "waitLogin";
            extra.classList.add("hidden");
            loginBtn.classList.remove("hidden");
            otherfn.classList.remove("hidden");
            // extra.hidden=true;
            // loginBtn.hidden=false;
            // otherfn.hidden=false;
            extra_pwd1.value="";
            extra_pwd2.value="";
            pwd_input.placeholder="密码";
            extra_pwd1.placeholder="";
            extra_pwd2.placeholder="";
        },
        to_regist:function(){
            this.state = "regist";
            msg.textContent="";
            extra.classList.remove("hidden");
            loginBtn.classList.add("hidden");
            otherfn.classList.add("hidden");
            // extra.hidden=false;
            // otherfn.hidden=true;
            // loginBtn.hidden=true;
            pwd_input.placeholder="输入你要注册的密码";
            extra_pwd1.placeholder="再次输入你要注册的密码";
            extra_pwd2.placeholder="三次输入你要注册的密码";
        },
        to_newpwd:function(){
            this.state = "newpwd";
            msg.textContent="";
            extra.classList.remove("hidden");
            loginBtn.classList.add("hidden");
            otherfn.classList.add("hidden");

            // otherfn.hidden=true;
            // loginBtn.hidden=true;
            // extra.hidden=false;
            pwd_input.placeholder="输入你的原密码";
            extra_pwd1.placeholder="输入你的新密码";
            extra_pwd2.placeholder="再次输入你的新密码";
        },
        to_del:function(){
            this.state = "del_account";
            msg.textContent="";
            extra.classList.remove("hidden");
            loginBtn.classList.add("hidden");
            otherfn.classList.add("hidden");
            // otherfn.hidden=true;
            // loginBtn.hidden=true;
            // extra.hidden=false;
            pwd_input.placeholder="输入你的原密码";
            extra_pwd1.placeholder="再次输入你的原密码";
            extra_pwd2.placeholder="三次输入你的原密码";
        },
        confirm:async function(){
            msg.textContent="";
            if (this.state==="waitLogin"){
                const username = username_input.value;
                const paswword = pwd_input.value;
                const account:API.Account = {
                    id:0,
                    username:username,
                    password:paswword,
                }
                try{
                    const token:string = await API.auth_login(account);
                    msg.textContent= "Ok";
                    localStorage.setItem("token",token);
                    localStorage.setItem("username",username);
                    window.location.href="/portal/files";
                    // this.to_login()
                }catch(e){
                    if (e instanceof Error) {
                        msg.textContent = e.message;
                    } else {
                        msg.textContent = String(e);
                    }
                }                
            }

            if (this.state==="regist"){
                if (pwd_input.value != extra_pwd1.value || extra_pwd1.value!=extra_pwd2.value){
                    msg.textContent = "三次输入的密码不一致！"
                    return;
                }
                try{
                    const account :API.Account= {id:0,username:username_input.value,password:pwd_input.value}
                    const res = await API.accounts_create(account);
                    msg.textContent= "Ok";
                    // console.log("to_login1")
                    await Utils.sleep(1000);
                    // console.log("to_login2")
                    this.to_login()
                }catch(e){
                    if (e instanceof Error){
                        msg.textContent = e.message;
                    }else{
                        msg.textContent = String(e);
                    }
                }
                return;}

            
            if (this.state==="newpwd"){
                if (extra_pwd1.value!=extra_pwd2.value){
                    msg.textContent = "两次输入的新密码不一致！";
                    return;
                }
                try{
                    const account :API.Account= {id:0,username:username_input.value,password:pwd_input.value}
                    const withPWD :API.AccountWithNewPwd = {account:account,newpwd:extra_pwd1.value}
                    const res = await API.accounts_edit(withPWD);
                    msg.textContent= "Ok";
                    await Utils.sleep(1000);
                    this.to_login()
                }catch(e){
                    if (e instanceof Error){
                        msg.textContent = e.message;
                    }else{
                        msg.textContent = String(e);
                    }
                }
                return;
            }

            if (this.state=="del_account"){
                if (pwd_input.value != extra_pwd1.value || extra_pwd1.value!=extra_pwd2.value){
                    msg.textContent = "三次输入的原密码不一致！"
                    return;
                }
                try{
                    const account :API.Account= {id:0,username:username_input.value,password:pwd_input.value}
                    const res = await API.accounts_delete(account);
                    msg.textContent= "Ok";
                    await Utils.sleep(1000);
                    this.to_login();
                }catch(e){
                    if (e instanceof Error){
                        msg.textContent = e.message;
                    }else{
                        msg.textContent = String(e);
                    }
                }
            return;   
            }
            // this.to_login()
            return;
        }
    }

    const note= hint();
    const layout = document.createElement("div");
    layout.id = "layout";

    const box = document.createElement("div");
    box.className="loginArea"
    box.id = "loginArea";

    const username_input = document.createElement("input");
    username_input.id = "username";
    username_input.name="username";
    username_input.autocomplete="username";
    username_input.placeholder = "用户名";

    const pwd_input = document.createElement("input");
    pwd_input.id = "password";
    pwd_input.placeholder = "密码";
    pwd_input.type="password";
    pwd_input.name="username";
    pwd_input.autocomplete="username";

    const loginBtn = document.createElement("button");
    loginBtn.className="btn-primary";
    loginBtn.id="loginBtn";
    loginBtn.textContent="登录";
    
    loginBtn.addEventListener("click",async ()=>{state.confirm()});

    const otherfn = document.createElement("div");
    otherfn.className = "btn-small-group";

    const regist = document.createElement("button");
    regist.className="btn-small";
    regist.title="先在上方输入你要创建的用户名和密码，再点击这里";
    regist.textContent="注册账户";
    regist.addEventListener("click",async ()=>{
        state.to_regist()
    })

    const newpwd = document.createElement("button");
    newpwd.className="btn-small";
    newpwd.title="先在上方输入你要创建的用户名和密码，再点击这里";
    newpwd.textContent="修改密码";
    newpwd.addEventListener("click",()=>{
        state.to_newpwd()
    })

    const del_accout = document.createElement("button");
    del_accout.className="btn-small";
    del_accout.title="先在上方输入你要创建的用户名和密码，再点击这里";
    del_accout.textContent="删除账户";
    del_accout.addEventListener("click",()=>{
        state.to_del()
    })


    const forget = document.createElement("button");
    forget.className="btn-small";
    forget.textContent="忘记密码";
    forget.addEventListener("click",()=>{
        window.alert("自助重置密码功能还在开发中，请联系管理员在后台重置！")
    })


    const msg = document.createElement("div");
    msg.id = "msg";

    const extra = document.createElement("div");
    extra.className = "extra-fields";
    extra.id="extraFields";
    
    const extra_pwd1 = document.createElement("input");
    extra_pwd1.id = "field1";
    extra_pwd1.type="password";
    extra_pwd1.placeholder="";

    const extra_pwd2 = document.createElement("input");
    extra_pwd2.id = "field2";
    extra_pwd2.type="password";
    extra_pwd2.placeholder="";

    const extra_action = document.createElement("div");
    extra_action.className = "extra-actions";
    

    const confirm = document.createElement("button");
        confirm.className="btn-primary";
        confirm.id = "confirmBtn";
        confirm.textContent="确定";
        confirm.addEventListener("click",async ()=>{state.confirm()})

    const cancel = document.createElement("button");
    cancel.className="btn-primary";
    cancel.id = "cancelBtn";
    cancel.textContent="取消";
    cancel.addEventListener("click",()=>{
        state.to_login()
    })

    extra.hidden=true;
    extra_action.append(cancel,confirm);
    extra.append(extra_pwd1,extra_pwd2,extra_action)
    otherfn.append(regist,newpwd,del_accout,forget);
    box.append(username_input,pwd_input,loginBtn,extra,otherfn,msg)
    box.addEventListener("keydown",e=>{
        if (e.key==="Escape"){
            cancel.click()
        }
        if (e.key=="Enter"){
            state.confirm()
        }
    })
    layout.append(box,note);
    document.body.append(layout);
    state.to_login();

}



function hint(){
    const box = document.createElement("div");
    box.className="hintArea",
    box.id="hint";

    const p = document.createElement("p");
    p.textContent="‼️温馨提示‼️";

    const ul = document.createElement("ul");
    const li1 = document.createElement("li");
    li1.textContent="➡️ 欢迎你来这里分享文件!";
    const li2 = document.createElement("li");
    li2.textContent="➡️ 作者水平有限，bug难以避免。";
    const li3 = document.createElement("li");
    li3.textContent="➡️ 不要将这里视为你的唯一磁盘，请在本地备份好文件后再来分享。";
    const li4 = document.createElement("li");
    li4.textContent="➡️ 如上，即使站点崩溃，您也没有任何数据损失。";

    const li5 = document.createElement("li");
    li5.innerHTML=`➡️ 欢迎看看作者的<a href="https://guanbinwu.github.io">其他项目</a>。`;
    
    
    const footer = document.createElement("p");
    footer.textContent = "🖖Live long and prosper🖖";    
    ul.append(li1,li2,li3,li4,li5);
    box.append(p,ul,footer);
    return box
}










main()
//   <div class = "layout">
//     <div class="box" id ="loginArea">
//       <input id="username" placeholder="用户名" />
//       <input id="password" type="password" placeholder="密码" />
//       <button class="btn-primary" id="loginBtn" onclick="login()">登录</button>
//       <div class="btn-small-group">
//         <button class="btn-small" onclick="regist()" title="先在上方输入你要创建的用户名和密码，再点击这里">注册账户</button>
//         <button class="btn-small" onclick="showModifyPassword()" title="先在上方输入你的用户名和密码，再点击这里">修改密码</button>
//         <button class="btn-small" onclick="showDeleteAccount()" title="先在上方输入你的用户名和密码，再点击这里">删除账户</button>
//       </div>
//       <div id="status"></div>
//       <div class="extra-fields" id="extraFields">
//         <input id="field1" type="password" placeholder="" />
//         <input id="field2" type="password" placeholder="" />
//         <div class="extra-actions">
//           <button class="btn-confirm" id="extraConfirmBtn" onclick="executeExtraAction()">确认</button>
//           <button class="btn-cancel" onclick="hideExtraFields()">取消</button>
//         </div>
//       </div>
//     </div>

//     <div class="box" id="hint"style="padding: 20px 30px 20px 30px;border-radius: 0px;">
//       <p style="text-align: center;color: var(--balck);">‼️温馨提示‼️</p>
//       <ul>
//         <li>➡️ 欢迎你来这里分享文件!</li>
//         <li>➡️ 作者水平有限，bug难以避免。</li> 
//         <li>➡️ 不要将这里视为你的唯一磁盘，请在本地备份好文件后再来分享。</li> 
//         <li>➡️ 如上，即使站点崩溃，您也没有任何数据损失。</li>
//         <li>➡️ 欢迎看看作者的<a href="https://guanbinwu.github.io">其他项目</a>。</li>
//       </ul>
//       <p style="text-align: center;position: absolute;left: 0;right: 0; bottom: 10px;color: var(--balck);">🖖Live long and prosper🖖</p>
//     </div>







