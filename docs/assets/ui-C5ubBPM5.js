import{g as M,i as Be,h as te,a as E,j as ze,r as ke,s as Ve,k as G,e as le,m as ne,o as J,p as Ie,q as Ue,l as Z,t as Se,f as ee,C as Fe,u as Ne,v as O,w as qe,P as Ee,d as K,x as we,y as Pe,z as Re,B as Ke,D as Oe,T as De,E as Ge,F as Je}from"./data-Cq_8JNR_.js";import{k as We,a as Qe,r as Ye,f as Xe,p as Ze,e as et,s as tt,b as nt,m as at,n as st,l as it,d as oe,o as ae}from"./engine-CraBd6Dy.js";import{r as se,f as rt}from"./ai-CUBKmyws.js";import{$ as ce}from"./vendor-DvnuzqsD.js";import{l as lt,g as W,a as ot,b as ct,i as dt,h as de,s as ut,c as pt,m as xe,d as mt,r as ht,e as bt,u as yt,f as ft,j as ue,C as Ce}from"./persist-UTE2eAdN.js";const gt={tutorial_01:[{title:"座位與體力",body:"周圍是各座位。紅心是體力。你永遠在畫面靠近自己的一側。點座位上的 ℹ 可看武將技能。"},{title:"手牌區",body:"底部一排是你的手牌。亮起、可點的牌才是現在能用的。點 ℹ 看牌面說明。"},{title:"出【殺】",body:"出牌階段點一張【殺】（再點一次打出），然後點亮起的敵方座位作為目標。對方可出【閃】抵消。"},{title:"結束與棄牌",body:"不想再出牌就按「結束出牌」。手牌多過體力上限時，要棄到上限。完成後輪到對手。"}],tutorial_02:[{title:"裝備區",body:"座位上「裝備」那一行就是裝備區。本關你已戴上【諸葛連弩】：攻擊範圍 1，但一回合可出多張【殺】。"},{title:"錦囊",body:"【無中生有】摸兩張；【過河拆橋】選一名角色，棄其手牌或裝備（手牌背面看不見內容）。錦囊多數無距離限制。"},{title:"再出殺",body:"有連弩時，出完一張【殺】後仍可再出【殺】。打完按「結束出牌」。"}],tutorial_03:[{title:"瀕死",body:"體力到 0 會問全場是否出【桃】。救到體力大於 0 才活。問到你時，亮起的【桃】點兩下打出。"},{title:"這一關",body:"雙方體力都很低。你可用【殺】先手；自己受傷時記得留【桃】。華佗的紅牌也可當桃（技能詳見 ℹ）。"}]};function Le(e){return e?gt[e]??[]:[]}function _e(e){return!!e&&Be(e.config.campaignStageId)}function vt(e,a){const n=e.prompt,s=e.players.find(i=>i.isHuman);if(!s||e.winnerIds)return"";if(e.matchPhase==="pick_general")return"請點選一名武將，確認後開局";if(n.actorId!==s.id)return"等待其他角色行動…";switch(n.kind){case"choose_card":{if(a){const i=s.hand.find(l=>l.uid===a);return`已選【${i?M(i.defId).name:"此牌"}】— 再點同一張打出，或點其他牌改選`}return e.phase==="play"?"出牌階段：點亮起的手牌使用，或按「結束出牌」":n.message||"請選擇一張牌"}case"choose_target":return"請點亮起、會閃爍的座位作為目標";case"respond_shan":return"需要【閃】：點亮起的【閃】打出，或按「放棄」承受傷害";case"respond_sha":return"需要【殺】：點亮起的【殺】打出，或按「放棄」";case"discard":return`棄牌階段：點選要棄的牌（需棄 ${n.discardCount??""} 張）`;case"choice":return n.message||"請在上方選項中點選";case"skill_cards":return n.message||"請依技能選擇牌，再按確認";default:return n.message||""}}function $t(e){return Array.from({length:e},(a,n)=>({id:n,type:"empty",name:"",ready:!1}))}function kt(e){return e.find(a=>a.type==="empty")}function He(e){return kt(e)??e.find(a=>a.type==="ai")}function D(){return{room:null,localName:"",joinCode:"",error:null,isHost:!1,myClientId:null}}function It(e,a,n,s){const i=$t(n);return i[0]={id:0,type:"human",name:a,clientId:e,ready:!0},{roomId:St(),hostClientId:e,maxPlayers:n,status:"lobby",seats:i}}function St(e=4){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let n="";for(let s=0;s<e;s++)n+=a[Math.floor(Math.random()*a.length)];return n}function qt(e){const a=e.seats.map(n=>n.type==="empty"?{...n,type:"ai",name:`電腦${n.id+1}`,clientId:void 0,ready:!0}:n);return{...e,seats:a}}function Me(e){return e.filter(a=>a.type==="human").length}function Et(e){return e.filter(a=>a.type==="ai").length}function wt(e){return e.filter(a=>a.type==="empty").length}function Pt(e,a){return a&&e.status==="lobby"&&Me(e.seats)>=1}function xt(e){const{room:a,localName:n,joinCode:s,error:i,isHost:r,myClientId:l}=e;if(!a)return`
    <div class="screen lobby-screen">
      <div class="topbar">
        <button type="button" class="btn ghost" data-go="start">返回</button>
        <h2>房間連線</h2>
      </div>
      ${i?`<p class="lobby-error">${z(i)}</p>`:""}
      <div class="panel lobby-panel">
        <p class="hint lobby-lead">房主開 8 人身份局，其餘玩家用房號加入。空位可由電腦補上，開局時機由房主決定。</p>
        <label class="field">你的名字
          <input type="text" id="lobby-name" maxlength="8" value="${pe(n)}" placeholder="例如：主公" autocomplete="nickname" />
        </label>
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="lobby-create-8">開 8 人房（房主）</button>
          <button type="button" class="btn ghost" id="lobby-create-5">開 5 人房</button>
        </div>
        <hr class="settings-sep" />
        <label class="field">輸入房號加入
          <input type="text" id="lobby-code" maxlength="6" value="${pe(s)}" placeholder="例如：K7P2" style="text-transform:uppercase" />
        </label>
        <button type="button" class="btn" id="lobby-join">加入房間</button>
      </div>
      <p class="hint">最多 1 位房主 + 7 位玩家。未入座的空位，開局時自動變成電腦。<br/>連線走 PeerJS（無需自架伺服器）。兩邊都要開著此頁。</p>
    </div>`;const d=Me(a.seats),c=Et(a.seats),g=wt(a.seats),b=a.seats.find(v=>v.clientId===l),u=a.maxPlayers>=8?"八人身份":"五人身份",y=a.seats.map(v=>{const w=v.clientId===a.hostClientId,T=v.clientId===l;let x="等待加入…";if(v.type==="human"){const B=[z(v.name||"玩家")];w&&B.push("房主"),T&&!w&&B.push("你"),v.ready&&B.push("已準備"),x=B.join(" · ")}else v.type==="ai"&&(x=z(v.name||"電腦"));const _=v.type==="human"?"seat-human":v.type==="ai"?"seat-ai":"seat-empty",j=r&&v.type!=="human"?v.type==="empty"?`<button type="button" class="btn ghost seat-act" data-seat-ai="${v.id}">改電腦</button>`:`<button type="button" class="btn ghost seat-act" data-seat-empty="${v.id}">改空位</button>`:"";return`<li class="lobby-seat ${_}"><span class="idx">${v.id+1}</span><span class="lobby-seat-name">${x}</span>${j}</li>`}).join(""),o=r?`<div class="lobby-actions">
        ${g?'<button type="button" class="btn ghost" id="lobby-fill-ai">空位全改電腦</button>':""}
        <button type="button" class="btn primary" id="lobby-start" ${Pt(a,!0)?"":"disabled"}>
          開始${u}局
        </button>
      </div>
      <p class="hint">人數齊唔齊都得，你決定幾時開始。剩餘空位開局時會自動變電腦。</p>`:`<div class="lobby-actions">
        <button type="button" class="btn ${b!=null&&b.ready?"ghost":"primary"}" id="lobby-ready">
          ${b!=null&&b.ready?"取消準備":"準備"}
        </button>
      </div>
      <p class="hint">等待房主開始… 準備只係畀房主睇，開局權在房主。</p>`;return`
  <div class="screen lobby-screen">
    <div class="topbar">
      <button type="button" class="btn ghost" id="lobby-leave">離開</button>
      <h2>${u}房</h2>
    </div>
    ${i?`<p class="lobby-error">${z(i)}</p>`:""}
    <div class="panel lobby-panel">
      <p class="lobby-code-row">
        房號 <strong class="lobby-code">${z(a.roomId)}</strong>
        <button type="button" class="btn ghost" id="lobby-copy">複製房號</button>
        <button type="button" class="btn ghost" id="lobby-copy-link">複製連結</button>
      </p>
      <ul class="lobby-seats">${y}</ul>
      ${o}
    </div>
    <p class="hint">真人 ${d} · 電腦 ${c} · 空位 ${g} · 上限 ${a.maxPlayers}</p>
  </div>`}function z(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function pe(e){return z(e).replace(/'/g,"&#39;")}const V={};function ie(){const e="wtk_mp_client_id";try{let a=sessionStorage.getItem(e);return a||(a="c_"+Math.random().toString(36).slice(2,10),sessionStorage.setItem(e,a)),a}catch{return"c_"+Math.random().toString(36).slice(2,10)}}const me=(V==null?void 0:V.VITE_PARTYKIT_HOST)??"",Ct=(V==null?void 0:V.VITE_MP_OFFLINE)==="1",he={host:"0.peerjs.com",port:443,path:"/",secure:!0,debug:1,config:{iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]}};function Lt(e){return"wtk-"+e.trim().toUpperCase()}function F(e){if(!e)return"連線失敗";const a=e,n=a.type||"",s=a.message||String(e);return n==="peer-unavailable"||/unavailable/i.test(s)?"搜唔到房主（房號錯誤，或房主尚未準備好／已離開）。請等房主開好房再加入。":n==="network"||/network/i.test(s)?"網絡錯誤，請檢查網絡後重試":n==="server-error"||n==="socket-error"?"PeerJS 雲端暫時不可用，請稍後再試":n==="unavailable-id"?"房號被佔用，請重新開房":s||"連線失敗"}function _t(){return Ct?At():me?Mt(me):Ht()}function Ht(){const e=ie();let a=null,n=null,s=!1,i=!1,r=null,l="";const d=new Map;let c=null;const g=[];let b=!1,u=Promise.resolve();function y(m){b||a==null||a(m)}function o(m){y(m);for(const $ of d.values())if($.open)try{$.send(m)}catch{}}function v(m){if(!r)return;const $=r.seats.find(k=>k.clientId===m);$&&($.type="empty",$.name="",$.clientId=void 0,$.ready=!1,r={...r,seats:[...r.seats]},o({type:"room",room:r}))}function w(m){m.on("data",$=>{var P,I,C;const k=$;if(!(!k||typeof k!="object")){if(k.type==="join"){if(!r||r.status!=="lobby"){try{m.send({type:"error",message:"無法加入（房間已開局或不存在）"})}catch{}return}const S=He(r.seats);if(!S){try{m.send({type:"error",message:"房間已滿"})}catch{}return}const q=k,A=q.clientId||m.peer;S.type="human",S.name=q.name||"玩家",S.clientId=A,S.ready=!1,d.set(A,m),r={...r,seats:[...r.seats]},o({type:"room",room:r});return}if(k.type==="action"){const S=((P=[...d.entries()].find(([,q])=>q===m))==null?void 0:P[0])??m.peer;y({type:"remote_action",clientId:S,action:k.action});return}if(k.type==="leave"){const S=((I=[...d.entries()].find(([,q])=>q===m))==null?void 0:I[0])??m.peer;d.delete(S),v(S);return}if(k.type==="ready"&&r){const S=((C=[...d.entries()].find(([,A])=>A===m))==null?void 0:C[0])??m.peer,q=r.seats.find(A=>A.clientId===S);q&&(q.ready=!!k.ready,r={...r,seats:[...r.seats]},o({type:"room",room:r}))}}}),m.on("close",()=>{var k;const $=((k=[...d.entries()].find(([,P])=>P===m))==null?void 0:k[0])??m.peer;d.delete($),v($)})}function T(m){if(s){if(m.type==="host_room"){r=m.room,o({type:"room",room:m.room});return}if(m.type==="host_match"){r&&(r={...r,status:"playing",match:m.match}),o({type:"match",match:m.match});return}if(m.type==="leave"){x(),y({type:"error",message:"已離開房間"});return}return}if(c!=null&&c.open){if(m.type==="join"){const $={type:"join",name:m.name,clientId:e};c.send($);return}c.send(m)}}function x(){b=!0,i=!1;try{c==null||c.close()}catch{}c=null;for(const m of d.values())try{m.close()}catch{}d.clear();try{n==null||n.destroy()}catch{}n=null,r=null,l="",g.length=0}function _(m){return new Promise(($,k)=>{const P=setTimeout(()=>k(new Error("Peer 連線逾時（無法連上 PeerJS 雲端）")),2e4),I=q=>{clearTimeout(P),S(),$(q)},C=q=>{clearTimeout(P),S(),k(new Error(F(q)))},S=()=>{m.off("open",I),m.off("error",C)};m.on("open",I),m.on("error",C)})}function j(m,$){return new Promise((k,P)=>{let I=!1;const C=setTimeout(()=>{I||(I=!0,R(),P(new Error("無法連上房主（逾時）。請確認：① 房號完全一致 ② 房主畫面仍開著且已顯示房號 ③ 兩邊都有網絡。然後再試一次。")))},2e4),S=()=>{I||(I=!0,clearTimeout(C),R(),k())},q=X=>{I||(I=!0,clearTimeout(C),R(),P(new Error(F(X))))},A=X=>{I||(I=!0,clearTimeout(C),R(),P(new Error(F(X))))},R=()=>{$.off("open",S),$.off("error",q),m.off("error",A)};if($.open){S();return}$.on("open",S),$.on("error",q),m.on("error",A)})}async function B(m){n=new ce(he),await _(n);const $=()=>{const k=n.connect(m,{reliable:!0});return j(n,k).then(()=>k)};try{c=await $()}catch(k){const P=k instanceof Error?k.message:"";if(/搜唔到房主|unavailable|逾時/i.test(P)){await new Promise(I=>setTimeout(I,1500));try{c=await $()}catch(I){throw I}}else throw k}s=!1,c.on("data",k=>{try{y(k)}catch{}}),c.on("close",()=>{y({type:"error",message:"房主已斷線，房間關閉"})}),n.on("error",k=>{y({type:"error",message:F(k)})})}async function Y(m){if(i)return;if(!l)throw new Error("尚未 connect");const $=Lt(l);if(m.type==="host_room"||m.type==="host_match"){n=new ce($,he),await _(n),s=!0,n.on("connection",w),n.on("disconnected",()=>{try{n==null||n.reconnect()}catch{y({type:"error",message:"連線已中斷"})}}),n.on("error",k=>{y({type:"error",message:F(k)})}),i=!0;return}if(m.type==="join"){await B($),i=!0;return}}async function N(){for(;g.length;){const m=g[0];if(!i)try{await Y(m)}catch($){g.shift(),y({type:"error",message:$ instanceof Error?$.message:"連線失敗"}),x(),b=!1;return}if(!i)return;g.shift(),T(m)}}return{clientId:e,isOnline:!0,async connect(m){b=!1,l=m.trim().toUpperCase(),i=!1,s=!1},disconnect(){x(),b=!1},send(m){g.push(m),u=u.then(()=>N()).catch(()=>{})},onMessage(m){a=m}}}function Mt(e){const a=ie();let n=null,s=null;return{clientId:a,isOnline:!0,async connect(i){const r=`wss://${e}/parties/main/${encodeURIComponent(i)}?clientId=${encodeURIComponent(a)}`;n=new WebSocket(r),await new Promise((l,d)=>{if(!n)return d(new Error("no socket"));n.onopen=()=>l(),n.onerror=()=>d(new Error("WebSocket failed"))}),n.onmessage=l=>{try{const d=JSON.parse(String(l.data));s==null||s(d)}catch{}},n.onclose=()=>{s==null||s({type:"error",message:"連線已中斷"})}},disconnect(){n==null||n.close(),n=null},send(i){(n==null?void 0:n.readyState)===WebSocket.OPEN&&n.send(JSON.stringify(i))},onMessage(i){s=i}}}function At(){const e=ie();let a=null,n=null;return{clientId:e,isOnline:!1,async connect(){},disconnect(){n=null},send(s){if(s.type==="join"&&n){const i=He(n.seats);if(!i){a==null||a({type:"error",message:"房間已滿"});return}i.type="human",i.name=s.name||"玩家",i.clientId=e,i.ready=!1,a==null||a({type:"room",room:{...n,seats:[...n.seats]}});return}if(s.type==="leave"){n=null,a==null||a({type:"error",message:"已離開房間"});return}if(s.type==="host_room"){n=s.room,a==null||a({type:"room",room:s.room});return}if(s.type==="host_match"){n&&(n={...n,status:"playing",match:s.match}),a==null||a({type:"match",match:s.match});return}s.type==="start"&&n&&(a==null||a({type:"room",room:{...n,status:"playing"}}))},onMessage(s){a=s}}}function Ae(e,a,n){switch(n.type){case"select_card":nt(e,a,n.uid);break;case"select_target":tt(e,a,n.seatId);break;case"end_play":et(e,a);break;case"pass_response":Ze(e,a);break;case"cancel_target":Xe(e,a);break;case"choice":Ye(e,a,n.choiceId);break;case"skill":Qe(e,a,n.skillId);break;case"pick_general":We(e,n.generalId,a);break}}function Tt(e){if(!e||typeof e!="object")return null;const a=e;if(typeof a.type!="string")return null;switch(a.type){case"select_card":return typeof a.uid=="string"?{type:"select_card",uid:a.uid}:null;case"select_target":return typeof a.seatId=="number"?{type:"select_target",seatId:a.seatId}:null;case"end_play":return{type:"end_play"};case"pass_response":return{type:"pass_response"};case"cancel_target":return{type:"cancel_target"};case"choice":return typeof a.choiceId=="string"?{type:"choice",choiceId:a.choiceId}:null;case"skill":return typeof a.skillId=="string"?{type:"skill",skillId:a.skillId}:null;case"pick_general":return typeof a.generalId=="string"?{type:"pick_general",generalId:a.generalId}:null;default:return null}}const jt="0.21.0",t={screen:"start",setupMode:"duel",campaignId:null,storyKind:"campaign",stage:null,allyChoice:null,game:null,selectedUid:null,settings:lt(),detailHtml:null,aiBusy:!1,fxSettledSeq:null,matchEndPending:!1,matchPaused:!1,unlockBanners:[],liezhuanFilter:"all",coachSlide:0,lobbyVm:D(),mpClient:null,localSeatId:null},p=()=>document.querySelector("#app");function Q(e){return t.localSeatId!=null&&e.players[t.localSeatId]?e.players[t.localSeatId]:e.players.find(a=>a.isHuman)??e.players[0]}function U(){return t.mpClient!=null&&t.lobbyVm.room!=null}function H(e,a){var s,i;const n=Q(e);if(U()&&!t.lobbyVm.isHost){(s=t.mpClient)==null||s.send({type:"action",action:a});return}Ae(e,n.id,a),U()&&t.lobbyVm.isHost&&((i=t.mpClient)==null||i.send({type:"host_match",match:e}))}function Mn(){h()}function h(){var n,s,i,r;const e=p();switch(t.screen){case"start":e.innerHTML=Vt(),Ut();break;case"lobby":e.innerHTML=xt(t.lobbyVm),Rt();break;case"setup":e.innerHTML=Zt(),en();break;case"settings":e.innerHTML=Yt(),Xt();break;case"story":e.innerHTML=nn(),an();break;case"liezhuan":e.innerHTML=Dt(),Jt();break;case"achievements":e.innerHTML=Wt(),Qt();break;case"stage":e.innerHTML=sn(),rn();break;case"table":e.innerHTML=cn(),Sn(),In();break;case"epilogue":e.innerHTML=qn(),En();break;case"result":e.innerHTML=wn(),Pn();break}t.detailHtml&&(e.insertAdjacentHTML("beforeend",Bt(t.detailHtml)),(n=p().querySelector("#detail-close"))==null||n.addEventListener("click",()=>{t.detailHtml=null,h()}),(s=p().querySelector("#detail-backdrop"))==null||s.addEventListener("click",()=>{t.detailHtml=null,h()}));const a=(r=(i=t.game)==null?void 0:i.fx.play)==null?void 0:r.seq;a!==void 0?requestAnimationFrame(()=>{var l,d;((d=(l=t.game)==null?void 0:l.fx.play)==null?void 0:d.seq)===a&&(t.fxSettledSeq=a)}):t.fxSettledSeq=null}function Bt(e){return`<div class="modal-backdrop" id="detail-backdrop"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-body">${e}</div>
    <button type="button" class="btn primary" id="detail-close">關閉</button>
  </div>`}function zt(){return mt().asked?"":`<div class="modal-backdrop" id="tut-ask-backdrop"></div>
  <div class="modal first-play-modal" role="dialog" aria-modal="true">
    <div class="modal-body">
      <p class="coach-kicker">新手</p>
      <h3>要不要先打教學關卡？</h3>
      <p>共三關，每一步會有框框講解：基本牌、錦囊裝備、瀕死求桃。之後也可從標題畫面再進教學。</p>
    </div>
    <div class="cta-row modal-actions">
      <button type="button" class="btn primary" id="tut-yes">開始教學</button>
      <button type="button" class="btn ghost" id="tut-later">稍後再說</button>
    </div>
  </div>`}function Vt(){return`
  <div class="screen start-screen">
    <div class="start-bg" aria-hidden="true"></div>
    <div class="start-content">
      <p class="brand">sley</p>
      <h1 class="title">單機三國殺</h1>
      <p class="tagline">E殺風格・自由對戰、三國傳記與武將列傳</p>
      <div class="cta-row">
        <button type="button" class="btn primary" data-go="setup">自由對戰</button>
        <button type="button" class="btn" data-go="tutorial">教學關卡</button>
        <button type="button" class="btn" data-go="story">劇情模式</button>
        <button type="button" class="btn" data-go="liezhuan">武將列傳</button>
        <button type="button" class="btn" data-go="achievements">成就</button>
        <button type="button" class="btn" data-go="lobby">多人對戰</button>
        <button type="button" class="btn ghost" data-go="settings">設定</button>
      </div>
      <p class="version" id="app-version">v${jt}</p>
    </div>
    ${zt()}
  </div>`}function be(){xe(),t.storyKind="campaign",t.campaignId=De,t.screen="story",h()}function Ut(){var e,a;(e=p().querySelector("#tut-yes"))==null||e.addEventListener("click",()=>be()),(a=p().querySelector("#tut-later"))==null||a.addEventListener("click",()=>{xe(),h()}),p().querySelectorAll("[data-go]").forEach(n=>{n.addEventListener("click",()=>{const s=n.dataset.go;if(s==="tutorial"){be();return}s==="story"&&(t.storyKind="campaign",t.campaignId=null),s==="liezhuan"&&(t.storyKind="liezhuan",t.campaignId=null),t.screen=s,h()})})}function Ft(e){var n,s,i;const a=t.mpClient;if(a)if(e.type==="room"){t.lobbyVm.room=e.room,t.lobbyVm.isHost=e.room.hostClientId===a.clientId,t.lobbyVm.error=null;const r=e.room.seats.find(l=>l.clientId===a.clientId);t.localSeatId=r?r.id:t.localSeatId,e.room.status==="playing"&&e.room.match&&(t.game=e.room.match,t.screen="table"),h()}else if(e.type==="match")t.game=e.match,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.aiBusy=!1,t.stage=null,t.screen="table",h(),t.lobbyVm.isHost&&t.game&&se(t.game,()=>{t.screen==="table"&&h()});else if(e.type==="remote_action"){if(!t.lobbyVm.isHost||!t.game)return;const r=(n=t.lobbyVm.room)==null?void 0:n.seats.find(g=>g.clientId===e.clientId);if(!r||r.type!=="human")return;const l=Tt(e.action);if(!l)return;const d=t.game,c=d.prompt.actorId;if(d.matchPhase!=="pick_general"&&c!==null&&c!==r.id)return;Ae(d,r.id,l),(s=t.mpClient)==null||s.send({type:"host_match",match:d}),L()}else e.type==="error"&&(t.lobbyVm.error=e.message,(e.message.includes("離開")||e.message.includes("關閉"))&&((i=t.mpClient)==null||i.disconnect(),t.mpClient=null,t.lobbyVm=D(),t.localSeatId=null,t.screen="start"),h())}function ye(){return t.mpClient||(t.mpClient=_t(),t.mpClient.onMessage(Ft)),t.mpClient}function Nt(){var n,s,i;if(!t.lobbyVm.room||!t.lobbyVm.isHost)return;const e=qt(t.lobbyVm.room),a=e.maxPlayers>=8?"identity8":"identity5";try{const r=Oe({mode:a,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral,seats:e.seats.map(c=>({name:c.name,isHuman:c.type==="human"}))}),l=ae(r),d={...e,status:"playing",match:l};t.lobbyVm.room=d,t.game=l,t.localSeatId=((n=e.seats.find(c=>{var g;return c.clientId===((g=t.mpClient)==null?void 0:g.clientId)}))==null?void 0:n.id)??0,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,(s=t.mpClient)==null||s.send({type:"host_room",room:d}),(i=t.mpClient)==null||i.send({type:"host_match",match:l}),t.screen="table",h(),se(l,()=>{var c;t.screen==="table"&&h(),t.lobbyVm.isHost&&t.game&&((c=t.mpClient)==null||c.send({type:"host_match",match:t.game}))})}catch(r){t.lobbyVm.error=r instanceof Error?r.message:"開局失敗",h()}}function Rt(){var i,r,l,d,c,g,b;const e=t.lobbyVm;(i=p().querySelector('[data-go="start"]'))==null||i.addEventListener("click",()=>{var u;(u=t.mpClient)==null||u.disconnect(),t.mpClient=null,t.lobbyVm=D(),t.localSeatId=null,t.screen="start",h()});const a=p().querySelector("#lobby-name"),n=p().querySelector("#lobby-code"),s=u=>{const y=(a==null?void 0:a.value.trim())||"房主",o=ye(),v=It(o.clientId,y,u);t.lobbyVm={...e,localName:y,room:null,isHost:!0,myClientId:o.clientId,error:o.isOnline?"正在建立房間（連線 PeerJS）…":"本地預覽模式（VITE_MP_OFFLINE=1）"},t.localSeatId=0,h(),o.connect(v.roomId),o.send({type:"host_room",room:v})};(r=p().querySelector("#lobby-create-5"))==null||r.addEventListener("click",()=>s(5)),(l=p().querySelector("#lobby-create-8"))==null||l.addEventListener("click",()=>s(8)),(d=p().querySelector("#lobby-join"))==null||d.addEventListener("click",()=>{const u=(a==null?void 0:a.value.trim())||"玩家",y=((n==null?void 0:n.value)||"").trim().toUpperCase();if(!y){t.lobbyVm.error="請輸入房號",h();return}const o=ye();t.lobbyVm={...e,localName:u,joinCode:y,isHost:!1,myClientId:o.clientId,error:o.isOnline?`正在加入房間 ${y}…`:"本地預覽模式無法真正加入其他房間"},h(),o.connect(y).then(()=>{o.send({type:"join",name:u})})}),(c=p().querySelector("#lobby-copy"))==null||c.addEventListener("click",()=>{var y,o;const u=(y=t.lobbyVm.room)==null?void 0:y.roomId;u&&((o=navigator.clipboard)==null||o.writeText(u))}),(g=p().querySelector("#lobby-leave"))==null||g.addEventListener("click",()=>{var u,y;(u=t.mpClient)==null||u.send({type:"leave"}),(y=t.mpClient)==null||y.disconnect(),t.mpClient=null,t.lobbyVm=D(),t.localSeatId=null,t.screen="start",h()}),(b=p().querySelector("#lobby-start"))==null||b.addEventListener("click",()=>{Nt()})}function Kt(e){var r,l,d;const a=e.setup;if(!a)return"";const n=[],s=a.player;(r=s==null?void 0:s.equipKinds)!=null&&r.length&&n.push(`你裝備：${s.equipKinds.join("、")}`),(l=s==null?void 0:s.handKinds)!=null&&l.length&&n.push(`你指定手牌：${s.handKinds.join("、")}`),(s==null?void 0:s.handCount)!=null&&n.push(`你手牌數 ${s.handCount}`),((s==null?void 0:s.hp)!=null||(s==null?void 0:s.maxHp)!=null)&&n.push(`你體力 ${s.hp??s.maxHp}/${s.maxHp??s.hp}`);const i=a.enemies;return((i==null?void 0:i.hp)!=null||(i==null?void 0:i.maxHp)!=null)&&n.push(`敵體力 ${i.hp??i.maxHp}/${i.maxHp??i.hp}`),(d=i==null?void 0:i.equipKinds)!=null&&d.length&&n.push(`敵裝備：${i.equipKinds.join("、")}`),n.length?`<p class="intel-pack">特殊開局：${n.map(f).join("　·　")}</p>`:""}function Ot(e){if(!_e(e)||t.coachSlide<0||e.winnerIds)return"";const a=Le(e.config.campaignStageId);if(!a.length||t.coachSlide>=a.length)return"";const n=a[t.coachSlide],s=a.length,i=t.coachSlide>=s-1;return`<div class="coach-layer" role="dialog" aria-modal="true">
    <div class="coach-box">
      <p class="coach-kicker">教學 ${t.coachSlide+1}/${s}</p>
      <h3>${f(n.title)}</h3>
      <p>${f(n.body)}</p>
      <div class="coach-actions">
        <button type="button" class="btn primary" id="coach-next">${i?"開始實戰":"下一步"}</button>
        <button type="button" class="btn ghost" id="coach-skip">略過本關講解</button>
      </div>
    </div>
  </div>`}function fe(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function Dt(){const e=Z().filter(i=>t.liezhuanFilter==="all"?!0:i.kingdom===t.liezhuanFilter),a=["all","wei","shu","wu","qun"],n=Z().filter(i=>de(i.id)).length,s=Z().length;return`
  <div class="screen panel-screen liezhuan-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>武將列傳</h2>
    </header>
    <p class="story-intro">每位武將皆有個人列傳（一至數關）。通關後解鎖該武將的 Q 版造型；預設無造型。</p>
    <p class="lz-progress">已解鎖造型 ${n}/${s}</p>
    <div class="lz-filters">
      ${a.map(i=>{const r=i==="all"?"全部":fe(i);return`<button type="button" class="btn ${t.liezhuanFilter===i?"primary":"ghost"}" data-filter="${i}">${r}</button>`}).join("")}
    </div>
    <ul class="lz-grid">
      ${e.map(i=>{const r=Se(i.id);if(!r)return"";const l=ee(r.id),d=Math.min(l-1,r.stages.length),c=de(i.id),g=W(i.id)==="chibi",b=c?te(i):Gt(i);return`<li class="lz-card ${c?"done":""}">
            <button type="button" class="lz-open" data-lz="${i.id}">
              <img class="lz-avatar ${c?"chibi-on":""}" src="${b}" alt="" />
              <span class="lz-name">${f(i.name)}</span>
              <span class="lz-meta">${fe(i.kingdom)}・${r.stages.length} 關・${d}/${r.stages.length}</span>
              <span class="lz-badge">${c?g?"Q 版已裝備":"已解鎖":"尚無造型"}</span>
            </button>
            ${c?`<button type="button" class="btn ghost lz-toggle" data-skin="${i.id}">${g?"卸下造型":"裝備 Q 版"}</button>`:""}
          </li>`}).join("")}
    </ul>
  </div>`}function Gt(e){return G(e)}function Jt(){var e;(e=p().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",h()}),p().querySelectorAll("[data-filter]").forEach(a=>{a.addEventListener("click",()=>{t.liezhuanFilter=a.dataset.filter,h()})}),p().querySelectorAll("[data-lz]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.lz,s=Se(n);s&&(t.storyKind="liezhuan",t.campaignId=s.id,t.screen="story",h())})}),p().querySelectorAll("[data-skin]").forEach(a=>{a.addEventListener("click",n=>{n.stopPropagation();const s=a.dataset.skin,i=W(s)==="chibi";ut(s,i?null:Ce),h()})})}function Wt(){const e=ot(),{unlocked:a,total:n}=ct();return`
  <div class="screen panel-screen ach-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>成就</h2>
    </header>
    <p class="story-intro">完成列傳可解鎖 Q 版造型。成就進度 ${a}/${n}。</p>
    ${[{kind:"feat",title:"功業"},{kind:"campaign",title:"劇情傳記"},{kind:"set",title:"勢力集齊"},{kind:"liezhuan",title:"武將列傳"}].map(i=>{const r=e.filter(l=>l.kind===i.kind);return`<section class="ach-group">
          <h3>${i.title}</h3>
          <ul class="ach-list">
            ${r.map(l=>{const d=dt(l.id),c=l.generalId?E(l.generalId):null,g=c?`<img src="${d?te(c):G(c)}" alt="" />`:"";return`<li class="ach-item ${d?"on":""}">
                  ${g}
                  <div>
                    <strong>${f(l.title)}</strong>
                    <span>${f(l.hint)}</span>
                  </div>
                  <em>${d?"已達成":"未達成"}</em>
                </li>`}).join("")}
          </ul>
        </section>`}).join("")}
  </div>`}function Qt(){var e;(e=p().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",h()})}function Yt(){const e=t.settings,a=!!e.aiApiToken.trim();return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>設定</h2>
    </header>
    <div class="panel">
      <label class="field">
        <span>電腦思考時間：<strong id="delay-label">${(e.thinkDelayMs/1e3).toFixed(1)} 秒</strong></span>
        <input type="range" id="think-delay" min="0" max="3000" step="100" value="${e.thinkDelayMs}" />
        <span class="hint">每個電腦行動之間的間隔（預設 1 秒）</span>
      </label>
      <label class="field check">
        <input type="checkbox" id="show-portraits" ${e.showPortraits?"checked":""} />
        <span>顯示武將頭像</span>
      </label>
      <label class="field check">
        <input type="checkbox" id="force-select" ${e.forceSelectGeneral?"checked":""} />
        <span>對局內可選全部武將（關閉則隨機三選一）</span>
      </label>
      <hr class="settings-sep" />
      <h3 class="settings-sub">卡包（自由對戰）</h3>
      <p class="hint">預設僅標準包。劇情模式會依關卡與登場武將自動啟用對應卡包。</p>
      <div class="pack-list">
        ${Ee.map(n=>{const s=e.enabledPacks.includes(n.id),i=!!n.alwaysOn;return`<label class="field check">
            <input type="checkbox" data-pack="${n.id}" ${s?"checked":""} ${i?"disabled":""} />
            <span><strong>${n.name}</strong> — ${n.hint}${i?"（固定）":""}</span>
          </label>`}).join("")}
      </div>
      <hr class="settings-sep" />
      <h3 class="settings-sub">進階 AI（選填）</h3>
      <p class="hint">填入 OpenAI 相容 API Token 後，每位電腦座位會用大模型依「自己所知」決策；留空則使用內建規則 AI。</p>
      <label class="field">
        <span>AI API Token ${a?"（已儲存）":""}</span>
        <input type="password" id="ai-token" placeholder="sk-... 或供應商 Token" value="${f(e.aiApiToken)}" autocomplete="off" />
      </label>
      <label class="field">
        <span>API Base URL</span>
        <input type="text" id="ai-base" value="${f(e.aiApiBaseUrl)}" placeholder="https://api.openai.com/v1" />
      </label>
      <label class="field">
        <span>Model</span>
        <input type="text" id="ai-model" value="${f(e.aiModel)}" placeholder="gpt-4o-mini" />
      </label>
      <label class="field check">
        <input type="checkbox" id="ai-debug" ${e.showAiDebug?"checked":""} />
        <span>角色 ℹ 中顯示當下 AI 想法（身份推測一律可在 ℹ 查看）</span>
      </label>
      <p class="hint">身份局中點座位 ℹ 可看該角色對他人的身份推測、排除項與人數池；內奸可能伪装。</p>
      <button type="button" class="btn primary" id="save-settings">儲存</button>
    </div>
  </div>`}function Xt(){var n,s;const e=p().querySelector("#think-delay"),a=p().querySelector("#delay-label");e.addEventListener("input",()=>{a.textContent=`${(Number(e.value)/1e3).toFixed(1)} 秒`}),(n=p().querySelector("[data-back]"))==null||n.addEventListener("click",()=>{t.screen="start",h()}),(s=p().querySelector("#save-settings"))==null||s.addEventListener("click",()=>{const i=Ee.filter(r=>{if(r.alwaysOn)return!0;const l=p().querySelector(`[data-pack="${r.id}"]`);return!!(l!=null&&l.checked)}).map(r=>r.id);t.settings={thinkDelayMs:Number(e.value),showPortraits:p().querySelector("#show-portraits").checked,forceSelectGeneral:p().querySelector("#force-select").checked,enabledPacks:i,aiApiToken:p().querySelector("#ai-token").value.trim(),aiApiBaseUrl:p().querySelector("#ai-base").value.trim()||"https://api.openai.com/v1",aiModel:p().querySelector("#ai-model").value.trim()||"gpt-4o-mini",showAiDebug:p().querySelector("#ai-debug").checked},pt(t.settings),t.screen="start",h()})}function Zt(){return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>自由對戰設定</h2>
    </header>
    <div class="panel">
      <label class="field">
        <span>模式</span>
        <select id="mode">
          <option value="duel" ${t.setupMode==="duel"?"selected":""}>1v1 對決</option>
          <option value="identity5" ${t.setupMode==="identity5"?"selected":""}>五人身份局</option>
          <option value="identity8" ${t.setupMode==="identity8"?"selected":""}>八人身份局</option>
        </select>
      </label>
      <p class="hint">卡包：${Ie(t.settings.enabledPacks)}（可在設定中變更；預設僅標準包）</p>
      <p class="hint">進入對局後會先看到座位與身份，再從系統隨機抽出的三名武將中選擇（可在設定改為全部可選）。</p>
      <button type="button" class="btn primary" id="start-match">開始對戰</button>
    </div>
  </div>`}function re(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function en(){var e,a;(e=p().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",h()}),(a=p().querySelector("#start-match"))==null||a.addEventListener("click",()=>{tn()})}async function tn(){const e=p().querySelector("#mode").value;t.setupMode=e;const a=Ke({mode:e,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral});t.game=ae(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,t.screen="table",h()}function nn(){if(!t.campaignId)return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情模式</h2>
    </header>
    <p class="story-intro">選擇傳記。關卡會依登場武將自動啟用對應卡包（風／火／林／山／一將等）。</p>
    <ul class="stage-list campaign-pick">
      ${Fe.map(n=>{const s=ee(n.id),i=Math.min(s-1,n.stages.length);return`<li>
          <button type="button" data-campaign="${n.id}">
            <span class="idx">${f(n.title)}</span>
            <span class="st">${f(n.blurb)}</span>
            <span class="sub">進度 ${i}/${n.stages.length}</span>
          </button>
        </li>`}).join("")}
    </ul>
  </div>`;const e=Ne(t.campaignId),a=ee(e.id);return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back-campaigns>${O(t.campaignId)?"返回標題":t.storyKind==="liezhuan"?"列傳列表":"傳記列表"}</button>
      <h2>${O(t.campaignId)?f(e.title):`劇情・${f(e.title)}`}</h2>
    </header>
    <p class="story-intro">${f(e.blurb)}</p>
    <ul class="stage-list">
      ${e.stages.map(n=>{const s=n.index>a;return`<li class="${s?"locked":""}">
          <button type="button" data-stage="${n.id}" ${s?"disabled":""}>
            <span class="idx">第${n.index}關</span>
            <span class="st">${n.title}</span>
            <span class="sub">${n.subtitle}・${n.era}</span>
            ${s?'<span class="lock">未解鎖</span>':""}
          </button>
        </li>`}).join("")}
    </ul>
  </div>`}function an(){var e,a;(e=p().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",h()}),(a=p().querySelector("[data-back-campaigns]"))==null||a.addEventListener("click",()=>{if(O(t.campaignId)){t.campaignId=null,t.screen="start",h();return}if(t.storyKind==="liezhuan"){t.campaignId=null,t.screen="liezhuan",h();return}t.campaignId=null,h()}),p().querySelectorAll("[data-campaign]").forEach(n=>{n.addEventListener("click",()=>{t.campaignId=n.dataset.campaign,h()})}),p().querySelectorAll("[data-stage]").forEach(n=>{n.addEventListener("click",()=>{var r,l;const s=n.dataset.stage,i=qe(s);t.stage=(i==null?void 0:i.stage)??null,t.campaignId=(i==null?void 0:i.campaign.id)??t.campaignId,t.allyChoice=((l=(r=t.stage)==null?void 0:r.allyChoices)==null?void 0:l[0])??null,t.screen="stage",h()})})}function sn(){var g;const e=t.stage,a=e.allyChoices??[],n=f(e.briefing).split(/\n+/).filter(Boolean).map(b=>`<p>${b}</p>`).join(""),s=e.prevLink?`<p class="story-bridge">${f(e.prevLink)}</p>`:"",i=e.allies.map(b=>b.name?b.name:E(b.generalId).name),r=e.enemies.map(b=>b.name??E(b.generalId).name),l=E(e.playerGeneralId).name,d=`
    <section class="intel-block">
      <h4>參戰勢力</h4>
      <div class="force-cols">
        <div>
          <p class="force-side">我方</p>
          <ul class="force-list">
            <li>${f(l)}</li>
            ${i.map(b=>`<li>${f(b)}</li>`).join("")}
            ${a.length?'<li class="force-pick">＋自選副將</li>':""}
          </ul>
        </div>
        <div>
          <p class="force-side foe">敵方</p>
          <ul class="force-list">
            ${r.map(b=>`<li>${f(b)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="intel-block">
      <h4>關卡設定</h4>
      <p class="intel-pack">卡包：${Ie(Ue(e))}${(g=e.requiredCardKinds)!=null&&g.length?`　·　必備：${e.requiredCardKinds.map(b=>b==="tiesuo"?"鐵索連環":b).join("、")}`:""}</p>
      <p class="intel-pack">勝利：${e.victory.type==="kill_target"?`擊殺 ${E(e.victory.targetGeneralId).name}`:e.victory.type==="survive_rounds"?`堅守突圍 ${e.victory.rounds??4} 輪（或擊潰追兵）`:"殲滅敵軍"}</p>
      ${Kt(e)}
    </section>`,c=ke({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds,intelExtraHtml:d});return`
  <div class="screen story-brief-screen">
    <header class="topbar story-brief-top">
      <button type="button" class="btn ghost" data-back>返回</button>
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${f(e.era)}・第${e.index}關</p>
        <h2>${e.title}</h2>
        <p class="story-brief-sub">${f(e.subtitle)}</p>
      </div>
    </header>
    ${c}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="關卡劇情">
        <div class="story-hand">${s}${n}</div>
      </div>
      <div class="panel story-ready">
        ${a.length?`<label class="field"><span>自選副將</span>
              <select id="ally">${a.map(b=>{const u=E(b==="dianwei_proxy"?"xuchu":b),y=b==="dianwei_proxy"?`${u.name}（代典韋）`:u.name;return`<option value="${b}" ${t.allyChoice===b?"selected":""}>${y}</option>`}).join("")}</select></label>`:'<p class="meta">確認戰局後進入戰鬥</p>'}
        <button type="button" class="btn primary" id="enter-stage">下一步</button>
      </div>
    </div>
  </div>`}function rn(){var e,a;(e=p().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="story",h()}),(a=p().querySelector("#enter-stage"))==null||a.addEventListener("click",()=>{ln()})}async function ln(){var n;const e=(n=p().querySelector("#ally"))==null?void 0:n.value;t.allyChoice=e??null;const a=Re(t.stage,t.allyChoice??void 0);t.game=ae(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.coachSlide=0,t.screen="table",h(),await L()}function Te(e,a,n){if(e.identity==="none")return"";const s={lord:"主公",loyal:"忠臣",rebel:"反賊",spy:"內奸"}[e.identity]??"";return n==="duel"?"":e.id===a.id?s:e.identity==="lord"?"主公":e.alive?"？":s}function on(e){const a=e.winnerIds.includes(0);return`<div class="match-end-overlay" role="dialog" aria-modal="true" aria-labelledby="match-end-title">
    <div class="match-end-card">
      <p class="match-end-kicker">${a?"我方勝":"敵方勝"}</p>
      <h2 id="match-end-title">${a?"勝利":"敗北"}</h2>
      <p class="match-end-msg">${f(e.resultMessage??"")}</p>
      <button type="button" class="btn primary" id="ack-match-end">下一步</button>
    </div>
  </div>`}function cn(){const e=t.game,a=Q(e),n=e.prompt,s=e.matchPhase==="pick_general",i=!!e.winnerIds,r=n.actorId===a.id&&!t.aiBusy&&!s&&!i&&!t.matchPaused,l=e.players.length,d=!i&&!t.matchPaused&&n.kind==="choice"&&n.choiceKey==="wuxie"&&n.actorId!==a.id,c=(()=>{if(i||t.matchPaused)return t.matchPaused?'<div class="thinking paused-banner">對局已暫停</div>':"";if(d)return'<div class="thinking">有角色正在考慮是否使用【無懈可擊】…</div>';if(n.actorId!==null&&n.actorId!==a.id&&(t.aiBusy||U())){const o=e.players[n.actorId],v=o!=null&&o.isHuman?"操作中":"思考中";return`<div class="thinking">${K(o.name,n.actorId)} ${v}…</div>`}return""})(),g=e.players.map(o=>({id:o.id,name:o.name,generalName:o.generalId?E(o.generalId).name:void 0})),b=i?"":d?"等待【無懈可擊】結算…":vt(e,t.selectedUid),u=t.selectedUid&&n.kind==="choose_card"?"已選取手牌 — 再點一次同一張牌以打出，或點其他牌改選":d?"等待【無懈可擊】結算…":n.message||"等待中…",y=r&&!i;return`
  <div class="screen table-screen ${i?"match-ended":""} ${t.matchPaused?"match-paused":""} ${_e(e)?"tutorial-match":""}">
    <header class="battle-top">
      <div>
        <strong>${s?"選將階段":`第 ${e.round} 輪`}</strong>
        <span class="phase">${s?"請選擇武將":fn(e.phase)}</span>
      </div>
      <div class="battle-top-right">
        <div class="deck-info">${s?`座位 ${l} 人`:`牌堆 ${e.deck.length}　棄牌 ${e.discard.length}`}</div>
        ${i?"":`<button type="button" class="btn ghost" id="pause-match">${t.matchPaused?"繼續":"暫停"}</button>`}
      </div>
    </header>
    ${c}
    <div class="arena" style="--n:${l}" id="arena">
      ${e.players.map(o=>{var I,C;const v=!!o.generalId,w=v?E(o.generalId):null,T=!s&&e.currentPlayer===o.id,x=!s&&n.kind==="choose_target"&&((I=n.targetIds)==null?void 0:I.includes(o.id))&&r,_=(o.id-a.id+l)%l,j=_/l*360+90,B=o.id===a.id?"—":String(at(e,a.id,o.id)),Y=!s&&o.id!==a.id&&o.alive&&v&&st(e,a.id,o.id)?"in-range":"",N=Te(o,a,e.config.mode),m=e.fx.damages.find(S=>S.playerId===o.id),$=Ve(o.id),k=t.settings.showPortraits&&w?`<img class="portrait ${W(w.id)==="chibi"?"chibi-on":""}" src="${G(w)}" alt="" width="48" height="48" />`:t.settings.showPortraits?'<div class="portrait portrait-empty" aria-hidden="true">？</div>':"",P=v?`<button type="button" class="info-btn" data-info-seat="${o.id}" title="詳情" aria-label="詳情">ℹ</button>`:"";return`<div class="seat-wrap" style="--angle:${j}deg;--seat-c:${$}" data-visual="${_}" data-seat-pos="${o.id}">
            <div class="seat ${o.alive?"":"dead"} ${o.facedown?"facedown":""} ${T?"active":""} ${o.id===a.id?"human":o.isHuman?"human-remote":""} ${x?"targetable":""} ${Y} ${s&&!v?"hidden-gen":""} ${m?"hurt":""}" data-seat="${o.id}" role="${x?"button":"group"}" tabindex="${x?"0":"-1"}">
              ${k}
              <div class="seat-head">
                <span class="seat-gen">${w?f(w.name):"未亮將"}</span>
                ${P}
              </div>
              <div class="seat-name">${f(o.name)}${N?`・${N}`:""}</div>
              <div class="hp">${v?bn(o.hp,o.maxHp):"—"}${(C=o.buquCards)!=null&&C.length?` 創${o.buquCards.length}`:""}${o.facedown?" 翻面":""}</div>
              <div class="equip">${v?yn(o):s?"等待選將":"無裝備"}</div>
              <div class="meta-row"><span>手牌 ${s?"—":o.hand.length}</span><span class="dist">距 ${B}</span></div>
              ${m?`<span class="dmg-float" data-dmg-seq="${m.seq}">-${m.amount}</span>`:""}
            </div>
          </div>`}).join("")}
      ${mn(e,a.id,l)}
    </div>
    ${b?`<div class="action-hint ${y?"loud":""}" role="status">${f(b)}</div>`:""}
    <div class="prompt-bar ${y?"prompt-loud":""}">${le(u,g)}</div>
    ${Ot(e)}
    ${s?un(e):""}
    ${!s&&r&&(n.kind==="choice"||n.kind==="skill_cards")?dn(e):""}
    ${!s&&r&&n.kind==="choose_card"?`<div class="skill-row">${it(e,a.id).map(o=>`<button type="button" class="btn ghost" data-skill="${o.id}" title="${f(o.hint)}">${f(o.label)}</button>`).join("")}</div>`:""}
    ${s?"":`<div class="hand">
      ${a.hand.map(o=>{var _,j;const v=M(o.defId),w=r&&!!((_=n.cardUids)!=null&&_.includes(o.uid))&&(n.kind==="choose_card"||n.kind==="discard"||n.kind==="respond_shan"||n.kind==="respond_sha"||n.kind==="skill_cards"),T=t.selectedUid===o.uid||n.kind==="skill_cards"&&!!((j=n.selectedCardUids)!=null&&j.includes(o.uid)),x=v.suit==="heart"||v.suit==="diamond";return`<div class="card-wrap">
            <button type="button" class="card ${w?"selectable":""} ${T?"selected":""} ${x?"red":"black"}" data-uid="${o.uid}" ${w?"":"disabled"}>
              <span class="csuit ${x?"red":""}">${ne(v.suit)}${J(v.rank)}</span>
              <span class="cname">${v.name}</span>
              <span class="ctype">${je(v)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${o.uid}" title="牌面說明">ℹ</button>
          </div>`}).join("")}
    </div>`}
    <div class="log" aria-live="polite">${[...e.log].slice(-8).map((o,v,w)=>`<div class="${v===w.length-1?"log-latest":""}">${le(o.text,g)}</div>`).join("")}</div>
    <div class="actions">
      <div class="actions-main">
      ${!s&&r&&n.kind==="choose_card"&&t.selectedUid?'<button type="button" class="btn ghost" id="cancel-select">取消選牌</button>':""}
      ${!s&&r&&n.kind==="choose_card"?'<button type="button" class="btn" id="end-play">結束出牌</button>':""}
      ${!s&&r&&(n.kind==="respond_shan"||n.kind==="respond_sha")?'<button type="button" class="btn" id="pass-resp">放棄</button>':""}
      ${!s&&r&&(n.kind==="choose_target"||n.kind==="skill_cards"||n.kind==="choice"&&(n.choiceKey==="fangtian_confirm"||n.choiceKey==="rende_target"||n.choiceKey==="zhangba_target"))?'<button type="button" class="btn" id="cancel-tgt">取消</button>':""}
      </div>
      <div class="actions-quit">
        <button type="button" class="btn ghost danger" id="flee">退出對局</button>
      </div>
    </div>
    ${i?on(e):""}
  </div>`}function dn(e){var l;const a=e.prompt.choices??[];if(!a.length)return"";const n=e.prompt.kind==="skill_cards",s=e.prompt.choiceKey==="zone_pick"||e.prompt.choiceKey==="guanxing_split",i=((l=e.prompt.selectedCardUids)==null?void 0:l.length)??0,r=e.prompt.minTargets??(e.prompt.choiceKey==="guanxing_split"?0:1);return`<div class="choice-panel">
    <h3>${f(e.prompt.message)}</h3>
    <div class="choice-row">
      ${a.map(d=>{var u;const c=(n||s)&&d.id==="confirm"&&i<r,g=(s||n)&&!!((u=e.prompt.selectedCardUids)!=null&&u.includes(d.id));return`<button type="button" class="${["btn",d.id==="skip"||d.id==="no"?"ghost":"primary",g?"selected-pick":""].filter(Boolean).join(" ")}" data-choice="${d.id}" ${c?"disabled":""}>${f(d.label)}</button>`}).join("")}
    </div>
  </div>`}function un(e){const a=Q(e),n=e.prompt.actorId;if(n!=null&&n!==a.id){const r=e.players[n];return`<div class="pick-panel">
    <h3>等待選將</h3>
    <p class="muted">${r?f(r.name):"其他玩家"} 正在選擇武將…</p>
  </div>`}if(a.generalId)return`<div class="pick-panel">
    <h3>已選定</h3>
    <p class="muted">你已選【${f(E(a.generalId).name)}】，等待其他玩家選將…</p>
  </div>`;const s=e.prompt.generalIds??[];return`<div class="pick-panel">
    <h3>${s.length>3?"選擇武將（全部可選）":"系統隨機三將，請選一"}</h3>
    <div class="pick-grid">
      ${s.map(r=>{const l=E(r);return`<div class="pick-card">
            ${t.settings.showPortraits?`<img class="pick-portrait ${W(l.id)==="chibi"?"chibi-on":""}" src="${G(l)}" alt="" />`:""}
            <div class="pick-name">${l.name}</div>
            <div class="pick-meta">${re(l.kingdom)}・${l.maxHp} 血</div>
            <p class="pick-skill">${f(l.skillText)}</p>
            <div class="pick-actions">
              <button type="button" class="btn ghost" data-gen-info="${r}">詳情</button>
              <button type="button" class="btn primary" data-pick-gen="${r}">選定</button>
            </div>
          </div>`}).join("")}
    </div>
  </div>`}function ge(e,a,n){const r=((e-a+n)%n/n*360+90)*Math.PI/180,l=38;return{x:50+Math.cos(r)*l,y:50+Math.sin(r)*l}}function pn(e,a){var n;if(e.fx.play)return e.fx.play;if(e.prompt.kind==="choose_target"&&((n=e.prompt.cardUids)!=null&&n[0])&&e.prompt.actorId!==null){const s=e.players[e.prompt.actorId],i=s==null?void 0:s.hand.find(r=>r.uid===e.prompt.cardUids[0]);if(i){const r=M(i.defId);return{cardName:r.name,suit:r.suit,rank:r.rank,sourceId:e.prompt.actorId,targetIds:[],note:"選擇目標",seq:0}}}return null}function mn(e,a,n){const s=pn(e);if(!s&&!e.fx.damages.length)return'<div class="arena-center" aria-hidden="true"><span>距離</span></div>';const i=!!(s&&t.fxSettledSeq===s.seq),r=s?ge(s.sourceId,a,n):null,l=s&&r?s.targetIds.filter(b=>b!==s.sourceId).map(b=>{const u=ge(b,a,n);return hn(r.x,r.y,u.x,u.y,s.seq,i)}).join(""):"",d=s&&s.targetIds.length===1&&s.targetIds[0]===s.sourceId?`<div class="fx-self-ring ${i?"fx-settled":""}" style="left:${r.x}%;top:${r.y}%"></div>`:"",c=s&&(s.suit==="heart"||s.suit==="diamond"),g=s?`<div class="fx-card ${c?"red":"black"} ${i?"fx-settled":""}" data-fx-seq="${s.seq}">
        <span class="csuit">${ne(s.suit)}${J(s.rank)}</span>
        <span class="cname">${f(s.cardName)}</span>
        ${s.note?`<span class="fx-note">${f(s.note)}</span>`:""}
      </div>`:"";return`
    <div class="arena-fx" aria-hidden="true">
      <svg class="fx-arrows" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#c4a35a" />
          </marker>
        </defs>
        ${l}
      </svg>
      ${d}
      <div class="fx-card-slot">${g||'<span class="arena-center-label">距離</span>'}</div>
    </div>`}function hn(e,a,n,s,i,r=!1){const l=n-e,d=s-a,c=Math.hypot(l,d)||1,g=Math.min(8,c*.2),b=e+l/c*g,u=a+d/c*g,y=n-l/c*g,o=s-d/c*g;return`<line class="fx-arrow-line ${r?"fx-settled":""}" data-fx-seq="${i}" x1="${b}" y1="${u}" x2="${y}" y2="${o}" marker-end="url(#arrowHead)" />`}function bn(e,a){const n=Math.max(0,e);return"●".repeat(n)+"○".repeat(Math.max(0,a-n))}function yn(e){const a=[];if(e.equips.weapon){const n=M(e.equips.weapon.defId),s=n.attackRange??1;a.push(`<span class="eq-line eq-weapon">${f(n.name)} <em>攻${s}</em></span>`)}if(e.equips.armor){const n=M(e.equips.armor.defId);a.push(`<span class="eq-line eq-armor">${f(n.name)}</span>`)}if(e.equips.horseMinus){const n=M(e.equips.horseMinus.defId);a.push(`<span class="eq-line eq-horse">-1 ${f(n.name)}</span>`)}if(e.equips.horsePlus){const n=M(e.equips.horsePlus.defId);a.push(`<span class="eq-line eq-horse">+1 ${f(n.name)}</span>`)}for(const n of e.judges??[]){const s=M(n.defId);a.push(`<span class="eq-line eq-judge">判定・${f(s.name)}</span>`)}return a.length?a.join(""):"無裝備"}function fn(e){return{prepare:"準備",judge:"判定",draw:"摸牌",play:"出牌",discard:"棄牌",end:"結束"}[e]??e}function gn(e){return{basic:"基本",trick:"錦囊",equip:"裝備"}[e]??e}function je(e){return e.slot==="weapon"?`武器・攻${e.attackRange??1}`:e.slot==="armor"?"防具":e.slot==="horseMinus"?"-1坐騎":e.slot==="horsePlus"?"+1坐騎":gn(e.type)}function vn(e){var l,d;if(!e.generalId)return`<h3>${K(e.name,e.id)}</h3><p class="muted">尚未亮出武將。</p>`;const a=E(e.generalId),n=["weapon","armor","horseMinus","horsePlus"].map(c=>{const g=e.equips[c];if(!g)return null;const b=M(g.defId);let u="";return c==="weapon"?u=`攻擊範圍 ${b.attackRange??1}`:c==="horseMinus"?u="-1 坐騎（與其他角色距離-1）":c==="horsePlus"?u="+1 坐騎（其他角色與你距離+1）":c==="armor"&&(u="防具"),`<li><strong>${f(b.name)}</strong>（${Pe(b.suit)}${J(b.rank)}）· ${u}<br/><span class="muted">${we[b.kind]??""}</span></li>`}).filter(Boolean).join(""),s=t.game;let i="";s&&(s.config.mode==="identity5"||s.config.mode==="identity8")&&(i=rt(s,e.id),t.settings.showAiDebug||(i=i.replace(/<p class="mind-thought">[\s\S]*?<\/p>/,"")));const r=s&&(()=>{const c=s.players.find(b=>b.isHuman);if(!c)return"";const g=Te(e,c,s.config.mode);return g?`<p class="muted">公開身份資訊：${g}</p>`:""})();return`<h3>${K(a.name,e.id)} <span class="muted">·</span> ${K(e.name,e.id)}</h3>
    <p class="muted">${re(a.kingdom)}・${a.maxHp} 血・${a.gender==="female"?"女":"男"}</p>
    ${r??""}
    <h4>武將技</h4>
    <p>${f(a.skillText)}</p>
    ${(l=e.huashenCards)!=null&&l.length?`<h4>化身</h4><p>${e.huashenCards.map(c=>{try{return`【${E(c).name}】`}catch{return c}}).join("、")}${e.huashenGeneralId?`　目前：【${(()=>{try{return E(e.huashenGeneralId).name}catch{return e.huashenGeneralId}})()}】${(d=e.extraSkills)!=null&&d.length?`（${e.extraSkills.map(c=>c).join("、")}）`:""}`:""}</p>`:""}
    <h4>裝備</h4>
    ${n?`<ul class="detail-list">${n}</ul>`:'<p class="muted">無</p>'}
    ${i}`}function $n(e){const a=E(e);return`<h3>${a.name}</h3>
    <p class="muted">${re(a.kingdom)}・體力上限 ${a.maxHp}・${a.gender==="female"?"女":"男"}</p>
    <h4>武將技</h4>
    <p>${f(a.skillText)}</p>`}function kn(e,a){const n=a.hand.find(i=>i.uid===e);if(!n)return"<p>找不到此牌</p>";const s=M(n.defId);return`<h3>${s.name}</h3>
    <p>${ne(s.suit)} ${Pe(s.suit)} ${J(s.rank)}　·　${je(s)}</p>
    <p>${we[s.kind]??"暫無說明。"}</p>`}async function L(){var a;const e=t.game;if(!(!e||t.aiBusy||t.matchPaused)&&e.matchPhase!=="pick_general"){if(e.fx.play||e.fx.damages.length){t.aiBusy=!0,h();const n=Math.min(Math.max(t.settings.thinkDelayMs,500),1e3);if(await new Promise(s=>setTimeout(s,n)),t.matchPaused){t.aiBusy=!1,h();return}ve(e)&&!e.winnerIds&&oe(e),t.aiBusy=!1,h()}if(e.winnerIds){$e(),h();return}if(!t.matchPaused){t.aiBusy=!0,h();try{if(U()&&!t.lobbyVm.isHost)return;await se(e,()=>{var n;t.screen==="table"&&t.game===e&&h(),U()&&t.lobbyVm.isHost&&t.game&&((n=t.mpClient)==null||n.send({type:"host_match",match:t.game}))},()=>t.matchPaused)}finally{t.aiBusy=!1}if(U()&&t.lobbyVm.isHost&&t.game&&((a=t.mpClient)==null||a.send({type:"host_match",match:t.game})),t.matchPaused){h();return}ve(e)&&!e.winnerIds&&oe(e),$e(),h()}}}function ve(e){const a=e.prompt.kind;return a==="choose_card"||a==="discard"||a==="game_over"||a==="idle"||a==="choose_general"}function In(){const e=p().querySelector(".log");if(!e)return;const a=e.querySelector(".log-latest");a&&a.scrollIntoView({block:"nearest",behavior:"instant"}),e.scrollTop=e.scrollHeight}function Sn(){var n,s,i,r,l,d,c,g,b;const e=t.game,a=Q(e);(n=p().querySelector("#coach-next"))==null||n.addEventListener("click",()=>{const u=Le(e.config.campaignStageId);t.coachSlide+1>=u.length?t.coachSlide=-1:t.coachSlide+=1,h()}),(s=p().querySelector("#coach-skip"))==null||s.addEventListener("click",()=>{t.coachSlide=-1,h()}),p().querySelectorAll("[data-choice]").forEach(u=>{u.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choice"&&e.prompt.kind!=="skill_cards"||e.prompt.actorId!==a.id)return;const y=u.dataset.choice;H(e,{type:"choice",choiceId:y}),L()})}),p().querySelectorAll("[data-skill]").forEach(u=>{u.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choose_card"||e.prompt.actorId!==a.id)return;const y=u.dataset.skill;H(e,{type:"skill",skillId:y}),t.selectedUid=null,L()})}),p().querySelectorAll("[data-gen-info]").forEach(u=>{u.addEventListener("click",()=>{const y=u.dataset.genInfo;t.detailHtml=$n(y),h()})}),p().querySelectorAll("[data-pick-gen]").forEach(u=>{u.addEventListener("click",()=>{if(e.prompt.kind!=="choose_general"||e.prompt.actorId!==a.id||a.generalId)return;const y=u.dataset.pickGen;H(e,{type:"pick_general",generalId:y}),t.detailHtml=null,h(),L()})}),p().querySelectorAll("[data-info-seat]").forEach(u=>{u.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const o=Number(u.dataset.infoSeat);t.detailHtml=vn(e.players[o]),h()})}),p().querySelectorAll("[data-info-card]").forEach(u=>{u.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const o=u.dataset.infoCard;t.detailHtml=kn(o,a),h()})}),p().querySelectorAll(".card.selectable").forEach(u=>{u.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=u.dataset.uid;if(e.prompt.kind==="choose_card"){if(t.selectedUid!==y){t.selectedUid=y,h();return}H(e,{type:"select_card",uid:y}),t.selectedUid=null,L();return}if(e.prompt.kind==="skill_cards"){H(e,{type:"select_card",uid:y}),h();return}H(e,{type:"select_card",uid:y}),t.selectedUid=null,L()})}),(i=p().querySelector("#cancel-select"))==null||i.addEventListener("click",()=>{t.selectedUid=null,h()}),p().querySelectorAll(".seat.targetable").forEach(u=>{u.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=Number(u.dataset.seat);H(e,{type:"select_target",seatId:y}),L()})}),(r=p().querySelector("#end-play"))==null||r.addEventListener("click",()=>{t.aiBusy||(H(e,{type:"end_play"}),L())}),(l=p().querySelector("#pass-resp"))==null||l.addEventListener("click",()=>{t.aiBusy||(H(e,{type:"pass_response"}),L())}),(d=p().querySelector("#cancel-tgt"))==null||d.addEventListener("click",()=>{H(e,{type:"cancel_target"}),h()}),(c=p().querySelector("#ack-match-end"))==null||c.addEventListener("click",()=>{t.matchEndPending=!1,t.screen=t.stage?"epilogue":"result",h()}),(g=p().querySelector("#pause-match"))==null||g.addEventListener("click",()=>{if(t.matchPaused){t.matchPaused=!1,h(),L();return}t.matchPaused=!0,h()}),(b=p().querySelector("#flee"))==null||b.addEventListener("click",()=>{window.confirm("確定要退出對局嗎？進度不會保存。")&&(t.game=null,t.aiBusy=!1,t.matchEndPending=!1,t.matchPaused=!1,t.screen=t.stage?"story":"start",h())})}function $e(){const e=t.game;if(!(e!=null&&e.winnerIds)){t.matchEndPending=!1;return}if(!t.matchEndPending){const a=e.winnerIds.includes(0);if(ht({won:a,identity:e.config.mode==="identity5"||e.config.mode==="identity8"}),e.config.campaignStageId&&a){const n=qe(e.config.campaignStageId);if(n){Ge(n.campaign.id,n.stage.index),bt();const s=[];if(Je(n.campaign.id)&&n.stage.index>=n.campaign.stages.length){const i=n.campaign.id.slice(3),r=E(i);yt(i,Ce)&&s.push({kind:"skin",title:"解鎖 Q 版造型",detail:`${r.name}・簡單 Q 版角色樣`,generalId:i})}O(n.campaign.id)&&n.stage.index>=n.campaign.stages.length&&ft(),s.push(...ue()),t.unlockBanners=s}}else a&&(t.unlockBanners=ue());t.matchEndPending=!0}}function qn(){var l;const e=t.stage,a=t.game,n=!!((l=a.winnerIds)!=null&&l.includes(0)),s=ze(e,a),i=f(s).split(/\n+/).filter(Boolean).map(d=>`<p>${d}</p>`).join(""),r=ke({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds});return`
  <div class="screen story-brief-screen epilogue-screen">
    <header class="topbar story-brief-top">
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${n?"戰後・勝":"戰後・敗"}・${f(e.era)}</p>
        <h2>${e.title}</h2>
      </div>
    </header>
    ${r}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="戰後劇情">
        <div class="story-hand">${i}</div>
      </div>
      <div class="panel story-ready">
        <button type="button" class="btn primary" id="epilogue-next">下一步</button>
      </div>
    </div>
  </div>`}function En(){var e;(e=p().querySelector("#epilogue-next"))==null||e.addEventListener("click",()=>{t.screen="result",h()})}function wn(){var i;const e=t.game,a=(i=e.winnerIds)==null?void 0:i.includes(0),n=t.unlockBanners,s=n.length?`<ul class="unlock-list">${n.map(r=>{const l=r.kind==="skin"&&r.generalId?`<img class="unlock-chibi" src="${te(E(r.generalId))}" alt="" />`:"";return`<li class="unlock-item ${r.kind}">${l}<div><strong>${f(r.title)}</strong><span>${f(r.detail)}</span></div></li>`}).join("")}</ul>`:"";return`
  <div class="screen panel-screen result-screen">
    <h2>${a?"勝利":"敗北"}</h2>
    <p>${f(e.resultMessage??"")}</p>
    ${s}
    <div class="cta-row">
      <button type="button" class="btn primary" id="again">再來一局</button>
      <button type="button" class="btn" id="home">回首頁</button>
      ${t.stage?`<button type="button" class="btn" id="story">${t.storyKind==="liezhuan"?"列傳關卡":"關卡列表"}</button>`:""}
    </div>
  </div>`}function Pn(){var e,a,n;(e=p().querySelector("#home"))==null||e.addEventListener("click",()=>{t.game=null,t.stage=null,t.unlockBanners=[],t.screen="start",h()}),(a=p().querySelector("#story"))==null||a.addEventListener("click",()=>{t.game=null,t.unlockBanners=[],t.screen="story",h()}),(n=p().querySelector("#again"))==null||n.addEventListener("click",()=>{if(t.unlockBanners=[],t.stage){t.screen="stage",h();return}t.screen="setup",h()})}function f(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{Mn as s};
