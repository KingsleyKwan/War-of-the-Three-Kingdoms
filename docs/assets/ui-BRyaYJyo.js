import{g as H,i as je,h as te,a as P,j as Be,r as $e,s as ze,k as D,e as le,m as ne,o as G,p as Ie,q as Ve,l as Z,t as Se,f as ee,C as Ue,u as Fe,v as O,w as qe,P as Ee,d as R,x as Pe,y as we,z as Ne,B as Re,D as Oe,T as Ke,E as De,F as Ge}from"./data-BJ1vRtvR.js";import{k as We,a as Je,r as Qe,f as Ye,p as Xe,e as Ze,s as et,b as tt,m as nt,n as at,l as st,d as oe,o as ae}from"./engine-CUEDVCV-.js";import{r as se,f as it}from"./ai-tmQigXHP.js";import{$ as ce}from"./vendor-DvnuzqsD.js";import{l as rt,g as W,a as lt,b as ot,i as ct,h as de,s as dt,c as ut,m as xe,d as pt,r as mt,e as ht,u as yt,f as bt,j as ue,C as Le}from"./persist-ZhkrWjrH.js";const ft={tutorial_01:[{title:"座位與體力",body:"周圍是各座位。紅心是體力。你永遠在畫面靠近自己的一側。點座位上的 ℹ 可看武將技能。"},{title:"手牌區",body:"底部一排是你的手牌。亮起、可點的牌才是現在能用的。點 ℹ 看牌面說明。"},{title:"出【殺】",body:"出牌階段點一張【殺】（再點一次打出），然後點亮起的敵方座位作為目標。對方可出【閃】抵消。"},{title:"結束與棄牌",body:"不想再出牌就按「結束出牌」。手牌多過體力上限時，要棄到上限。完成後輪到對手。"}],tutorial_02:[{title:"裝備區",body:"座位上「裝備」那一行就是裝備區。本關你已戴上【諸葛連弩】：攻擊範圍 1，但一回合可出多張【殺】。"},{title:"錦囊",body:"【無中生有】摸兩張；【過河拆橋】選一名角色，棄其手牌或裝備（手牌背面看不見內容）。錦囊多數無距離限制。"},{title:"再出殺",body:"有連弩時，出完一張【殺】後仍可再出【殺】。打完按「結束出牌」。"}],tutorial_03:[{title:"瀕死",body:"體力到 0 會問全場是否出【桃】。救到體力大於 0 才活。問到你時，亮起的【桃】點兩下打出。"},{title:"這一關",body:"雙方體力都很低。你可用【殺】先手；自己受傷時記得留【桃】。華佗的紅牌也可當桃（技能詳見 ℹ）。"}]};function Ce(e){return e?ft[e]??[]:[]}function _e(e){return!!e&&je(e.config.campaignStageId)}function gt(e,a){const n=e.prompt,s=e.players.find(i=>i.isHuman);if(!s||e.winnerIds)return"";if(e.matchPhase==="pick_general")return"請點選一名武將，確認後開局";if(n.actorId!==s.id)return"等待其他角色行動…";switch(n.kind){case"choose_card":{if(a){const i=s.hand.find(l=>l.uid===a);return`已選【${i?H(i.defId).name:"此牌"}】— 再點同一張打出，或點其他牌改選`}return e.phase==="play"?"出牌階段：點亮起的手牌使用，或按「結束出牌」":n.message||"請選擇一張牌"}case"choose_target":return"請點亮起、會閃爍的座位作為目標";case"respond_shan":return"需要【閃】：點亮起的【閃】打出，或按「放棄」承受傷害";case"respond_sha":return"需要【殺】：點亮起的【殺】打出，或按「放棄」";case"discard":return`棄牌階段：點選要棄的牌（需棄 ${n.discardCount??""} 張）`;case"choice":return n.message||"請在上方選項中點選";case"skill_cards":return n.message||"請依技能選擇牌，再按確認";default:return n.message||""}}function vt(e){return Array.from({length:e},(a,n)=>({id:n,type:"empty",name:"",ready:!1}))}function kt(e){return e.find(a=>a.type==="empty")}function K(){return{room:null,localName:"",joinCode:"",error:null,isHost:!1,myClientId:null}}function $t(e,a,n,s){const i=vt(n);return i[0]={id:0,type:"human",name:a,clientId:e,ready:!0},{roomId:It(),hostClientId:e,maxPlayers:n,status:"lobby",seats:i}}function It(e=4){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let n="";for(let s=0;s<e;s++)n+=a[Math.floor(Math.random()*a.length)];return n}function St(e){const a=e.seats.map(n=>n.type==="empty"?{...n,type:"ai",name:`電腦${n.id+1}`,ready:!0}:n);return{...e,seats:a}}function He(e){return e.filter(a=>a.type==="human").length}function qt(e,a){return a&&e.status==="lobby"&&He(e.seats)>=1}function Et(e){const{room:a,localName:n,joinCode:s,error:i,isHost:r}=e;if(!a)return`
    <div class="screen lobby-screen">
      <div class="topbar">
        <button type="button" class="btn ghost" data-go="start">返回</button>
        <h2>多人對戰</h2>
      </div>
      ${i?`<p class="lobby-error">${B(i)}</p>`:""}
      <div class="panel lobby-panel">
        <label class="field">你的名字
          <input type="text" id="lobby-name" maxlength="8" value="${pe(n)}" placeholder="例如：主公" />
        </label>
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="lobby-create-5">開 5 人房</button>
          <button type="button" class="btn primary" id="lobby-create-8">開 8 人房</button>
        </div>
        <hr class="settings-sep" />
        <label class="field">輸入房號加入
          <input type="text" id="lobby-code" maxlength="6" value="${pe(s)}" placeholder="例如：K7P2" style="text-transform:uppercase" />
        </label>
        <button type="button" class="btn" id="lobby-join">加入房間</button>
      </div>
      <p class="hint">人數不足會用電腦補位。房主開始後即開局。<br/>連線：PeerJS（無需自架伺服器）</p>
    </div>`;const l=a.seats.map(o=>{const d=o.type==="human"?`${B(o.name)}${o.ready?" · 已準備":""}`:o.type==="ai"?"電腦":"等待中…";return`<li class="lobby-seat ${o.type==="human"?"seat-human":o.type==="ai"?"seat-ai":"seat-empty"}"><span class="idx">${o.id+1}</span> ${d}</li>`}).join("");return`
  <div class="screen lobby-screen">
    <div class="topbar">
      <button type="button" class="btn ghost" id="lobby-leave">離開</button>
      <h2>房間 ${B(a.roomId)}</h2>
    </div>
    ${i?`<p class="lobby-error">${B(i)}</p>`:""}
    <div class="panel lobby-panel">
      <p class="lobby-code-row">
        房號 <strong class="lobby-code">${B(a.roomId)}</strong>
        <button type="button" class="btn ghost" id="lobby-copy">複製</button>
      </p>
      <ul class="lobby-seats">${l}</ul>
      <div class="lobby-actions">
        ${r?`<button type="button" class="btn primary" id="lobby-start" ${qt(a,!0)?"":"disabled"}>開始遊戲</button>`:'<p class="hint">等待房主開始…</p>'}
      </div>
    </div>
    <p class="hint">目前 ${He(a.seats)} 人 · 上限 ${a.maxPlayers} · 空位開局時會變電腦</p>
  </div>`}function B(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function pe(e){return B(e).replace(/'/g,"&#39;")}const z={};function ie(){const e="wtk_mp_client_id";try{let a=sessionStorage.getItem(e);return a||(a="c_"+Math.random().toString(36).slice(2,10),sessionStorage.setItem(e,a)),a}catch{return"c_"+Math.random().toString(36).slice(2,10)}}const me=(z==null?void 0:z.VITE_PARTYKIT_HOST)??"",Pt=(z==null?void 0:z.VITE_MP_OFFLINE)==="1",he={host:"0.peerjs.com",port:443,path:"/",secure:!0,debug:1,config:{iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]}};function wt(e){return"wtk-"+e.trim().toUpperCase()}function U(e){if(!e)return"連線失敗";const a=e,n=a.type||"",s=a.message||String(e);return n==="peer-unavailable"||/unavailable/i.test(s)?"搵唔到房主（房號錯誤，或房主尚未準備好／已離開）。請等房主開好房再加入。":n==="network"||/network/i.test(s)?"網絡錯誤，請檢查網絡後重試":n==="server-error"||n==="socket-error"?"PeerJS 雲端暫時不可用，請稍後再試":n==="unavailable-id"?"房號被佔用，請重新開房":s||"連線失敗"}function xt(){return Pt?_t():me?Ct(me):Lt()}function Lt(){const e=ie();let a=null,n=null,s=!1,i=!1,r=null,l="";const o=new Map;let d=null;const g=[];let f=!1,h=Promise.resolve();function y(p){f||a==null||a(p)}function c(p){y(p);for(const v of o.values())if(v.open)try{v.send(p)}catch{}}function $(p){if(!r)return;const v=r.seats.find(k=>k.clientId===p);v&&(v.type="empty",v.name="",v.clientId=void 0,v.ready=!1,r={...r,seats:[...r.seats]},c({type:"room",room:r}))}function w(p){p.on("data",v=>{var E,I,x;const k=v;if(!(!k||typeof k!="object")){if(k.type==="join"){if(!r||r.status!=="lobby"){try{p.send({type:"error",message:"無法加入（房間已開局或不存在）"})}catch{}return}const S=kt(r.seats);if(!S){try{p.send({type:"error",message:"房間已滿"})}catch{}return}const q=k,M=q.clientId||p.peer;S.type="human",S.name=q.name||"玩家",S.clientId=M,S.ready=!1,o.set(M,p),r={...r,seats:[...r.seats]},c({type:"room",room:r});return}if(k.type==="action"){const S=((E=[...o.entries()].find(([,q])=>q===p))==null?void 0:E[0])??p.peer;y({type:"remote_action",clientId:S,action:k.action});return}if(k.type==="leave"){const S=((I=[...o.entries()].find(([,q])=>q===p))==null?void 0:I[0])??p.peer;o.delete(S),$(S);return}if(k.type==="ready"&&r){const S=((x=[...o.entries()].find(([,M])=>M===p))==null?void 0:x[0])??p.peer,q=r.seats.find(M=>M.clientId===S);q&&(q.ready=!!k.ready,r={...r,seats:[...r.seats]},c({type:"room",room:r}))}}}),p.on("close",()=>{var k;const v=((k=[...o.entries()].find(([,E])=>E===p))==null?void 0:k[0])??p.peer;o.delete(v),$(v)})}function T(p){if(s){if(p.type==="host_room"){r=p.room,c({type:"room",room:p.room});return}if(p.type==="host_match"){r&&(r={...r,status:"playing",match:p.match}),c({type:"match",match:p.match});return}if(p.type==="leave"){C(),y({type:"error",message:"已離開房間"});return}return}if(d!=null&&d.open){if(p.type==="join"){const v={type:"join",name:p.name,clientId:e};d.send(v);return}d.send(p)}}function C(){f=!0,i=!1;try{d==null||d.close()}catch{}d=null;for(const p of o.values())try{p.close()}catch{}o.clear();try{n==null||n.destroy()}catch{}n=null,r=null,l="",g.length=0}function A(p){return new Promise((v,k)=>{const E=setTimeout(()=>k(new Error("Peer 連線逾時（無法連上 PeerJS 雲端）")),2e4),I=q=>{clearTimeout(E),S(),v(q)},x=q=>{clearTimeout(E),S(),k(new Error(U(q)))},S=()=>{p.off("open",I),p.off("error",x)};p.on("open",I),p.on("error",x)})}function j(p,v){return new Promise((k,E)=>{let I=!1;const x=setTimeout(()=>{I||(I=!0,N(),E(new Error("無法連上房主（逾時）。請確認：① 房號完全一致 ② 房主畫面仍開著且已顯示房號 ③ 兩邊都有網絡。然後再試一次。")))},2e4),S=()=>{I||(I=!0,clearTimeout(x),N(),k())},q=X=>{I||(I=!0,clearTimeout(x),N(),E(new Error(U(X))))},M=X=>{I||(I=!0,clearTimeout(x),N(),E(new Error(U(X))))},N=()=>{v.off("open",S),v.off("error",q),p.off("error",M)};if(v.open){S();return}v.on("open",S),v.on("error",q),p.on("error",M)})}async function Q(p){n=new ce(he),await A(n);const v=()=>{const k=n.connect(p,{reliable:!0});return j(n,k).then(()=>k)};try{d=await v()}catch(k){const E=k instanceof Error?k.message:"";if(/搵唔到房主|unavailable|逾時/i.test(E)){await new Promise(I=>setTimeout(I,1500));try{d=await v()}catch(I){throw I}}else throw k}s=!1,d.on("data",k=>{try{y(k)}catch{}}),d.on("close",()=>{y({type:"error",message:"房主已斷線，房間關閉"})}),n.on("error",k=>{y({type:"error",message:U(k)})})}async function Y(p){if(i)return;if(!l)throw new Error("尚未 connect");const v=wt(l);if(p.type==="host_room"||p.type==="host_match"){n=new ce(v,he),await A(n),s=!0,n.on("connection",w),n.on("disconnected",()=>{try{n==null||n.reconnect()}catch{y({type:"error",message:"連線已中斷"})}}),n.on("error",k=>{y({type:"error",message:U(k)})}),i=!0;return}if(p.type==="join"){await Q(v),i=!0;return}}async function F(){for(;g.length;){const p=g[0];if(!i)try{await Y(p)}catch(v){g.shift(),y({type:"error",message:v instanceof Error?v.message:"連線失敗"}),C(),f=!1;return}if(!i)return;g.shift(),T(p)}}return{clientId:e,isOnline:!0,async connect(p){f=!1,l=p.trim().toUpperCase(),i=!1,s=!1},disconnect(){C(),f=!1},send(p){g.push(p),h=h.then(()=>F()).catch(()=>{})},onMessage(p){a=p}}}function Ct(e){const a=ie();let n=null,s=null;return{clientId:a,isOnline:!0,async connect(i){const r=`wss://${e}/parties/main/${encodeURIComponent(i)}?clientId=${encodeURIComponent(a)}`;n=new WebSocket(r),await new Promise((l,o)=>{if(!n)return o(new Error("no socket"));n.onopen=()=>l(),n.onerror=()=>o(new Error("WebSocket failed"))}),n.onmessage=l=>{try{const o=JSON.parse(String(l.data));s==null||s(o)}catch{}},n.onclose=()=>{s==null||s({type:"error",message:"連線已中斷"})}},disconnect(){n==null||n.close(),n=null},send(i){(n==null?void 0:n.readyState)===WebSocket.OPEN&&n.send(JSON.stringify(i))},onMessage(i){s=i}}}function _t(){const e=ie();let a=null,n=null;return{clientId:e,isOnline:!1,async connect(){},disconnect(){n=null},send(s){if(s.type==="join"&&n){const i=n.seats.find(r=>r.type==="empty");if(!i){a==null||a({type:"error",message:"房間已滿"});return}i.type="human",i.name=s.name||"玩家",i.clientId=e,i.ready=!1,a==null||a({type:"room",room:{...n,seats:[...n.seats]}});return}if(s.type==="leave"){n=null,a==null||a({type:"error",message:"已離開房間"});return}if(s.type==="host_room"){n=s.room,a==null||a({type:"room",room:s.room});return}if(s.type==="host_match"){n&&(n={...n,status:"playing",match:s.match}),a==null||a({type:"match",match:s.match});return}s.type==="start"&&n&&(a==null||a({type:"room",room:{...n,status:"playing"}}))},onMessage(s){a=s}}}function Me(e,a,n){switch(n.type){case"select_card":tt(e,a,n.uid);break;case"select_target":et(e,a,n.seatId);break;case"end_play":Ze(e,a);break;case"pass_response":Xe(e,a);break;case"cancel_target":Ye(e,a);break;case"choice":Qe(e,a,n.choiceId);break;case"skill":Je(e,a,n.skillId);break;case"pick_general":We(e,n.generalId,a);break}}function Ht(e){if(!e||typeof e!="object")return null;const a=e;if(typeof a.type!="string")return null;switch(a.type){case"select_card":return typeof a.uid=="string"?{type:"select_card",uid:a.uid}:null;case"select_target":return typeof a.seatId=="number"?{type:"select_target",seatId:a.seatId}:null;case"end_play":return{type:"end_play"};case"pass_response":return{type:"pass_response"};case"cancel_target":return{type:"cancel_target"};case"choice":return typeof a.choiceId=="string"?{type:"choice",choiceId:a.choiceId}:null;case"skill":return typeof a.skillId=="string"?{type:"skill",skillId:a.skillId}:null;case"pick_general":return typeof a.generalId=="string"?{type:"pick_general",generalId:a.generalId}:null;default:return null}}const Mt="0.17.0",t={screen:"start",setupMode:"duel",campaignId:null,storyKind:"campaign",stage:null,allyChoice:null,game:null,selectedUid:null,settings:rt(),detailHtml:null,aiBusy:!1,fxSettledSeq:null,matchEndPending:!1,matchPaused:!1,unlockBanners:[],liezhuanFilter:"all",coachSlide:0,lobbyVm:K(),mpClient:null,localSeatId:null},u=()=>document.querySelector("#app");function J(e){return t.localSeatId!=null&&e.players[t.localSeatId]?e.players[t.localSeatId]:e.players.find(a=>a.isHuman)??e.players[0]}function V(){return t.mpClient!=null&&t.lobbyVm.room!=null}function _(e,a){var s,i;const n=J(e);if(V()&&!t.lobbyVm.isHost){(s=t.mpClient)==null||s.send({type:"action",action:a});return}Me(e,n.id,a),V()&&t.lobbyVm.isHost&&((i=t.mpClient)==null||i.send({type:"host_match",match:e}))}function Cn(){m()}function m(){var n,s,i,r;const e=u();switch(t.screen){case"start":e.innerHTML=jt(),Bt();break;case"lobby":e.innerHTML=Et(t.lobbyVm),Ut();break;case"setup":e.innerHTML=Qt(),Yt();break;case"settings":e.innerHTML=Wt(),Jt();break;case"story":e.innerHTML=Zt(),en();break;case"liezhuan":e.innerHTML=Rt(),Kt();break;case"achievements":e.innerHTML=Dt(),Gt();break;case"stage":e.innerHTML=tn(),nn();break;case"table":e.innerHTML=rn(),kn(),vn();break;case"epilogue":e.innerHTML=$n(),In();break;case"result":e.innerHTML=Sn(),qn();break}t.detailHtml&&(e.insertAdjacentHTML("beforeend",At(t.detailHtml)),(n=u().querySelector("#detail-close"))==null||n.addEventListener("click",()=>{t.detailHtml=null,m()}),(s=u().querySelector("#detail-backdrop"))==null||s.addEventListener("click",()=>{t.detailHtml=null,m()}));const a=(r=(i=t.game)==null?void 0:i.fx.play)==null?void 0:r.seq;a!==void 0?requestAnimationFrame(()=>{var l,o;((o=(l=t.game)==null?void 0:l.fx.play)==null?void 0:o.seq)===a&&(t.fxSettledSeq=a)}):t.fxSettledSeq=null}function At(e){return`<div class="modal-backdrop" id="detail-backdrop"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-body">${e}</div>
    <button type="button" class="btn primary" id="detail-close">關閉</button>
  </div>`}function Tt(){return pt().asked?"":`<div class="modal-backdrop" id="tut-ask-backdrop"></div>
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
  </div>`}function jt(){return`
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
      <p class="version" id="app-version">v${Mt}</p>
    </div>
    ${Tt()}
  </div>`}function ye(){xe(),t.storyKind="campaign",t.campaignId=Ke,t.screen="story",m()}function Bt(){var e,a;(e=u().querySelector("#tut-yes"))==null||e.addEventListener("click",()=>ye()),(a=u().querySelector("#tut-later"))==null||a.addEventListener("click",()=>{xe(),m()}),u().querySelectorAll("[data-go]").forEach(n=>{n.addEventListener("click",()=>{const s=n.dataset.go;if(s==="tutorial"){ye();return}s==="story"&&(t.storyKind="campaign",t.campaignId=null),s==="liezhuan"&&(t.storyKind="liezhuan",t.campaignId=null),t.screen=s,m()})})}function zt(e){var n,s,i;const a=t.mpClient;if(a)if(e.type==="room"){t.lobbyVm.room=e.room,t.lobbyVm.isHost=e.room.hostClientId===a.clientId,t.lobbyVm.error=null;const r=e.room.seats.find(l=>l.clientId===a.clientId);t.localSeatId=r?r.id:t.localSeatId,e.room.status==="playing"&&e.room.match&&(t.game=e.room.match,t.screen="table"),m()}else if(e.type==="match")t.game=e.match,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.aiBusy=!1,t.stage=null,t.screen="table",m(),t.lobbyVm.isHost&&t.game&&se(t.game,()=>{t.screen==="table"&&m()});else if(e.type==="remote_action"){if(!t.lobbyVm.isHost||!t.game)return;const r=(n=t.lobbyVm.room)==null?void 0:n.seats.find(g=>g.clientId===e.clientId);if(!r||r.type!=="human")return;const l=Ht(e.action);if(!l)return;const o=t.game,d=o.prompt.actorId;if(o.matchPhase!=="pick_general"&&d!==null&&d!==r.id)return;Me(o,r.id,l),(s=t.mpClient)==null||s.send({type:"host_match",match:o}),L()}else e.type==="error"&&(t.lobbyVm.error=e.message,(e.message.includes("離開")||e.message.includes("關閉"))&&((i=t.mpClient)==null||i.disconnect(),t.mpClient=null,t.lobbyVm=K(),t.localSeatId=null,t.screen="start"),m())}function be(){return t.mpClient||(t.mpClient=xt(),t.mpClient.onMessage(zt)),t.mpClient}function Vt(){var n,s,i;if(!t.lobbyVm.room||!t.lobbyVm.isHost)return;const e=St(t.lobbyVm.room),a=e.maxPlayers>=8?"identity8":"identity5";try{const r=Oe({mode:a,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral,seats:e.seats.map(d=>({name:d.name,isHuman:d.type==="human"}))}),l=ae(r),o={...e,status:"playing",match:l};t.lobbyVm.room=o,t.game=l,t.localSeatId=((n=e.seats.find(d=>{var g;return d.clientId===((g=t.mpClient)==null?void 0:g.clientId)}))==null?void 0:n.id)??0,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,(s=t.mpClient)==null||s.send({type:"host_room",room:o}),(i=t.mpClient)==null||i.send({type:"host_match",match:l}),t.screen="table",m(),se(l,()=>{var d;t.screen==="table"&&m(),t.lobbyVm.isHost&&t.game&&((d=t.mpClient)==null||d.send({type:"host_match",match:t.game}))})}catch(r){t.lobbyVm.error=r instanceof Error?r.message:"開局失敗",m()}}function Ut(){var i,r,l,o,d,g,f;const e=t.lobbyVm;(i=u().querySelector('[data-go="start"]'))==null||i.addEventListener("click",()=>{var h;(h=t.mpClient)==null||h.disconnect(),t.mpClient=null,t.lobbyVm=K(),t.localSeatId=null,t.screen="start",m()});const a=u().querySelector("#lobby-name"),n=u().querySelector("#lobby-code"),s=h=>{const y=(a==null?void 0:a.value.trim())||"房主",c=be(),$=$t(c.clientId,y,h);t.lobbyVm={...e,localName:y,room:null,isHost:!0,myClientId:c.clientId,error:c.isOnline?"正在建立房間（連線 PeerJS）…":"本地預覽模式（VITE_MP_OFFLINE=1）"},t.localSeatId=0,m(),c.connect($.roomId),c.send({type:"host_room",room:$})};(r=u().querySelector("#lobby-create-5"))==null||r.addEventListener("click",()=>s(5)),(l=u().querySelector("#lobby-create-8"))==null||l.addEventListener("click",()=>s(8)),(o=u().querySelector("#lobby-join"))==null||o.addEventListener("click",()=>{const h=(a==null?void 0:a.value.trim())||"玩家",y=((n==null?void 0:n.value)||"").trim().toUpperCase();if(!y){t.lobbyVm.error="請輸入房號",m();return}const c=be();t.lobbyVm={...e,localName:h,joinCode:y,isHost:!1,myClientId:c.clientId,error:c.isOnline?`正在加入房間 ${y}…`:"本地預覽模式無法真正加入其他房間"},m(),c.connect(y).then(()=>{c.send({type:"join",name:h})})}),(d=u().querySelector("#lobby-copy"))==null||d.addEventListener("click",()=>{var y,c;const h=(y=t.lobbyVm.room)==null?void 0:y.roomId;h&&((c=navigator.clipboard)==null||c.writeText(h))}),(g=u().querySelector("#lobby-leave"))==null||g.addEventListener("click",()=>{var h,y;(h=t.mpClient)==null||h.send({type:"leave"}),(y=t.mpClient)==null||y.disconnect(),t.mpClient=null,t.lobbyVm=K(),t.localSeatId=null,t.screen="start",m()}),(f=u().querySelector("#lobby-start"))==null||f.addEventListener("click",()=>{Vt()})}function Ft(e){var r,l,o;const a=e.setup;if(!a)return"";const n=[],s=a.player;(r=s==null?void 0:s.equipKinds)!=null&&r.length&&n.push(`你裝備：${s.equipKinds.join("、")}`),(l=s==null?void 0:s.handKinds)!=null&&l.length&&n.push(`你指定手牌：${s.handKinds.join("、")}`),(s==null?void 0:s.handCount)!=null&&n.push(`你手牌數 ${s.handCount}`),((s==null?void 0:s.hp)!=null||(s==null?void 0:s.maxHp)!=null)&&n.push(`你體力 ${s.hp??s.maxHp}/${s.maxHp??s.hp}`);const i=a.enemies;return((i==null?void 0:i.hp)!=null||(i==null?void 0:i.maxHp)!=null)&&n.push(`敵體力 ${i.hp??i.maxHp}/${i.maxHp??i.hp}`),(o=i==null?void 0:i.equipKinds)!=null&&o.length&&n.push(`敵裝備：${i.equipKinds.join("、")}`),n.length?`<p class="intel-pack">特殊開局：${n.map(b).join("　·　")}</p>`:""}function Nt(e){if(!_e(e)||t.coachSlide<0||e.winnerIds)return"";const a=Ce(e.config.campaignStageId);if(!a.length||t.coachSlide>=a.length)return"";const n=a[t.coachSlide],s=a.length,i=t.coachSlide>=s-1;return`<div class="coach-layer" role="dialog" aria-modal="true">
    <div class="coach-box">
      <p class="coach-kicker">教學 ${t.coachSlide+1}/${s}</p>
      <h3>${b(n.title)}</h3>
      <p>${b(n.body)}</p>
      <div class="coach-actions">
        <button type="button" class="btn primary" id="coach-next">${i?"開始實戰":"下一步"}</button>
        <button type="button" class="btn ghost" id="coach-skip">略過本關講解</button>
      </div>
    </div>
  </div>`}function fe(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function Rt(){const e=Z().filter(i=>t.liezhuanFilter==="all"?!0:i.kingdom===t.liezhuanFilter),a=["all","wei","shu","wu","qun"],n=Z().filter(i=>de(i.id)).length,s=Z().length;return`
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
      ${e.map(i=>{const r=Se(i.id);if(!r)return"";const l=ee(r.id),o=Math.min(l-1,r.stages.length),d=de(i.id),g=W(i.id)==="chibi",f=d?te(i):Ot(i);return`<li class="lz-card ${d?"done":""}">
            <button type="button" class="lz-open" data-lz="${i.id}">
              <img class="lz-avatar ${d?"chibi-on":""}" src="${f}" alt="" />
              <span class="lz-name">${b(i.name)}</span>
              <span class="lz-meta">${fe(i.kingdom)}・${r.stages.length} 關・${o}/${r.stages.length}</span>
              <span class="lz-badge">${d?g?"Q 版已裝備":"已解鎖":"尚無造型"}</span>
            </button>
            ${d?`<button type="button" class="btn ghost lz-toggle" data-skin="${i.id}">${g?"卸下造型":"裝備 Q 版"}</button>`:""}
          </li>`}).join("")}
    </ul>
  </div>`}function Ot(e){return D(e)}function Kt(){var e;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",m()}),u().querySelectorAll("[data-filter]").forEach(a=>{a.addEventListener("click",()=>{t.liezhuanFilter=a.dataset.filter,m()})}),u().querySelectorAll("[data-lz]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.lz,s=Se(n);s&&(t.storyKind="liezhuan",t.campaignId=s.id,t.screen="story",m())})}),u().querySelectorAll("[data-skin]").forEach(a=>{a.addEventListener("click",n=>{n.stopPropagation();const s=a.dataset.skin,i=W(s)==="chibi";dt(s,i?null:Le),m()})})}function Dt(){const e=lt(),{unlocked:a,total:n}=ot();return`
  <div class="screen panel-screen ach-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>成就</h2>
    </header>
    <p class="story-intro">完成列傳可解鎖 Q 版造型。成就進度 ${a}/${n}。</p>
    ${[{kind:"feat",title:"功業"},{kind:"campaign",title:"劇情傳記"},{kind:"set",title:"勢力集齊"},{kind:"liezhuan",title:"武將列傳"}].map(i=>{const r=e.filter(l=>l.kind===i.kind);return`<section class="ach-group">
          <h3>${i.title}</h3>
          <ul class="ach-list">
            ${r.map(l=>{const o=ct(l.id),d=l.generalId?P(l.generalId):null,g=d?`<img src="${o?te(d):D(d)}" alt="" />`:"";return`<li class="ach-item ${o?"on":""}">
                  ${g}
                  <div>
                    <strong>${b(l.title)}</strong>
                    <span>${b(l.hint)}</span>
                  </div>
                  <em>${o?"已達成":"未達成"}</em>
                </li>`}).join("")}
          </ul>
        </section>`}).join("")}
  </div>`}function Gt(){var e;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",m()})}function Wt(){const e=t.settings,a=!!e.aiApiToken.trim();return`
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
        <input type="password" id="ai-token" placeholder="sk-... 或供應商 Token" value="${b(e.aiApiToken)}" autocomplete="off" />
      </label>
      <label class="field">
        <span>API Base URL</span>
        <input type="text" id="ai-base" value="${b(e.aiApiBaseUrl)}" placeholder="https://api.openai.com/v1" />
      </label>
      <label class="field">
        <span>Model</span>
        <input type="text" id="ai-model" value="${b(e.aiModel)}" placeholder="gpt-4o-mini" />
      </label>
      <label class="field check">
        <input type="checkbox" id="ai-debug" ${e.showAiDebug?"checked":""} />
        <span>角色 ℹ 中顯示當下 AI 想法（身份推測一律可在 ℹ 查看）</span>
      </label>
      <p class="hint">身份局中點座位 ℹ 可看該角色對他人的身份推測、排除項與人數池；內奸可能伪装。</p>
      <button type="button" class="btn primary" id="save-settings">儲存</button>
    </div>
  </div>`}function Jt(){var n,s;const e=u().querySelector("#think-delay"),a=u().querySelector("#delay-label");e.addEventListener("input",()=>{a.textContent=`${(Number(e.value)/1e3).toFixed(1)} 秒`}),(n=u().querySelector("[data-back]"))==null||n.addEventListener("click",()=>{t.screen="start",m()}),(s=u().querySelector("#save-settings"))==null||s.addEventListener("click",()=>{const i=Ee.filter(r=>{if(r.alwaysOn)return!0;const l=u().querySelector(`[data-pack="${r.id}"]`);return!!(l!=null&&l.checked)}).map(r=>r.id);t.settings={thinkDelayMs:Number(e.value),showPortraits:u().querySelector("#show-portraits").checked,forceSelectGeneral:u().querySelector("#force-select").checked,enabledPacks:i,aiApiToken:u().querySelector("#ai-token").value.trim(),aiApiBaseUrl:u().querySelector("#ai-base").value.trim()||"https://api.openai.com/v1",aiModel:u().querySelector("#ai-model").value.trim()||"gpt-4o-mini",showAiDebug:u().querySelector("#ai-debug").checked},ut(t.settings),t.screen="start",m()})}function Qt(){return`
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
  </div>`}function re(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function Yt(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",m()}),(a=u().querySelector("#start-match"))==null||a.addEventListener("click",()=>{Xt()})}async function Xt(){const e=u().querySelector("#mode").value;t.setupMode=e;const a=Re({mode:e,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral});t.game=ae(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,t.screen="table",m()}function Zt(){if(!t.campaignId)return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情模式</h2>
    </header>
    <p class="story-intro">選擇傳記。關卡會依登場武將自動啟用對應卡包（風／火／林／山／一將等）。</p>
    <ul class="stage-list campaign-pick">
      ${Ue.map(n=>{const s=ee(n.id),i=Math.min(s-1,n.stages.length);return`<li>
          <button type="button" data-campaign="${n.id}">
            <span class="idx">${b(n.title)}</span>
            <span class="st">${b(n.blurb)}</span>
            <span class="sub">進度 ${i}/${n.stages.length}</span>
          </button>
        </li>`}).join("")}
    </ul>
  </div>`;const e=Fe(t.campaignId),a=ee(e.id);return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back-campaigns>${O(t.campaignId)?"返回標題":t.storyKind==="liezhuan"?"列傳列表":"傳記列表"}</button>
      <h2>${O(t.campaignId)?b(e.title):`劇情・${b(e.title)}`}</h2>
    </header>
    <p class="story-intro">${b(e.blurb)}</p>
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
  </div>`}function en(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",m()}),(a=u().querySelector("[data-back-campaigns]"))==null||a.addEventListener("click",()=>{if(O(t.campaignId)){t.campaignId=null,t.screen="start",m();return}if(t.storyKind==="liezhuan"){t.campaignId=null,t.screen="liezhuan",m();return}t.campaignId=null,m()}),u().querySelectorAll("[data-campaign]").forEach(n=>{n.addEventListener("click",()=>{t.campaignId=n.dataset.campaign,m()})}),u().querySelectorAll("[data-stage]").forEach(n=>{n.addEventListener("click",()=>{var r,l;const s=n.dataset.stage,i=qe(s);t.stage=(i==null?void 0:i.stage)??null,t.campaignId=(i==null?void 0:i.campaign.id)??t.campaignId,t.allyChoice=((l=(r=t.stage)==null?void 0:r.allyChoices)==null?void 0:l[0])??null,t.screen="stage",m()})})}function tn(){var g;const e=t.stage,a=e.allyChoices??[],n=b(e.briefing).split(/\n+/).filter(Boolean).map(f=>`<p>${f}</p>`).join(""),s=e.prevLink?`<p class="story-bridge">${b(e.prevLink)}</p>`:"",i=e.allies.map(f=>f.name?f.name:P(f.generalId).name),r=e.enemies.map(f=>f.name??P(f.generalId).name),l=P(e.playerGeneralId).name,o=`
    <section class="intel-block">
      <h4>參戰勢力</h4>
      <div class="force-cols">
        <div>
          <p class="force-side">我方</p>
          <ul class="force-list">
            <li>${b(l)}</li>
            ${i.map(f=>`<li>${b(f)}</li>`).join("")}
            ${a.length?'<li class="force-pick">＋自選副將</li>':""}
          </ul>
        </div>
        <div>
          <p class="force-side foe">敵方</p>
          <ul class="force-list">
            ${r.map(f=>`<li>${b(f)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="intel-block">
      <h4>關卡設定</h4>
      <p class="intel-pack">卡包：${Ie(Ve(e))}${(g=e.requiredCardKinds)!=null&&g.length?`　·　必備：${e.requiredCardKinds.map(f=>f==="tiesuo"?"鐵索連環":f).join("、")}`:""}</p>
      <p class="intel-pack">勝利：${e.victory.type==="kill_target"?`擊殺 ${P(e.victory.targetGeneralId).name}`:e.victory.type==="survive_rounds"?`堅守突圍 ${e.victory.rounds??4} 輪（或擊潰追兵）`:"殲滅敵軍"}</p>
      ${Ft(e)}
    </section>`,d=$e({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds,intelExtraHtml:o});return`
  <div class="screen story-brief-screen">
    <header class="topbar story-brief-top">
      <button type="button" class="btn ghost" data-back>返回</button>
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${b(e.era)}・第${e.index}關</p>
        <h2>${e.title}</h2>
        <p class="story-brief-sub">${b(e.subtitle)}</p>
      </div>
    </header>
    ${d}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="關卡劇情">
        <div class="story-hand">${s}${n}</div>
      </div>
      <div class="panel story-ready">
        ${a.length?`<label class="field"><span>自選副將</span>
              <select id="ally">${a.map(f=>{const h=P(f==="dianwei_proxy"?"xuchu":f),y=f==="dianwei_proxy"?`${h.name}（代典韋）`:h.name;return`<option value="${f}" ${t.allyChoice===f?"selected":""}>${y}</option>`}).join("")}</select></label>`:'<p class="meta">確認戰局後進入戰鬥</p>'}
        <button type="button" class="btn primary" id="enter-stage">下一步</button>
      </div>
    </div>
  </div>`}function nn(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="story",m()}),(a=u().querySelector("#enter-stage"))==null||a.addEventListener("click",()=>{an()})}async function an(){var n;const e=(n=u().querySelector("#ally"))==null?void 0:n.value;t.allyChoice=e??null;const a=Ne(t.stage,t.allyChoice??void 0);t.game=ae(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.coachSlide=0,t.screen="table",m(),await L()}function Ae(e,a,n){if(e.identity==="none")return"";const s={lord:"主公",loyal:"忠臣",rebel:"反賊",spy:"內奸"}[e.identity]??"";return n==="duel"?"":e.id===a.id?s:e.identity==="lord"?"主公":e.alive?"？":s}function sn(e){const a=e.winnerIds.includes(0);return`<div class="match-end-overlay" role="dialog" aria-modal="true" aria-labelledby="match-end-title">
    <div class="match-end-card">
      <p class="match-end-kicker">${a?"我方勝":"敵方勝"}</p>
      <h2 id="match-end-title">${a?"勝利":"敗北"}</h2>
      <p class="match-end-msg">${b(e.resultMessage??"")}</p>
      <button type="button" class="btn primary" id="ack-match-end">下一步</button>
    </div>
  </div>`}function rn(){const e=t.game,a=J(e),n=e.prompt,s=e.matchPhase==="pick_general",i=!!e.winnerIds,r=n.actorId===a.id&&!t.aiBusy&&!s&&!i&&!t.matchPaused,l=e.players.length,o=!i&&!t.matchPaused&&n.kind==="choice"&&n.choiceKey==="wuxie"&&n.actorId!==a.id,d=(()=>{if(i||t.matchPaused)return t.matchPaused?'<div class="thinking paused-banner">對局已暫停</div>':"";if(o)return'<div class="thinking">有角色正在考慮是否使用【無懈可擊】…</div>';if(n.actorId!==null&&n.actorId!==a.id&&(t.aiBusy||V())){const c=e.players[n.actorId],$=c!=null&&c.isHuman?"操作中":"思考中";return`<div class="thinking">${R(c.name,n.actorId)} ${$}…</div>`}return""})(),g=e.players.map(c=>({id:c.id,name:c.name,generalName:c.generalId?P(c.generalId).name:void 0})),f=i?"":o?"等待【無懈可擊】結算…":gt(e,t.selectedUid),h=t.selectedUid&&n.kind==="choose_card"?"已選取手牌 — 再點一次同一張牌以打出，或點其他牌改選":o?"等待【無懈可擊】結算…":n.message||"等待中…",y=r&&!i;return`
  <div class="screen table-screen ${i?"match-ended":""} ${t.matchPaused?"match-paused":""} ${_e(e)?"tutorial-match":""}">
    <header class="battle-top">
      <div>
        <strong>${s?"選將階段":`第 ${e.round} 輪`}</strong>
        <span class="phase">${s?"請選擇武將":hn(e.phase)}</span>
      </div>
      <div class="battle-top-right">
        <div class="deck-info">${s?`座位 ${l} 人`:`牌堆 ${e.deck.length}　棄牌 ${e.discard.length}`}</div>
        ${i?"":`<button type="button" class="btn ghost" id="pause-match">${t.matchPaused?"繼續":"暫停"}</button>`}
      </div>
    </header>
    ${d}
    <div class="arena" style="--n:${l}" id="arena">
      ${e.players.map(c=>{var I;const $=!!c.generalId,w=$?P(c.generalId):null,T=!s&&e.currentPlayer===c.id,C=!s&&n.kind==="choose_target"&&((I=n.targetIds)==null?void 0:I.includes(c.id))&&r,A=(c.id-a.id+l)%l,j=A/l*360+90,Q=c.id===a.id?"—":String(nt(e,a.id,c.id)),Y=!s&&c.id!==a.id&&c.alive&&$&&at(e,a.id,c.id)?"in-range":"",F=Ae(c,a,e.config.mode),p=e.fx.damages.find(x=>x.playerId===c.id),v=ze(c.id),k=t.settings.showPortraits&&w?`<img class="portrait ${W(w.id)==="chibi"?"chibi-on":""}" src="${D(w)}" alt="" width="48" height="48" />`:t.settings.showPortraits?'<div class="portrait portrait-empty" aria-hidden="true">？</div>':"",E=$?`<button type="button" class="info-btn" data-info-seat="${c.id}" title="詳情" aria-label="詳情">ℹ</button>`:"";return`<div class="seat-wrap" style="--angle:${j}deg;--seat-c:${v}" data-visual="${A}" data-seat-pos="${c.id}">
            <div class="seat ${c.alive?"":"dead"} ${T?"active":""} ${c.id===a.id?"human":c.isHuman?"human-remote":""} ${C?"targetable":""} ${Y} ${s&&!$?"hidden-gen":""} ${p?"hurt":""}" data-seat="${c.id}" role="${C?"button":"group"}" tabindex="${C?"0":"-1"}">
              ${k}
              <div class="seat-head">
                <span class="seat-gen">${w?b(w.name):"未亮將"}</span>
                ${E}
              </div>
              <div class="seat-name">${b(c.name)}${F?`・${F}`:""}</div>
              <div class="hp">${$?pn(c.hp,c.maxHp):"—"}</div>
              <div class="equip">${$?mn(c):s?"等待選將":"無裝備"}</div>
              <div class="meta-row"><span>手牌 ${s?"—":c.hand.length}</span><span class="dist">距 ${Q}</span></div>
              ${p?`<span class="dmg-float" data-dmg-seq="${p.seq}">-${p.amount}</span>`:""}
            </div>
          </div>`}).join("")}
      ${dn(e,a.id,l)}
    </div>
    ${f?`<div class="action-hint ${y?"loud":""}" role="status">${b(f)}</div>`:""}
    <div class="prompt-bar ${y?"prompt-loud":""}">${le(h,g)}</div>
    ${Nt(e)}
    ${s?on(e):""}
    ${!s&&r&&(n.kind==="choice"||n.kind==="skill_cards")?ln(e):""}
    ${!s&&r&&n.kind==="choose_card"?`<div class="skill-row">${st(e,a.id).map(c=>`<button type="button" class="btn ghost" data-skill="${c.id}" title="${b(c.hint)}">${b(c.label)}</button>`).join("")}</div>`:""}
    ${s?"":`<div class="hand">
      ${a.hand.map(c=>{var A,j;const $=H(c.defId),w=r&&!!((A=n.cardUids)!=null&&A.includes(c.uid))&&(n.kind==="choose_card"||n.kind==="discard"||n.kind==="respond_shan"||n.kind==="respond_sha"||n.kind==="skill_cards"),T=t.selectedUid===c.uid||n.kind==="skill_cards"&&!!((j=n.selectedCardUids)!=null&&j.includes(c.uid)),C=$.suit==="heart"||$.suit==="diamond";return`<div class="card-wrap">
            <button type="button" class="card ${w?"selectable":""} ${T?"selected":""} ${C?"red":"black"}" data-uid="${c.uid}" ${w?"":"disabled"}>
              <span class="csuit ${C?"red":""}">${ne($.suit)}${G($.rank)}</span>
              <span class="cname">${$.name}</span>
              <span class="ctype">${Te($)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${c.uid}" title="牌面說明">ℹ</button>
          </div>`}).join("")}
    </div>`}
    <div class="log" aria-live="polite">${[...e.log].slice(-8).map((c,$,w)=>`<div class="${$===w.length-1?"log-latest":""}">${le(c.text,g)}</div>`).join("")}</div>
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
    ${i?sn(e):""}
  </div>`}function ln(e){var l;const a=e.prompt.choices??[];if(!a.length)return"";const n=e.prompt.kind==="skill_cards",s=e.prompt.choiceKey==="zone_pick",i=((l=e.prompt.selectedCardUids)==null?void 0:l.length)??0,r=e.prompt.minTargets??1;return`<div class="choice-panel">
    <h3>${b(e.prompt.message)}</h3>
    <div class="choice-row">
      ${a.map(o=>{var h;const d=(n||s)&&o.id==="confirm"&&i<r,g=s&&!!((h=e.prompt.selectedCardUids)!=null&&h.includes(o.id));return`<button type="button" class="${["btn",o.id==="skip"||o.id==="no"?"ghost":"primary",g?"selected-pick":""].filter(Boolean).join(" ")}" data-choice="${o.id}" ${d?"disabled":""}>${b(o.label)}</button>`}).join("")}
    </div>
  </div>`}function on(e){const a=J(e),n=e.prompt.actorId;if(n!=null&&n!==a.id){const r=e.players[n];return`<div class="pick-panel">
    <h3>等待選將</h3>
    <p class="muted">${r?b(r.name):"其他玩家"} 正在選擇武將…</p>
  </div>`}if(a.generalId)return`<div class="pick-panel">
    <h3>已選定</h3>
    <p class="muted">你已選【${b(P(a.generalId).name)}】，等待其他玩家選將…</p>
  </div>`;const s=e.prompt.generalIds??[];return`<div class="pick-panel">
    <h3>${s.length>3?"選擇武將（全部可選）":"系統隨機三將，請選一"}</h3>
    <div class="pick-grid">
      ${s.map(r=>{const l=P(r);return`<div class="pick-card">
            ${t.settings.showPortraits?`<img class="pick-portrait ${W(l.id)==="chibi"?"chibi-on":""}" src="${D(l)}" alt="" />`:""}
            <div class="pick-name">${l.name}</div>
            <div class="pick-meta">${re(l.kingdom)}・${l.maxHp} 血</div>
            <p class="pick-skill">${b(l.skillText)}</p>
            <div class="pick-actions">
              <button type="button" class="btn ghost" data-gen-info="${r}">詳情</button>
              <button type="button" class="btn primary" data-pick-gen="${r}">選定</button>
            </div>
          </div>`}).join("")}
    </div>
  </div>`}function ge(e,a,n){const r=((e-a+n)%n/n*360+90)*Math.PI/180,l=38;return{x:50+Math.cos(r)*l,y:50+Math.sin(r)*l}}function cn(e,a){var n;if(e.fx.play)return e.fx.play;if(e.prompt.kind==="choose_target"&&((n=e.prompt.cardUids)!=null&&n[0])&&e.prompt.actorId!==null){const s=e.players[e.prompt.actorId],i=s==null?void 0:s.hand.find(r=>r.uid===e.prompt.cardUids[0]);if(i){const r=H(i.defId);return{cardName:r.name,suit:r.suit,rank:r.rank,sourceId:e.prompt.actorId,targetIds:[],note:"選擇目標",seq:0}}}return null}function dn(e,a,n){const s=cn(e);if(!s&&!e.fx.damages.length)return'<div class="arena-center" aria-hidden="true"><span>距離</span></div>';const i=!!(s&&t.fxSettledSeq===s.seq),r=s?ge(s.sourceId,a,n):null,l=s&&r?s.targetIds.filter(f=>f!==s.sourceId).map(f=>{const h=ge(f,a,n);return un(r.x,r.y,h.x,h.y,s.seq,i)}).join(""):"",o=s&&s.targetIds.length===1&&s.targetIds[0]===s.sourceId?`<div class="fx-self-ring ${i?"fx-settled":""}" style="left:${r.x}%;top:${r.y}%"></div>`:"",d=s&&(s.suit==="heart"||s.suit==="diamond"),g=s?`<div class="fx-card ${d?"red":"black"} ${i?"fx-settled":""}" data-fx-seq="${s.seq}">
        <span class="csuit">${ne(s.suit)}${G(s.rank)}</span>
        <span class="cname">${b(s.cardName)}</span>
        ${s.note?`<span class="fx-note">${b(s.note)}</span>`:""}
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
      ${o}
      <div class="fx-card-slot">${g||'<span class="arena-center-label">距離</span>'}</div>
    </div>`}function un(e,a,n,s,i,r=!1){const l=n-e,o=s-a,d=Math.hypot(l,o)||1,g=Math.min(8,d*.2),f=e+l/d*g,h=a+o/d*g,y=n-l/d*g,c=s-o/d*g;return`<line class="fx-arrow-line ${r?"fx-settled":""}" data-fx-seq="${i}" x1="${f}" y1="${h}" x2="${y}" y2="${c}" marker-end="url(#arrowHead)" />`}function pn(e,a){const n=Math.max(0,e);return"●".repeat(n)+"○".repeat(Math.max(0,a-n))}function mn(e){const a=[];if(e.equips.weapon){const n=H(e.equips.weapon.defId),s=n.attackRange??1;a.push(`<span class="eq-line eq-weapon">${b(n.name)} <em>攻${s}</em></span>`)}if(e.equips.armor){const n=H(e.equips.armor.defId);a.push(`<span class="eq-line eq-armor">${b(n.name)}</span>`)}if(e.equips.horseMinus){const n=H(e.equips.horseMinus.defId);a.push(`<span class="eq-line eq-horse">-1 ${b(n.name)}</span>`)}if(e.equips.horsePlus){const n=H(e.equips.horsePlus.defId);a.push(`<span class="eq-line eq-horse">+1 ${b(n.name)}</span>`)}for(const n of e.judges??[]){const s=H(n.defId);a.push(`<span class="eq-line eq-judge">判定・${b(s.name)}</span>`)}return a.length?a.join(""):"無裝備"}function hn(e){return{prepare:"準備",judge:"判定",draw:"摸牌",play:"出牌",discard:"棄牌",end:"結束"}[e]??e}function yn(e){return{basic:"基本",trick:"錦囊",equip:"裝備"}[e]??e}function Te(e){return e.slot==="weapon"?`武器・攻${e.attackRange??1}`:e.slot==="armor"?"防具":e.slot==="horseMinus"?"-1坐騎":e.slot==="horsePlus"?"+1坐騎":yn(e.type)}function bn(e){if(!e.generalId)return`<h3>${R(e.name,e.id)}</h3><p class="muted">尚未亮出武將。</p>`;const a=P(e.generalId),n=["weapon","armor","horseMinus","horsePlus"].map(l=>{const o=e.equips[l];if(!o)return null;const d=H(o.defId);let g="";return l==="weapon"?g=`攻擊範圍 ${d.attackRange??1}`:l==="horseMinus"?g="-1 坐騎（與其他角色距離-1）":l==="horsePlus"?g="+1 坐騎（其他角色與你距離+1）":l==="armor"&&(g="防具"),`<li><strong>${b(d.name)}</strong>（${we(d.suit)}${G(d.rank)}）· ${g}<br/><span class="muted">${Pe[d.kind]??""}</span></li>`}).filter(Boolean).join(""),s=t.game;let i="";s&&(s.config.mode==="identity5"||s.config.mode==="identity8")&&(i=it(s,e.id),t.settings.showAiDebug||(i=i.replace(/<p class="mind-thought">[\s\S]*?<\/p>/,"")));const r=s&&(()=>{const l=s.players.find(d=>d.isHuman);if(!l)return"";const o=Ae(e,l,s.config.mode);return o?`<p class="muted">公開身份資訊：${o}</p>`:""})();return`<h3>${R(a.name,e.id)} <span class="muted">·</span> ${R(e.name,e.id)}</h3>
    <p class="muted">${re(a.kingdom)}・${a.maxHp} 血・${a.gender==="female"?"女":"男"}</p>
    ${r??""}
    <h4>武將技</h4>
    <p>${b(a.skillText)}</p>
    <h4>裝備</h4>
    ${n?`<ul class="detail-list">${n}</ul>`:'<p class="muted">無</p>'}
    ${i}`}function fn(e){const a=P(e);return`<h3>${a.name}</h3>
    <p class="muted">${re(a.kingdom)}・體力上限 ${a.maxHp}・${a.gender==="female"?"女":"男"}</p>
    <h4>武將技</h4>
    <p>${b(a.skillText)}</p>`}function gn(e,a){const n=a.hand.find(i=>i.uid===e);if(!n)return"<p>找不到此牌</p>";const s=H(n.defId);return`<h3>${s.name}</h3>
    <p>${ne(s.suit)} ${we(s.suit)} ${G(s.rank)}　·　${Te(s)}</p>
    <p>${Pe[s.kind]??"暫無說明。"}</p>`}async function L(){var a;const e=t.game;if(!(!e||t.aiBusy||t.matchPaused)&&e.matchPhase!=="pick_general"){if(e.fx.play||e.fx.damages.length){t.aiBusy=!0,m();const n=Math.min(Math.max(t.settings.thinkDelayMs,500),1e3);if(await new Promise(s=>setTimeout(s,n)),t.matchPaused){t.aiBusy=!1,m();return}ve(e)&&!e.winnerIds&&oe(e),t.aiBusy=!1,m()}if(e.winnerIds){ke(),m();return}if(!t.matchPaused){t.aiBusy=!0,m();try{if(V()&&!t.lobbyVm.isHost)return;await se(e,()=>{var n;t.screen==="table"&&t.game===e&&m(),V()&&t.lobbyVm.isHost&&t.game&&((n=t.mpClient)==null||n.send({type:"host_match",match:t.game}))},()=>t.matchPaused)}finally{t.aiBusy=!1}if(V()&&t.lobbyVm.isHost&&t.game&&((a=t.mpClient)==null||a.send({type:"host_match",match:t.game})),t.matchPaused){m();return}ve(e)&&!e.winnerIds&&oe(e),ke(),m()}}}function ve(e){const a=e.prompt.kind;return a==="choose_card"||a==="discard"||a==="game_over"||a==="idle"||a==="choose_general"}function vn(){const e=u().querySelector(".log");if(!e)return;const a=e.querySelector(".log-latest");a&&a.scrollIntoView({block:"nearest",behavior:"instant"}),e.scrollTop=e.scrollHeight}function kn(){var n,s,i,r,l,o,d,g,f;const e=t.game,a=J(e);(n=u().querySelector("#coach-next"))==null||n.addEventListener("click",()=>{const h=Ce(e.config.campaignStageId);t.coachSlide+1>=h.length?t.coachSlide=-1:t.coachSlide+=1,m()}),(s=u().querySelector("#coach-skip"))==null||s.addEventListener("click",()=>{t.coachSlide=-1,m()}),u().querySelectorAll("[data-choice]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choice"&&e.prompt.kind!=="skill_cards"||e.prompt.actorId!==a.id)return;const y=h.dataset.choice;_(e,{type:"choice",choiceId:y}),L()})}),u().querySelectorAll("[data-skill]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choose_card"||e.prompt.actorId!==a.id)return;const y=h.dataset.skill;_(e,{type:"skill",skillId:y}),t.selectedUid=null,L()})}),u().querySelectorAll("[data-gen-info]").forEach(h=>{h.addEventListener("click",()=>{const y=h.dataset.genInfo;t.detailHtml=fn(y),m()})}),u().querySelectorAll("[data-pick-gen]").forEach(h=>{h.addEventListener("click",()=>{if(e.prompt.kind!=="choose_general"||e.prompt.actorId!==a.id||a.generalId)return;const y=h.dataset.pickGen;_(e,{type:"pick_general",generalId:y}),t.detailHtml=null,m(),L()})}),u().querySelectorAll("[data-info-seat]").forEach(h=>{h.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const c=Number(h.dataset.infoSeat);t.detailHtml=bn(e.players[c]),m()})}),u().querySelectorAll("[data-info-card]").forEach(h=>{h.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const c=h.dataset.infoCard;t.detailHtml=gn(c,a),m()})}),u().querySelectorAll(".card.selectable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=h.dataset.uid;if(e.prompt.kind==="choose_card"){if(t.selectedUid!==y){t.selectedUid=y,m();return}_(e,{type:"select_card",uid:y}),t.selectedUid=null,L();return}if(e.prompt.kind==="skill_cards"){_(e,{type:"select_card",uid:y}),m();return}_(e,{type:"select_card",uid:y}),t.selectedUid=null,L()})}),(i=u().querySelector("#cancel-select"))==null||i.addEventListener("click",()=>{t.selectedUid=null,m()}),u().querySelectorAll(".seat.targetable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=Number(h.dataset.seat);_(e,{type:"select_target",seatId:y}),L()})}),(r=u().querySelector("#end-play"))==null||r.addEventListener("click",()=>{t.aiBusy||(_(e,{type:"end_play"}),L())}),(l=u().querySelector("#pass-resp"))==null||l.addEventListener("click",()=>{t.aiBusy||(_(e,{type:"pass_response"}),L())}),(o=u().querySelector("#cancel-tgt"))==null||o.addEventListener("click",()=>{_(e,{type:"cancel_target"}),m()}),(d=u().querySelector("#ack-match-end"))==null||d.addEventListener("click",()=>{t.matchEndPending=!1,t.screen=t.stage?"epilogue":"result",m()}),(g=u().querySelector("#pause-match"))==null||g.addEventListener("click",()=>{if(t.matchPaused){t.matchPaused=!1,m(),L();return}t.matchPaused=!0,m()}),(f=u().querySelector("#flee"))==null||f.addEventListener("click",()=>{window.confirm("確定要退出對局嗎？進度不會保存。")&&(t.game=null,t.aiBusy=!1,t.matchEndPending=!1,t.matchPaused=!1,t.screen=t.stage?"story":"start",m())})}function ke(){const e=t.game;if(!(e!=null&&e.winnerIds)){t.matchEndPending=!1;return}if(!t.matchEndPending){const a=e.winnerIds.includes(0);if(mt({won:a,identity:e.config.mode==="identity5"||e.config.mode==="identity8"}),e.config.campaignStageId&&a){const n=qe(e.config.campaignStageId);if(n){De(n.campaign.id,n.stage.index),ht();const s=[];if(Ge(n.campaign.id)&&n.stage.index>=n.campaign.stages.length){const i=n.campaign.id.slice(3),r=P(i);yt(i,Le)&&s.push({kind:"skin",title:"解鎖 Q 版造型",detail:`${r.name}・簡單 Q 版角色樣`,generalId:i})}O(n.campaign.id)&&n.stage.index>=n.campaign.stages.length&&bt(),s.push(...ue()),t.unlockBanners=s}}else a&&(t.unlockBanners=ue());t.matchEndPending=!0}}function $n(){var l;const e=t.stage,a=t.game,n=!!((l=a.winnerIds)!=null&&l.includes(0)),s=Be(e,a),i=b(s).split(/\n+/).filter(Boolean).map(o=>`<p>${o}</p>`).join(""),r=$e({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds});return`
  <div class="screen story-brief-screen epilogue-screen">
    <header class="topbar story-brief-top">
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${n?"戰後・勝":"戰後・敗"}・${b(e.era)}</p>
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
  </div>`}function In(){var e;(e=u().querySelector("#epilogue-next"))==null||e.addEventListener("click",()=>{t.screen="result",m()})}function Sn(){var i;const e=t.game,a=(i=e.winnerIds)==null?void 0:i.includes(0),n=t.unlockBanners,s=n.length?`<ul class="unlock-list">${n.map(r=>{const l=r.kind==="skin"&&r.generalId?`<img class="unlock-chibi" src="${te(P(r.generalId))}" alt="" />`:"";return`<li class="unlock-item ${r.kind}">${l}<div><strong>${b(r.title)}</strong><span>${b(r.detail)}</span></div></li>`}).join("")}</ul>`:"";return`
  <div class="screen panel-screen result-screen">
    <h2>${a?"勝利":"敗北"}</h2>
    <p>${b(e.resultMessage??"")}</p>
    ${s}
    <div class="cta-row">
      <button type="button" class="btn primary" id="again">再來一局</button>
      <button type="button" class="btn" id="home">回首頁</button>
      ${t.stage?`<button type="button" class="btn" id="story">${t.storyKind==="liezhuan"?"列傳關卡":"關卡列表"}</button>`:""}
    </div>
  </div>`}function qn(){var e,a,n;(e=u().querySelector("#home"))==null||e.addEventListener("click",()=>{t.game=null,t.stage=null,t.unlockBanners=[],t.screen="start",m()}),(a=u().querySelector("#story"))==null||a.addEventListener("click",()=>{t.game=null,t.unlockBanners=[],t.screen="story",m()}),(n=u().querySelector("#again"))==null||n.addEventListener("click",()=>{if(t.unlockBanners=[],t.stage){t.screen="stage",m();return}t.screen="setup",m()})}function b(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{Cn as s};
