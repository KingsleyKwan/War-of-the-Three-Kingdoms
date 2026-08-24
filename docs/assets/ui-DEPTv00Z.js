import{g as _,i as He,h as J,a as S,j as Me,r as fe,s as Ae,k as R,e as ae,m as Y,o as K,p as ge,q as Te,l as W,t as ve,f as Q,C as je,u as Be,v as F,w as ke,P as $e,d as U,x as Ie,y as Se,z as ze,B as Ve,D as Ue,T as Fe,E as Ne,F as Re}from"./data-BJ1vRtvR.js";import{k as Ke,a as Oe,r as De,f as Ge,p as We,e as Qe,s as Je,b as Ye,m as Xe,n as Ze,l as et,d as se,o as X}from"./engine-CG3I_ha3.js";import{r as Z,f as tt}from"./ai-C4jWyOom.js";import{$ as ie}from"./vendor-DvnuzqsD.js";import{l as nt,g as O,a as at,b as st,i as it,h as le,s as lt,c as rt,m as qe,d as ot,r as ct,e as dt,u as ut,f as pt,j as re,C as Pe}from"./persist-ZhkrWjrH.js";const mt={tutorial_01:[{title:"座位與體力",body:"周圍是各座位。紅心是體力。你永遠在畫面靠近自己的一側。點座位上的 ℹ 可看武將技能。"},{title:"手牌區",body:"底部一排是你的手牌。亮起、可點的牌才是現在能用的。點 ℹ 看牌面說明。"},{title:"出【殺】",body:"出牌階段點一張【殺】（再點一次打出），然後點亮起的敵方座位作為目標。對方可出【閃】抵消。"},{title:"結束與棄牌",body:"不想再出牌就按「結束出牌」。手牌多過體力上限時，要棄到上限。完成後輪到對手。"}],tutorial_02:[{title:"裝備區",body:"座位上「裝備」那一行就是裝備區。本關你已戴上【諸葛連弩】：攻擊範圍 1，但一回合可出多張【殺】。"},{title:"錦囊",body:"【無中生有】摸兩張；【過河拆橋】選一名角色，棄其手牌或裝備（手牌背面看不見內容）。錦囊多數無距離限制。"},{title:"再出殺",body:"有連弩時，出完一張【殺】後仍可再出【殺】。打完按「結束出牌」。"}],tutorial_03:[{title:"瀕死",body:"體力到 0 會問全場是否出【桃】。救到體力大於 0 才活。問到你時，亮起的【桃】點兩下打出。"},{title:"這一關",body:"雙方體力都很低。你可用【殺】先手；自己受傷時記得留【桃】。華佗的紅牌也可當桃（技能詳見 ℹ）。"}]};function Ee(e){return e?mt[e]??[]:[]}function xe(e){return!!e&&He(e.config.campaignStageId)}function ht(e,a){const n=e.prompt,s=e.players.find(i=>i.isHuman);if(!s||e.winnerIds)return"";if(e.matchPhase==="pick_general")return"請點選一名武將，確認後開局";if(n.actorId!==s.id)return"等待其他角色行動…";switch(n.kind){case"choose_card":{if(a){const i=s.hand.find(r=>r.uid===a);return`已選【${i?_(i.defId).name:"此牌"}】— 再點同一張打出，或點其他牌改選`}return e.phase==="play"?"出牌階段：點亮起的手牌使用，或按「結束出牌」":n.message||"請選擇一張牌"}case"choose_target":return"請點亮起、會閃爍的座位作為目標";case"respond_shan":return"需要【閃】：點亮起的【閃】打出，或按「放棄」承受傷害";case"respond_sha":return"需要【殺】：點亮起的【殺】打出，或按「放棄」";case"discard":return`棄牌階段：點選要棄的牌（需棄 ${n.discardCount??""} 張）`;case"choice":return n.message||"請在上方選項中點選";case"skill_cards":return n.message||"請依技能選擇牌，再按確認";default:return n.message||""}}function yt(e){return Array.from({length:e},(a,n)=>({id:n,type:"empty",name:"",ready:!1}))}function bt(e){return e.find(a=>a.type==="empty")}function N(){return{room:null,localName:"",joinCode:"",error:null,isHost:!1,myClientId:null}}function ft(e,a,n,s){const i=yt(n);return i[0]={id:0,type:"human",name:a,clientId:e,ready:!0},{roomId:gt(),hostClientId:e,maxPlayers:n,status:"lobby",seats:i}}function gt(e=4){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let n="";for(let s=0;s<e;s++)n+=a[Math.floor(Math.random()*a.length)];return n}function vt(e){const a=e.seats.map(n=>n.type==="empty"?{...n,type:"ai",name:`電腦${n.id+1}`,ready:!0}:n);return{...e,seats:a}}function we(e){return e.filter(a=>a.type==="human").length}function kt(e,a){return a&&e.status==="lobby"&&we(e.seats)>=1}function $t(e){const{room:a,localName:n,joinCode:s,error:i,isHost:l}=e;if(!a)return`
    <div class="screen lobby-screen">
      <div class="topbar">
        <button type="button" class="btn ghost" data-go="start">返回</button>
        <h2>多人對戰</h2>
      </div>
      ${i?`<p class="lobby-error">${j(i)}</p>`:""}
      <div class="panel lobby-panel">
        <label class="field">你的名字
          <input type="text" id="lobby-name" maxlength="8" value="${oe(n)}" placeholder="例如：主公" />
        </label>
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="lobby-create-5">開 5 人房</button>
          <button type="button" class="btn primary" id="lobby-create-8">開 8 人房</button>
        </div>
        <hr class="settings-sep" />
        <label class="field">輸入房號加入
          <input type="text" id="lobby-code" maxlength="6" value="${oe(s)}" placeholder="例如：K7P2" style="text-transform:uppercase" />
        </label>
        <button type="button" class="btn" id="lobby-join">加入房間</button>
      </div>
      <p class="hint">人數不足會用電腦補位。房主開始後即開局。<br/>連線：PeerJS（無需自架伺服器）</p>
    </div>`;const r=a.seats.map(o=>{const d=o.type==="human"?`${j(o.name)}${o.ready?" · 已準備":""}`:o.type==="ai"?"電腦":"等待中…";return`<li class="lobby-seat ${o.type==="human"?"seat-human":o.type==="ai"?"seat-ai":"seat-empty"}"><span class="idx">${o.id+1}</span> ${d}</li>`}).join("");return`
  <div class="screen lobby-screen">
    <div class="topbar">
      <button type="button" class="btn ghost" id="lobby-leave">離開</button>
      <h2>房間 ${j(a.roomId)}</h2>
    </div>
    ${i?`<p class="lobby-error">${j(i)}</p>`:""}
    <div class="panel lobby-panel">
      <p class="lobby-code-row">
        房號 <strong class="lobby-code">${j(a.roomId)}</strong>
        <button type="button" class="btn ghost" id="lobby-copy">複製</button>
      </p>
      <ul class="lobby-seats">${r}</ul>
      <div class="lobby-actions">
        ${l?`<button type="button" class="btn primary" id="lobby-start" ${kt(a,!0)?"":"disabled"}>開始遊戲</button>`:'<p class="hint">等待房主開始…</p>'}
      </div>
    </div>
    <p class="hint">目前 ${we(a.seats)} 人 · 上限 ${a.maxPlayers} · 空位開局時會變電腦</p>
  </div>`}function j(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function oe(e){return j(e).replace(/'/g,"&#39;")}const B={};function ee(){const e="wtk_mp_client_id";try{let a=sessionStorage.getItem(e);return a||(a="c_"+Math.random().toString(36).slice(2,10),sessionStorage.setItem(e,a)),a}catch{return"c_"+Math.random().toString(36).slice(2,10)}}const ce=(B==null?void 0:B.VITE_PARTYKIT_HOST)??"",It=(B==null?void 0:B.VITE_MP_OFFLINE)==="1",de={host:"0.peerjs.com",port:443,path:"/",secure:!0,debug:0};function St(e){return"wtk-"+e.trim().toUpperCase()}function qt(){return It?xt():ce?Et(ce):Pt()}function Pt(){const e=ee();let a=null,n=null,s=!1,i=!1,l=null,r="";const o=new Map;let d=null;const g=[];let b=!1,h=Promise.resolve();function y(m){b||a==null||a(m)}function c(m){y(m);for(const k of o.values())if(k.open)try{k.send(m)}catch{}}function $(m){if(!l)return;const k=l.seats.find(v=>v.clientId===m);k&&(k.type="empty",k.name="",k.clientId=void 0,k.ready=!1,l={...l,seats:[...l.seats]},c({type:"room",room:l}))}function q(m){m.on("data",k=>{var P,w,V;const v=k;if(!(!v||typeof v!="object")){if(v.type==="join"){if(!l||l.status!=="lobby"){try{m.send({type:"error",message:"無法加入（房間已開局或不存在）"})}catch{}return}const I=bt(l.seats);if(!I){try{m.send({type:"error",message:"房間已滿"})}catch{}return}const C=v,T=C.clientId||m.peer;I.type="human",I.name=C.name||"玩家",I.clientId=T,I.ready=!1,o.set(T,m),l={...l,seats:[...l.seats]},c({type:"room",room:l});return}if(v.type==="action"){const I=((P=[...o.entries()].find(([,C])=>C===m))==null?void 0:P[0])??m.peer;y({type:"remote_action",clientId:I,action:v.action});return}if(v.type==="leave"){const I=((w=[...o.entries()].find(([,C])=>C===m))==null?void 0:w[0])??m.peer;o.delete(I),$(I);return}if(v.type==="ready"&&l){const I=((V=[...o.entries()].find(([,T])=>T===m))==null?void 0:V[0])??m.peer,C=l.seats.find(T=>T.clientId===I);C&&(C.ready=!!v.ready,l={...l,seats:[...l.seats]},c({type:"room",room:l}))}}}),m.on("close",()=>{var v;const k=((v=[...o.entries()].find(([,P])=>P===m))==null?void 0:v[0])??m.peer;o.delete(k),$(k)})}function M(m){if(s){if(m.type==="host_room"){l=m.room,c({type:"room",room:m.room});return}if(m.type==="host_match"){l&&(l={...l,status:"playing",match:m.match}),c({type:"match",match:m.match});return}if(m.type==="leave"){x(),y({type:"error",message:"已離開房間"});return}return}if(d!=null&&d.open){if(m.type==="join"){const k={type:"join",name:m.name,clientId:e};d.send(k);return}d.send(m)}}function x(){b=!0,i=!1;try{d==null||d.close()}catch{}d=null;for(const m of o.values())try{m.close()}catch{}o.clear();try{n==null||n.destroy()}catch{}n=null,l=null,r="",g.length=0}function H(m){return new Promise((k,v)=>{const P=setTimeout(()=>v(new Error("Peer 連線逾時")),12e3);m.on("open",w=>{clearTimeout(P),k(w)}),m.on("error",w=>{clearTimeout(P),v(w)})})}function A(m){return new Promise((k,v)=>{const P=setTimeout(()=>v(new Error("無法連上房主（逾時或房號錯誤）")),12e3);m.on("open",()=>{clearTimeout(P),k()}),m.on("error",w=>{clearTimeout(P),v(w)})})}async function D(m){if(i)return;if(!r)throw new Error("尚未 connect");const k=St(r);if(m.type==="host_room"||m.type==="host_match"){n=new ie(k,de),await H(n),s=!0,n.on("connection",q),n.on("disconnected",()=>{y({type:"error",message:"連線已中斷"})}),n.on("error",v=>{y({type:"error",message:(v==null?void 0:v.message)||"Peer 錯誤"})}),i=!0;return}if(m.type==="join"){n=new ie(de),await H(n),s=!1,d=n.connect(k,{reliable:!0}),await A(d),d.on("data",v=>{try{y(v)}catch{}}),d.on("close",()=>{y({type:"error",message:"房主已斷線，房間關閉"})}),n.on("error",v=>{y({type:"error",message:(v==null?void 0:v.message)||"Peer 錯誤"})}),i=!0;return}}async function G(){for(;g.length;){const m=g[0];if(!i)try{await D(m)}catch(k){g.shift(),y({type:"error",message:k instanceof Error?k.message:"連線失敗"}),x(),b=!1;return}if(!i)return;g.shift(),M(m)}}return{clientId:e,isOnline:!0,async connect(m){b=!1,r=m.trim().toUpperCase(),i=!1,s=!1},disconnect(){x(),b=!1},send(m){g.push(m),h=h.then(()=>G()).catch(()=>{})},onMessage(m){a=m}}}function Et(e){const a=ee();let n=null,s=null;return{clientId:a,isOnline:!0,async connect(i){const l=`wss://${e}/parties/main/${encodeURIComponent(i)}?clientId=${encodeURIComponent(a)}`;n=new WebSocket(l),await new Promise((r,o)=>{if(!n)return o(new Error("no socket"));n.onopen=()=>r(),n.onerror=()=>o(new Error("WebSocket failed"))}),n.onmessage=r=>{try{const o=JSON.parse(String(r.data));s==null||s(o)}catch{}},n.onclose=()=>{s==null||s({type:"error",message:"連線已中斷"})}},disconnect(){n==null||n.close(),n=null},send(i){(n==null?void 0:n.readyState)===WebSocket.OPEN&&n.send(JSON.stringify(i))},onMessage(i){s=i}}}function xt(){const e=ee();let a=null,n=null;return{clientId:e,isOnline:!1,async connect(){},disconnect(){n=null},send(s){if(s.type==="join"&&n){const i=n.seats.find(l=>l.type==="empty");if(!i){a==null||a({type:"error",message:"房間已滿"});return}i.type="human",i.name=s.name||"玩家",i.clientId=e,i.ready=!1,a==null||a({type:"room",room:{...n,seats:[...n.seats]}});return}if(s.type==="leave"){n=null,a==null||a({type:"error",message:"已離開房間"});return}if(s.type==="host_room"){n=s.room,a==null||a({type:"room",room:s.room});return}if(s.type==="host_match"){n&&(n={...n,status:"playing",match:s.match}),a==null||a({type:"match",match:s.match});return}s.type==="start"&&n&&(a==null||a({type:"room",room:{...n,status:"playing"}}))},onMessage(s){a=s}}}function Le(e,a,n){switch(n.type){case"select_card":Ye(e,a,n.uid);break;case"select_target":Je(e,a,n.seatId);break;case"end_play":Qe(e,a);break;case"pass_response":We(e,a);break;case"cancel_target":Ge(e,a);break;case"choice":De(e,a,n.choiceId);break;case"skill":Oe(e,a,n.skillId);break;case"pick_general":Ke(e,n.generalId);break}}function wt(e){if(!e||typeof e!="object")return null;const a=e;if(typeof a.type!="string")return null;switch(a.type){case"select_card":return typeof a.uid=="string"?{type:"select_card",uid:a.uid}:null;case"select_target":return typeof a.seatId=="number"?{type:"select_target",seatId:a.seatId}:null;case"end_play":return{type:"end_play"};case"pass_response":return{type:"pass_response"};case"cancel_target":return{type:"cancel_target"};case"choice":return typeof a.choiceId=="string"?{type:"choice",choiceId:a.choiceId}:null;case"skill":return typeof a.skillId=="string"?{type:"skill",skillId:a.skillId}:null;case"pick_general":return typeof a.generalId=="string"?{type:"pick_general",generalId:a.generalId}:null;default:return null}}const Lt="0.17.0",t={screen:"start",setupMode:"duel",campaignId:null,storyKind:"campaign",stage:null,allyChoice:null,game:null,selectedUid:null,settings:nt(),detailHtml:null,aiBusy:!1,fxSettledSeq:null,matchEndPending:!1,matchPaused:!1,unlockBanners:[],liezhuanFilter:"all",coachSlide:0,lobbyVm:N(),mpClient:null,localSeatId:null},u=()=>document.querySelector("#app");function te(e){return t.localSeatId!=null&&e.players[t.localSeatId]?e.players[t.localSeatId]:e.players.find(a=>a.isHuman)??e.players[0]}function z(){return t.mpClient!=null&&t.lobbyVm.room!=null}function L(e,a){var s,i;const n=te(e);if(z()&&!t.lobbyVm.isHost){(s=t.mpClient)==null||s.send({type:"action",action:a});return}Le(e,n.id,a),z()&&t.lobbyVm.isHost&&((i=t.mpClient)==null||i.send({type:"host_match",match:e}))}function En(){p()}function p(){var n,s,i,l;const e=u();switch(t.screen){case"start":e.innerHTML=Ht(),Mt();break;case"lobby":e.innerHTML=$t(t.lobbyVm),jt();break;case"setup":e.innerHTML=Dt(),Gt();break;case"settings":e.innerHTML=Kt(),Ot();break;case"story":e.innerHTML=Qt(),Jt();break;case"liezhuan":e.innerHTML=Vt(),Ft();break;case"achievements":e.innerHTML=Nt(),Rt();break;case"stage":e.innerHTML=Yt(),Xt();break;case"table":e.innerHTML=tn(),bn(),yn();break;case"epilogue":e.innerHTML=fn(),gn();break;case"result":e.innerHTML=vn(),kn();break}t.detailHtml&&(e.insertAdjacentHTML("beforeend",_t(t.detailHtml)),(n=u().querySelector("#detail-close"))==null||n.addEventListener("click",()=>{t.detailHtml=null,p()}),(s=u().querySelector("#detail-backdrop"))==null||s.addEventListener("click",()=>{t.detailHtml=null,p()}));const a=(l=(i=t.game)==null?void 0:i.fx.play)==null?void 0:l.seq;a!==void 0?requestAnimationFrame(()=>{var r,o;((o=(r=t.game)==null?void 0:r.fx.play)==null?void 0:o.seq)===a&&(t.fxSettledSeq=a)}):t.fxSettledSeq=null}function _t(e){return`<div class="modal-backdrop" id="detail-backdrop"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-body">${e}</div>
    <button type="button" class="btn primary" id="detail-close">關閉</button>
  </div>`}function Ct(){return ot().asked?"":`<div class="modal-backdrop" id="tut-ask-backdrop"></div>
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
  </div>`}function Ht(){return`
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
      <p class="version" id="app-version">v${Lt}</p>
    </div>
    ${Ct()}
  </div>`}function ue(){qe(),t.storyKind="campaign",t.campaignId=Fe,t.screen="story",p()}function Mt(){var e,a;(e=u().querySelector("#tut-yes"))==null||e.addEventListener("click",()=>ue()),(a=u().querySelector("#tut-later"))==null||a.addEventListener("click",()=>{qe(),p()}),u().querySelectorAll("[data-go]").forEach(n=>{n.addEventListener("click",()=>{const s=n.dataset.go;if(s==="tutorial"){ue();return}s==="story"&&(t.storyKind="campaign",t.campaignId=null),s==="liezhuan"&&(t.storyKind="liezhuan",t.campaignId=null),t.screen=s,p()})})}function At(e){var n,s,i;const a=t.mpClient;if(a)if(e.type==="room"){t.lobbyVm.room=e.room,t.lobbyVm.isHost=e.room.hostClientId===a.clientId;const l=e.room.seats.find(r=>r.clientId===a.clientId);t.localSeatId=l?l.id:t.localSeatId,e.room.status==="playing"&&e.room.match&&(t.game=e.room.match,t.screen="table"),p()}else if(e.type==="match")t.game=e.match,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.aiBusy=!1,t.stage=null,t.screen="table",p(),t.lobbyVm.isHost&&t.game&&Z(t.game,()=>{t.screen==="table"&&p()});else if(e.type==="remote_action"){if(!t.lobbyVm.isHost||!t.game)return;const l=(n=t.lobbyVm.room)==null?void 0:n.seats.find(g=>g.clientId===e.clientId);if(!l||l.type!=="human")return;const r=wt(e.action);if(!r)return;const o=t.game,d=o.prompt.actorId;if(o.matchPhase!=="pick_general"&&d!==null&&d!==l.id)return;Le(o,l.id,r),(s=t.mpClient)==null||s.send({type:"host_match",match:o}),E()}else e.type==="error"&&(t.lobbyVm.error=e.message,(e.message.includes("離開")||e.message.includes("關閉"))&&((i=t.mpClient)==null||i.disconnect(),t.mpClient=null,t.lobbyVm=N(),t.localSeatId=null,t.screen="start"),p())}function pe(){return t.mpClient||(t.mpClient=qt(),t.mpClient.onMessage(At)),t.mpClient}function Tt(){var n,s,i;if(!t.lobbyVm.room||!t.lobbyVm.isHost)return;const e=vt(t.lobbyVm.room),a=e.maxPlayers>=8?"identity8":"identity5";try{const l=Ue({mode:a,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral,seats:e.seats.map(d=>({name:d.name,isHuman:d.type==="human"}))}),r=X(l),o={...e,status:"playing",match:r};t.lobbyVm.room=o,t.game=r,t.localSeatId=((n=e.seats.find(d=>{var g;return d.clientId===((g=t.mpClient)==null?void 0:g.clientId)}))==null?void 0:n.id)??0,t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,(s=t.mpClient)==null||s.send({type:"host_room",room:o}),(i=t.mpClient)==null||i.send({type:"host_match",match:r}),t.screen="table",p(),Z(r,()=>{var d;t.screen==="table"&&p(),t.lobbyVm.isHost&&t.game&&((d=t.mpClient)==null||d.send({type:"host_match",match:t.game}))})}catch(l){t.lobbyVm.error=l instanceof Error?l.message:"開局失敗",p()}}function jt(){var i,l,r,o,d,g,b;const e=t.lobbyVm;(i=u().querySelector('[data-go="start"]'))==null||i.addEventListener("click",()=>{var h;(h=t.mpClient)==null||h.disconnect(),t.mpClient=null,t.lobbyVm=N(),t.localSeatId=null,t.screen="start",p()});const a=u().querySelector("#lobby-name"),n=u().querySelector("#lobby-code"),s=h=>{const y=(a==null?void 0:a.value.trim())||"房主",c=pe(),$=ft(c.clientId,y,h);t.lobbyVm={...e,localName:y,room:$,isHost:!0,myClientId:c.clientId,error:c.isOnline?null:"本地預覽模式（VITE_MP_OFFLINE=1）"},t.localSeatId=0,c.connect($.roomId),c.send({type:"host_room",room:$}),p()};(l=u().querySelector("#lobby-create-5"))==null||l.addEventListener("click",()=>s(5)),(r=u().querySelector("#lobby-create-8"))==null||r.addEventListener("click",()=>s(8)),(o=u().querySelector("#lobby-join"))==null||o.addEventListener("click",()=>{const h=(a==null?void 0:a.value.trim())||"玩家",y=((n==null?void 0:n.value)||"").trim().toUpperCase();if(!y){t.lobbyVm.error="請輸入房號",p();return}const c=pe();t.lobbyVm={...e,localName:h,joinCode:y,isHost:!1,myClientId:c.clientId,error:c.isOnline?null:"本地預覽模式無法真正加入其他房間"},c.connect(y).then(()=>{c.send({type:"join",name:h})}),p()}),(d=u().querySelector("#lobby-copy"))==null||d.addEventListener("click",()=>{var y,c;const h=(y=t.lobbyVm.room)==null?void 0:y.roomId;h&&((c=navigator.clipboard)==null||c.writeText(h))}),(g=u().querySelector("#lobby-leave"))==null||g.addEventListener("click",()=>{var h,y;(h=t.mpClient)==null||h.send({type:"leave"}),(y=t.mpClient)==null||y.disconnect(),t.mpClient=null,t.lobbyVm=N(),t.localSeatId=null,t.screen="start",p()}),(b=u().querySelector("#lobby-start"))==null||b.addEventListener("click",()=>{Tt()})}function Bt(e){var l,r,o;const a=e.setup;if(!a)return"";const n=[],s=a.player;(l=s==null?void 0:s.equipKinds)!=null&&l.length&&n.push(`你裝備：${s.equipKinds.join("、")}`),(r=s==null?void 0:s.handKinds)!=null&&r.length&&n.push(`你指定手牌：${s.handKinds.join("、")}`),(s==null?void 0:s.handCount)!=null&&n.push(`你手牌數 ${s.handCount}`),((s==null?void 0:s.hp)!=null||(s==null?void 0:s.maxHp)!=null)&&n.push(`你體力 ${s.hp??s.maxHp}/${s.maxHp??s.hp}`);const i=a.enemies;return((i==null?void 0:i.hp)!=null||(i==null?void 0:i.maxHp)!=null)&&n.push(`敵體力 ${i.hp??i.maxHp}/${i.maxHp??i.hp}`),(o=i==null?void 0:i.equipKinds)!=null&&o.length&&n.push(`敵裝備：${i.equipKinds.join("、")}`),n.length?`<p class="intel-pack">特殊開局：${n.map(f).join("　·　")}</p>`:""}function zt(e){if(!xe(e)||t.coachSlide<0||e.winnerIds)return"";const a=Ee(e.config.campaignStageId);if(!a.length||t.coachSlide>=a.length)return"";const n=a[t.coachSlide],s=a.length,i=t.coachSlide>=s-1;return`<div class="coach-layer" role="dialog" aria-modal="true">
    <div class="coach-box">
      <p class="coach-kicker">教學 ${t.coachSlide+1}/${s}</p>
      <h3>${f(n.title)}</h3>
      <p>${f(n.body)}</p>
      <div class="coach-actions">
        <button type="button" class="btn primary" id="coach-next">${i?"開始實戰":"下一步"}</button>
        <button type="button" class="btn ghost" id="coach-skip">略過本關講解</button>
      </div>
    </div>
  </div>`}function me(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function Vt(){const e=W().filter(i=>t.liezhuanFilter==="all"?!0:i.kingdom===t.liezhuanFilter),a=["all","wei","shu","wu","qun"],n=W().filter(i=>le(i.id)).length,s=W().length;return`
  <div class="screen panel-screen liezhuan-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>武將列傳</h2>
    </header>
    <p class="story-intro">每位武將皆有個人列傳（一至數關）。通關後解鎖該武將的 Q 版造型；預設無造型。</p>
    <p class="lz-progress">已解鎖造型 ${n}/${s}</p>
    <div class="lz-filters">
      ${a.map(i=>{const l=i==="all"?"全部":me(i);return`<button type="button" class="btn ${t.liezhuanFilter===i?"primary":"ghost"}" data-filter="${i}">${l}</button>`}).join("")}
    </div>
    <ul class="lz-grid">
      ${e.map(i=>{const l=ve(i.id);if(!l)return"";const r=Q(l.id),o=Math.min(r-1,l.stages.length),d=le(i.id),g=O(i.id)==="chibi",b=d?J(i):Ut(i);return`<li class="lz-card ${d?"done":""}">
            <button type="button" class="lz-open" data-lz="${i.id}">
              <img class="lz-avatar ${d?"chibi-on":""}" src="${b}" alt="" />
              <span class="lz-name">${f(i.name)}</span>
              <span class="lz-meta">${me(i.kingdom)}・${l.stages.length} 關・${o}/${l.stages.length}</span>
              <span class="lz-badge">${d?g?"Q 版已裝備":"已解鎖":"尚無造型"}</span>
            </button>
            ${d?`<button type="button" class="btn ghost lz-toggle" data-skin="${i.id}">${g?"卸下造型":"裝備 Q 版"}</button>`:""}
          </li>`}).join("")}
    </ul>
  </div>`}function Ut(e){return R(e)}function Ft(){var e;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",p()}),u().querySelectorAll("[data-filter]").forEach(a=>{a.addEventListener("click",()=>{t.liezhuanFilter=a.dataset.filter,p()})}),u().querySelectorAll("[data-lz]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.lz,s=ve(n);s&&(t.storyKind="liezhuan",t.campaignId=s.id,t.screen="story",p())})}),u().querySelectorAll("[data-skin]").forEach(a=>{a.addEventListener("click",n=>{n.stopPropagation();const s=a.dataset.skin,i=O(s)==="chibi";lt(s,i?null:Pe),p()})})}function Nt(){const e=at(),{unlocked:a,total:n}=st();return`
  <div class="screen panel-screen ach-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>成就</h2>
    </header>
    <p class="story-intro">完成列傳可解鎖 Q 版造型。成就進度 ${a}/${n}。</p>
    ${[{kind:"feat",title:"功業"},{kind:"campaign",title:"劇情傳記"},{kind:"set",title:"勢力集齊"},{kind:"liezhuan",title:"武將列傳"}].map(i=>{const l=e.filter(r=>r.kind===i.kind);return`<section class="ach-group">
          <h3>${i.title}</h3>
          <ul class="ach-list">
            ${l.map(r=>{const o=it(r.id),d=r.generalId?S(r.generalId):null,g=d?`<img src="${o?J(d):R(d)}" alt="" />`:"";return`<li class="ach-item ${o?"on":""}">
                  ${g}
                  <div>
                    <strong>${f(r.title)}</strong>
                    <span>${f(r.hint)}</span>
                  </div>
                  <em>${o?"已達成":"未達成"}</em>
                </li>`}).join("")}
          </ul>
        </section>`}).join("")}
  </div>`}function Rt(){var e;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",p()})}function Kt(){const e=t.settings,a=!!e.aiApiToken.trim();return`
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
        ${$e.map(n=>{const s=e.enabledPacks.includes(n.id),i=!!n.alwaysOn;return`<label class="field check">
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
  </div>`}function Ot(){var n,s;const e=u().querySelector("#think-delay"),a=u().querySelector("#delay-label");e.addEventListener("input",()=>{a.textContent=`${(Number(e.value)/1e3).toFixed(1)} 秒`}),(n=u().querySelector("[data-back]"))==null||n.addEventListener("click",()=>{t.screen="start",p()}),(s=u().querySelector("#save-settings"))==null||s.addEventListener("click",()=>{const i=$e.filter(l=>{if(l.alwaysOn)return!0;const r=u().querySelector(`[data-pack="${l.id}"]`);return!!(r!=null&&r.checked)}).map(l=>l.id);t.settings={thinkDelayMs:Number(e.value),showPortraits:u().querySelector("#show-portraits").checked,forceSelectGeneral:u().querySelector("#force-select").checked,enabledPacks:i,aiApiToken:u().querySelector("#ai-token").value.trim(),aiApiBaseUrl:u().querySelector("#ai-base").value.trim()||"https://api.openai.com/v1",aiModel:u().querySelector("#ai-model").value.trim()||"gpt-4o-mini",showAiDebug:u().querySelector("#ai-debug").checked},rt(t.settings),t.screen="start",p()})}function Dt(){return`
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
      <p class="hint">卡包：${ge(t.settings.enabledPacks)}（可在設定中變更；預設僅標準包）</p>
      <p class="hint">進入對局後會先看到座位與身份，再從系統隨機抽出的三名武將中選擇（可在設定改為全部可選）。</p>
      <button type="button" class="btn primary" id="start-match">開始對戰</button>
    </div>
  </div>`}function ne(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function Gt(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",p()}),(a=u().querySelector("#start-match"))==null||a.addEventListener("click",()=>{Wt()})}async function Wt(){const e=u().querySelector("#mode").value;t.setupMode=e;const a=Ve({mode:e,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral});t.game=X(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,t.screen="table",p()}function Qt(){if(!t.campaignId)return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情模式</h2>
    </header>
    <p class="story-intro">選擇傳記。關卡會依登場武將自動啟用對應卡包（風／火／林／山／一將等）。</p>
    <ul class="stage-list campaign-pick">
      ${je.map(n=>{const s=Q(n.id),i=Math.min(s-1,n.stages.length);return`<li>
          <button type="button" data-campaign="${n.id}">
            <span class="idx">${f(n.title)}</span>
            <span class="st">${f(n.blurb)}</span>
            <span class="sub">進度 ${i}/${n.stages.length}</span>
          </button>
        </li>`}).join("")}
    </ul>
  </div>`;const e=Be(t.campaignId),a=Q(e.id);return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back-campaigns>${F(t.campaignId)?"返回標題":t.storyKind==="liezhuan"?"列傳列表":"傳記列表"}</button>
      <h2>${F(t.campaignId)?f(e.title):`劇情・${f(e.title)}`}</h2>
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
  </div>`}function Jt(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",p()}),(a=u().querySelector("[data-back-campaigns]"))==null||a.addEventListener("click",()=>{if(F(t.campaignId)){t.campaignId=null,t.screen="start",p();return}if(t.storyKind==="liezhuan"){t.campaignId=null,t.screen="liezhuan",p();return}t.campaignId=null,p()}),u().querySelectorAll("[data-campaign]").forEach(n=>{n.addEventListener("click",()=>{t.campaignId=n.dataset.campaign,p()})}),u().querySelectorAll("[data-stage]").forEach(n=>{n.addEventListener("click",()=>{var l,r;const s=n.dataset.stage,i=ke(s);t.stage=(i==null?void 0:i.stage)??null,t.campaignId=(i==null?void 0:i.campaign.id)??t.campaignId,t.allyChoice=((r=(l=t.stage)==null?void 0:l.allyChoices)==null?void 0:r[0])??null,t.screen="stage",p()})})}function Yt(){var g;const e=t.stage,a=e.allyChoices??[],n=f(e.briefing).split(/\n+/).filter(Boolean).map(b=>`<p>${b}</p>`).join(""),s=e.prevLink?`<p class="story-bridge">${f(e.prevLink)}</p>`:"",i=e.allies.map(b=>b.name?b.name:S(b.generalId).name),l=e.enemies.map(b=>b.name??S(b.generalId).name),r=S(e.playerGeneralId).name,o=`
    <section class="intel-block">
      <h4>參戰勢力</h4>
      <div class="force-cols">
        <div>
          <p class="force-side">我方</p>
          <ul class="force-list">
            <li>${f(r)}</li>
            ${i.map(b=>`<li>${f(b)}</li>`).join("")}
            ${a.length?'<li class="force-pick">＋自選副將</li>':""}
          </ul>
        </div>
        <div>
          <p class="force-side foe">敵方</p>
          <ul class="force-list">
            ${l.map(b=>`<li>${f(b)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="intel-block">
      <h4>關卡設定</h4>
      <p class="intel-pack">卡包：${ge(Te(e))}${(g=e.requiredCardKinds)!=null&&g.length?`　·　必備：${e.requiredCardKinds.map(b=>b==="tiesuo"?"鐵索連環":b).join("、")}`:""}</p>
      <p class="intel-pack">勝利：${e.victory.type==="kill_target"?`擊殺 ${S(e.victory.targetGeneralId).name}`:e.victory.type==="survive_rounds"?`堅守突圍 ${e.victory.rounds??4} 輪（或擊潰追兵）`:"殲滅敵軍"}</p>
      ${Bt(e)}
    </section>`,d=fe({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds,intelExtraHtml:o});return`
  <div class="screen story-brief-screen">
    <header class="topbar story-brief-top">
      <button type="button" class="btn ghost" data-back>返回</button>
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${f(e.era)}・第${e.index}關</p>
        <h2>${e.title}</h2>
        <p class="story-brief-sub">${f(e.subtitle)}</p>
      </div>
    </header>
    ${d}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="關卡劇情">
        <div class="story-hand">${s}${n}</div>
      </div>
      <div class="panel story-ready">
        ${a.length?`<label class="field"><span>自選副將</span>
              <select id="ally">${a.map(b=>{const h=S(b==="dianwei_proxy"?"xuchu":b),y=b==="dianwei_proxy"?`${h.name}（代典韋）`:h.name;return`<option value="${b}" ${t.allyChoice===b?"selected":""}>${y}</option>`}).join("")}</select></label>`:'<p class="meta">確認戰局後進入戰鬥</p>'}
        <button type="button" class="btn primary" id="enter-stage">下一步</button>
      </div>
    </div>
  </div>`}function Xt(){var e,a;(e=u().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="story",p()}),(a=u().querySelector("#enter-stage"))==null||a.addEventListener("click",()=>{Zt()})}async function Zt(){var n;const e=(n=u().querySelector("#ally"))==null?void 0:n.value;t.allyChoice=e??null;const a=ze(t.stage,t.allyChoice??void 0);t.game=X(a),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.coachSlide=0,t.screen="table",p(),await E()}function _e(e,a,n){if(e.identity==="none")return"";const s={lord:"主公",loyal:"忠臣",rebel:"反賊",spy:"內奸"}[e.identity]??"";return n==="duel"?"":e.id===a.id?s:e.identity==="lord"?"主公":e.alive?"？":s}function en(e){const a=e.winnerIds.includes(0);return`<div class="match-end-overlay" role="dialog" aria-modal="true" aria-labelledby="match-end-title">
    <div class="match-end-card">
      <p class="match-end-kicker">${a?"我方勝":"敵方勝"}</p>
      <h2 id="match-end-title">${a?"勝利":"敗北"}</h2>
      <p class="match-end-msg">${f(e.resultMessage??"")}</p>
      <button type="button" class="btn primary" id="ack-match-end">下一步</button>
    </div>
  </div>`}function tn(){const e=t.game,a=te(e),n=e.prompt,s=e.matchPhase==="pick_general",i=!!e.winnerIds,l=n.actorId===a.id&&!t.aiBusy&&!s&&!i&&!t.matchPaused,r=e.players.length,o=!i&&!t.matchPaused&&n.kind==="choice"&&n.choiceKey==="wuxie"&&n.actorId!==a.id,d=(()=>{if(i||t.matchPaused)return t.matchPaused?'<div class="thinking paused-banner">對局已暫停</div>':"";if(o)return'<div class="thinking">有角色正在考慮是否使用【無懈可擊】…</div>';if(n.actorId!==null&&n.actorId!==a.id&&(t.aiBusy||z())){const c=e.players[n.actorId],$=c!=null&&c.isHuman?"操作中":"思考中";return`<div class="thinking">${U(c.name,n.actorId)} ${$}…</div>`}return""})(),g=e.players.map(c=>({id:c.id,name:c.name,generalName:c.generalId?S(c.generalId).name:void 0})),b=i?"":o?"等待【無懈可擊】結算…":ht(e,t.selectedUid),h=t.selectedUid&&n.kind==="choose_card"?"已選取手牌 — 再點一次同一張牌以打出，或點其他牌改選":o?"等待【無懈可擊】結算…":n.message||"等待中…",y=l&&!i;return`
  <div class="screen table-screen ${i?"match-ended":""} ${t.matchPaused?"match-paused":""} ${xe(e)?"tutorial-match":""}">
    <header class="battle-top">
      <div>
        <strong>${s?"選將階段":`第 ${e.round} 輪`}</strong>
        <span class="phase">${s?"請選擇武將":dn(e.phase)}</span>
      </div>
      <div class="battle-top-right">
        <div class="deck-info">${s?`座位 ${r} 人`:`牌堆 ${e.deck.length}　棄牌 ${e.discard.length}`}</div>
        ${i?"":`<button type="button" class="btn ghost" id="pause-match">${t.matchPaused?"繼續":"暫停"}</button>`}
      </div>
    </header>
    ${d}
    <div class="arena" style="--n:${r}" id="arena">
      ${e.players.map(c=>{var V;const $=!!c.generalId,q=$?S(c.generalId):null,M=!s&&e.currentPlayer===c.id,x=!s&&n.kind==="choose_target"&&((V=n.targetIds)==null?void 0:V.includes(c.id))&&l,H=(c.id-a.id+r)%r,A=H/r*360+90,D=c.id===a.id?"—":String(Xe(e,a.id,c.id)),G=!s&&c.id!==a.id&&c.alive&&$&&Ze(e,a.id,c.id)?"in-range":"",m=_e(c,a,e.config.mode),k=e.fx.damages.find(I=>I.playerId===c.id),v=Ae(c.id),P=t.settings.showPortraits&&q?`<img class="portrait ${O(q.id)==="chibi"?"chibi-on":""}" src="${R(q)}" alt="" width="48" height="48" />`:t.settings.showPortraits?'<div class="portrait portrait-empty" aria-hidden="true">？</div>':"",w=$?`<button type="button" class="info-btn" data-info-seat="${c.id}" title="詳情" aria-label="詳情">ℹ</button>`:"";return`<div class="seat-wrap" style="--angle:${A}deg;--seat-c:${v}" data-visual="${H}" data-seat-pos="${c.id}">
            <div class="seat ${c.alive?"":"dead"} ${M?"active":""} ${c.id===a.id?"human":c.isHuman?"human-remote":""} ${x?"targetable":""} ${G} ${s&&!$?"hidden-gen":""} ${k?"hurt":""}" data-seat="${c.id}" role="${x?"button":"group"}" tabindex="${x?"0":"-1"}">
              ${P}
              <div class="seat-head">
                <span class="seat-gen">${q?f(q.name):"未亮將"}</span>
                ${w}
              </div>
              <div class="seat-name">${f(c.name)}${m?`・${m}`:""}</div>
              <div class="hp">${$?on(c.hp,c.maxHp):"—"}</div>
              <div class="equip">${$?cn(c):s?"等待選將":"無裝備"}</div>
              <div class="meta-row"><span>手牌 ${s?"—":c.hand.length}</span><span class="dist">距 ${D}</span></div>
              ${k?`<span class="dmg-float" data-dmg-seq="${k.seq}">-${k.amount}</span>`:""}
            </div>
          </div>`}).join("")}
      ${ln(e,a.id,r)}
    </div>
    ${b?`<div class="action-hint ${y?"loud":""}" role="status">${f(b)}</div>`:""}
    <div class="prompt-bar ${y?"prompt-loud":""}">${ae(h,g)}</div>
    ${zt(e)}
    ${s?an(e):""}
    ${!s&&l&&(n.kind==="choice"||n.kind==="skill_cards")?nn(e):""}
    ${!s&&l&&n.kind==="choose_card"?`<div class="skill-row">${et(e,a.id).map(c=>`<button type="button" class="btn ghost" data-skill="${c.id}" title="${f(c.hint)}">${f(c.label)}</button>`).join("")}</div>`:""}
    ${s?"":`<div class="hand">
      ${a.hand.map(c=>{var H,A;const $=_(c.defId),q=l&&!!((H=n.cardUids)!=null&&H.includes(c.uid))&&(n.kind==="choose_card"||n.kind==="discard"||n.kind==="respond_shan"||n.kind==="respond_sha"||n.kind==="skill_cards"),M=t.selectedUid===c.uid||n.kind==="skill_cards"&&!!((A=n.selectedCardUids)!=null&&A.includes(c.uid)),x=$.suit==="heart"||$.suit==="diamond";return`<div class="card-wrap">
            <button type="button" class="card ${q?"selectable":""} ${M?"selected":""} ${x?"red":"black"}" data-uid="${c.uid}" ${q?"":"disabled"}>
              <span class="csuit ${x?"red":""}">${Y($.suit)}${K($.rank)}</span>
              <span class="cname">${$.name}</span>
              <span class="ctype">${Ce($)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${c.uid}" title="牌面說明">ℹ</button>
          </div>`}).join("")}
    </div>`}
    <div class="log" aria-live="polite">${[...e.log].slice(-8).map((c,$,q)=>`<div class="${$===q.length-1?"log-latest":""}">${ae(c.text,g)}</div>`).join("")}</div>
    <div class="actions">
      <div class="actions-main">
      ${!s&&l&&n.kind==="choose_card"&&t.selectedUid?'<button type="button" class="btn ghost" id="cancel-select">取消選牌</button>':""}
      ${!s&&l&&n.kind==="choose_card"?'<button type="button" class="btn" id="end-play">結束出牌</button>':""}
      ${!s&&l&&(n.kind==="respond_shan"||n.kind==="respond_sha")?'<button type="button" class="btn" id="pass-resp">放棄</button>':""}
      ${!s&&l&&(n.kind==="choose_target"||n.kind==="skill_cards"||n.kind==="choice"&&(n.choiceKey==="fangtian_confirm"||n.choiceKey==="rende_target"||n.choiceKey==="zhangba_target"))?'<button type="button" class="btn" id="cancel-tgt">取消</button>':""}
      </div>
      <div class="actions-quit">
        <button type="button" class="btn ghost danger" id="flee">退出對局</button>
      </div>
    </div>
    ${i?en(e):""}
  </div>`}function nn(e){var r;const a=e.prompt.choices??[];if(!a.length)return"";const n=e.prompt.kind==="skill_cards",s=e.prompt.choiceKey==="zone_pick",i=((r=e.prompt.selectedCardUids)==null?void 0:r.length)??0,l=e.prompt.minTargets??1;return`<div class="choice-panel">
    <h3>${f(e.prompt.message)}</h3>
    <div class="choice-row">
      ${a.map(o=>{var h;const d=(n||s)&&o.id==="confirm"&&i<l,g=s&&!!((h=e.prompt.selectedCardUids)!=null&&h.includes(o.id));return`<button type="button" class="${["btn",o.id==="skip"||o.id==="no"?"ghost":"primary",g?"selected-pick":""].filter(Boolean).join(" ")}" data-choice="${o.id}" ${d?"disabled":""}>${f(o.label)}</button>`}).join("")}
    </div>
  </div>`}function an(e){const a=e.prompt.generalIds??[];return`<div class="pick-panel">
    <h3>${a.length>3?"選擇武將（全部可選）":"系統隨機三將，請選一"}</h3>
    <div class="pick-grid">
      ${a.map(s=>{const i=S(s);return`<div class="pick-card">
            ${t.settings.showPortraits?`<img class="pick-portrait ${O(i.id)==="chibi"?"chibi-on":""}" src="${R(i)}" alt="" />`:""}
            <div class="pick-name">${i.name}</div>
            <div class="pick-meta">${ne(i.kingdom)}・${i.maxHp} 血</div>
            <p class="pick-skill">${f(i.skillText)}</p>
            <div class="pick-actions">
              <button type="button" class="btn ghost" data-gen-info="${s}">詳情</button>
              <button type="button" class="btn primary" data-pick-gen="${s}">選定</button>
            </div>
          </div>`}).join("")}
    </div>
  </div>`}function he(e,a,n){const l=((e-a+n)%n/n*360+90)*Math.PI/180,r=38;return{x:50+Math.cos(l)*r,y:50+Math.sin(l)*r}}function sn(e,a){var n;if(e.fx.play)return e.fx.play;if(e.prompt.kind==="choose_target"&&((n=e.prompt.cardUids)!=null&&n[0])&&e.prompt.actorId!==null){const s=e.players[e.prompt.actorId],i=s==null?void 0:s.hand.find(l=>l.uid===e.prompt.cardUids[0]);if(i){const l=_(i.defId);return{cardName:l.name,suit:l.suit,rank:l.rank,sourceId:e.prompt.actorId,targetIds:[],note:"選擇目標",seq:0}}}return null}function ln(e,a,n){const s=sn(e);if(!s&&!e.fx.damages.length)return'<div class="arena-center" aria-hidden="true"><span>距離</span></div>';const i=!!(s&&t.fxSettledSeq===s.seq),l=s?he(s.sourceId,a,n):null,r=s&&l?s.targetIds.filter(b=>b!==s.sourceId).map(b=>{const h=he(b,a,n);return rn(l.x,l.y,h.x,h.y,s.seq,i)}).join(""):"",o=s&&s.targetIds.length===1&&s.targetIds[0]===s.sourceId?`<div class="fx-self-ring ${i?"fx-settled":""}" style="left:${l.x}%;top:${l.y}%"></div>`:"",d=s&&(s.suit==="heart"||s.suit==="diamond"),g=s?`<div class="fx-card ${d?"red":"black"} ${i?"fx-settled":""}" data-fx-seq="${s.seq}">
        <span class="csuit">${Y(s.suit)}${K(s.rank)}</span>
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
        ${r}
      </svg>
      ${o}
      <div class="fx-card-slot">${g||'<span class="arena-center-label">距離</span>'}</div>
    </div>`}function rn(e,a,n,s,i,l=!1){const r=n-e,o=s-a,d=Math.hypot(r,o)||1,g=Math.min(8,d*.2),b=e+r/d*g,h=a+o/d*g,y=n-r/d*g,c=s-o/d*g;return`<line class="fx-arrow-line ${l?"fx-settled":""}" data-fx-seq="${i}" x1="${b}" y1="${h}" x2="${y}" y2="${c}" marker-end="url(#arrowHead)" />`}function on(e,a){const n=Math.max(0,e);return"●".repeat(n)+"○".repeat(Math.max(0,a-n))}function cn(e){const a=[];if(e.equips.weapon){const n=_(e.equips.weapon.defId),s=n.attackRange??1;a.push(`<span class="eq-line eq-weapon">${f(n.name)} <em>攻${s}</em></span>`)}if(e.equips.armor){const n=_(e.equips.armor.defId);a.push(`<span class="eq-line eq-armor">${f(n.name)}</span>`)}if(e.equips.horseMinus){const n=_(e.equips.horseMinus.defId);a.push(`<span class="eq-line eq-horse">-1 ${f(n.name)}</span>`)}if(e.equips.horsePlus){const n=_(e.equips.horsePlus.defId);a.push(`<span class="eq-line eq-horse">+1 ${f(n.name)}</span>`)}for(const n of e.judges??[]){const s=_(n.defId);a.push(`<span class="eq-line eq-judge">判定・${f(s.name)}</span>`)}return a.length?a.join(""):"無裝備"}function dn(e){return{prepare:"準備",judge:"判定",draw:"摸牌",play:"出牌",discard:"棄牌",end:"結束"}[e]??e}function un(e){return{basic:"基本",trick:"錦囊",equip:"裝備"}[e]??e}function Ce(e){return e.slot==="weapon"?`武器・攻${e.attackRange??1}`:e.slot==="armor"?"防具":e.slot==="horseMinus"?"-1坐騎":e.slot==="horsePlus"?"+1坐騎":un(e.type)}function pn(e){if(!e.generalId)return`<h3>${U(e.name,e.id)}</h3><p class="muted">尚未亮出武將。</p>`;const a=S(e.generalId),n=["weapon","armor","horseMinus","horsePlus"].map(r=>{const o=e.equips[r];if(!o)return null;const d=_(o.defId);let g="";return r==="weapon"?g=`攻擊範圍 ${d.attackRange??1}`:r==="horseMinus"?g="-1 坐騎（與其他角色距離-1）":r==="horsePlus"?g="+1 坐騎（其他角色與你距離+1）":r==="armor"&&(g="防具"),`<li><strong>${f(d.name)}</strong>（${Se(d.suit)}${K(d.rank)}）· ${g}<br/><span class="muted">${Ie[d.kind]??""}</span></li>`}).filter(Boolean).join(""),s=t.game;let i="";s&&(s.config.mode==="identity5"||s.config.mode==="identity8")&&(i=tt(s,e.id),t.settings.showAiDebug||(i=i.replace(/<p class="mind-thought">[\s\S]*?<\/p>/,"")));const l=s&&(()=>{const r=s.players.find(d=>d.isHuman);if(!r)return"";const o=_e(e,r,s.config.mode);return o?`<p class="muted">公開身份資訊：${o}</p>`:""})();return`<h3>${U(a.name,e.id)} <span class="muted">·</span> ${U(e.name,e.id)}</h3>
    <p class="muted">${ne(a.kingdom)}・${a.maxHp} 血・${a.gender==="female"?"女":"男"}</p>
    ${l??""}
    <h4>武將技</h4>
    <p>${f(a.skillText)}</p>
    <h4>裝備</h4>
    ${n?`<ul class="detail-list">${n}</ul>`:'<p class="muted">無</p>'}
    ${i}`}function mn(e){const a=S(e);return`<h3>${a.name}</h3>
    <p class="muted">${ne(a.kingdom)}・體力上限 ${a.maxHp}・${a.gender==="female"?"女":"男"}</p>
    <h4>武將技</h4>
    <p>${f(a.skillText)}</p>`}function hn(e,a){const n=a.hand.find(i=>i.uid===e);if(!n)return"<p>找不到此牌</p>";const s=_(n.defId);return`<h3>${s.name}</h3>
    <p>${Y(s.suit)} ${Se(s.suit)} ${K(s.rank)}　·　${Ce(s)}</p>
    <p>${Ie[s.kind]??"暫無說明。"}</p>`}async function E(){var a;const e=t.game;if(!(!e||t.aiBusy||t.matchPaused)&&e.matchPhase!=="pick_general"){if(e.fx.play||e.fx.damages.length){t.aiBusy=!0,p();const n=Math.min(Math.max(t.settings.thinkDelayMs,500),1e3);if(await new Promise(s=>setTimeout(s,n)),t.matchPaused){t.aiBusy=!1,p();return}ye(e)&&!e.winnerIds&&se(e),t.aiBusy=!1,p()}if(e.winnerIds){be(),p();return}if(!t.matchPaused){t.aiBusy=!0,p();try{if(z()&&!t.lobbyVm.isHost)return;await Z(e,()=>{var n;t.screen==="table"&&t.game===e&&p(),z()&&t.lobbyVm.isHost&&t.game&&((n=t.mpClient)==null||n.send({type:"host_match",match:t.game}))},()=>t.matchPaused)}finally{t.aiBusy=!1}if(z()&&t.lobbyVm.isHost&&t.game&&((a=t.mpClient)==null||a.send({type:"host_match",match:t.game})),t.matchPaused){p();return}ye(e)&&!e.winnerIds&&se(e),be(),p()}}}function ye(e){const a=e.prompt.kind;return a==="choose_card"||a==="discard"||a==="game_over"||a==="idle"||a==="choose_general"}function yn(){const e=u().querySelector(".log");if(!e)return;const a=e.querySelector(".log-latest");a&&a.scrollIntoView({block:"nearest",behavior:"instant"}),e.scrollTop=e.scrollHeight}function bn(){var n,s,i,l,r,o,d,g,b;const e=t.game,a=te(e);(n=u().querySelector("#coach-next"))==null||n.addEventListener("click",()=>{const h=Ee(e.config.campaignStageId);t.coachSlide+1>=h.length?t.coachSlide=-1:t.coachSlide+=1,p()}),(s=u().querySelector("#coach-skip"))==null||s.addEventListener("click",()=>{t.coachSlide=-1,p()}),u().querySelectorAll("[data-choice]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choice"&&e.prompt.kind!=="skill_cards"||e.prompt.actorId!==a.id)return;const y=h.dataset.choice;L(e,{type:"choice",choiceId:y}),E()})}),u().querySelectorAll("[data-skill]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choose_card"||e.prompt.actorId!==a.id)return;const y=h.dataset.skill;L(e,{type:"skill",skillId:y}),t.selectedUid=null,E()})}),u().querySelectorAll("[data-gen-info]").forEach(h=>{h.addEventListener("click",()=>{const y=h.dataset.genInfo;t.detailHtml=mn(y),p()})}),u().querySelectorAll("[data-pick-gen]").forEach(h=>{h.addEventListener("click",()=>{const y=h.dataset.pickGen;L(e,{type:"pick_general",generalId:y}),t.detailHtml=null,p(),E()})}),u().querySelectorAll("[data-info-seat]").forEach(h=>{h.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const c=Number(h.dataset.infoSeat);t.detailHtml=pn(e.players[c]),p()})}),u().querySelectorAll("[data-info-card]").forEach(h=>{h.addEventListener("click",y=>{y.stopPropagation(),y.preventDefault();const c=h.dataset.infoCard;t.detailHtml=hn(c,a),p()})}),u().querySelectorAll(".card.selectable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=h.dataset.uid;if(e.prompt.kind==="choose_card"){if(t.selectedUid!==y){t.selectedUid=y,p();return}L(e,{type:"select_card",uid:y}),t.selectedUid=null,E();return}if(e.prompt.kind==="skill_cards"){L(e,{type:"select_card",uid:y}),p();return}L(e,{type:"select_card",uid:y}),t.selectedUid=null,E()})}),(i=u().querySelector("#cancel-select"))==null||i.addEventListener("click",()=>{t.selectedUid=null,p()}),u().querySelectorAll(".seat.targetable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const y=Number(h.dataset.seat);L(e,{type:"select_target",seatId:y}),E()})}),(l=u().querySelector("#end-play"))==null||l.addEventListener("click",()=>{t.aiBusy||(L(e,{type:"end_play"}),E())}),(r=u().querySelector("#pass-resp"))==null||r.addEventListener("click",()=>{t.aiBusy||(L(e,{type:"pass_response"}),E())}),(o=u().querySelector("#cancel-tgt"))==null||o.addEventListener("click",()=>{L(e,{type:"cancel_target"}),p()}),(d=u().querySelector("#ack-match-end"))==null||d.addEventListener("click",()=>{t.matchEndPending=!1,t.screen=t.stage?"epilogue":"result",p()}),(g=u().querySelector("#pause-match"))==null||g.addEventListener("click",()=>{if(t.matchPaused){t.matchPaused=!1,p(),E();return}t.matchPaused=!0,p()}),(b=u().querySelector("#flee"))==null||b.addEventListener("click",()=>{window.confirm("確定要退出對局嗎？進度不會保存。")&&(t.game=null,t.aiBusy=!1,t.matchEndPending=!1,t.matchPaused=!1,t.screen=t.stage?"story":"start",p())})}function be(){const e=t.game;if(!(e!=null&&e.winnerIds)){t.matchEndPending=!1;return}if(!t.matchEndPending){const a=e.winnerIds.includes(0);if(ct({won:a,identity:e.config.mode==="identity5"||e.config.mode==="identity8"}),e.config.campaignStageId&&a){const n=ke(e.config.campaignStageId);if(n){Ne(n.campaign.id,n.stage.index),dt();const s=[];if(Re(n.campaign.id)&&n.stage.index>=n.campaign.stages.length){const i=n.campaign.id.slice(3),l=S(i);ut(i,Pe)&&s.push({kind:"skin",title:"解鎖 Q 版造型",detail:`${l.name}・簡單 Q 版角色樣`,generalId:i})}F(n.campaign.id)&&n.stage.index>=n.campaign.stages.length&&pt(),s.push(...re()),t.unlockBanners=s}}else a&&(t.unlockBanners=re());t.matchEndPending=!0}}function fn(){var r;const e=t.stage,a=t.game,n=!!((r=a.winnerIds)!=null&&r.includes(0)),s=Me(e,a),i=f(s).split(/\n+/).filter(Boolean).map(o=>`<p>${o}</p>`).join(""),l=fe({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds});return`
  <div class="screen story-brief-screen epilogue-screen">
    <header class="topbar story-brief-top">
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${n?"戰後・勝":"戰後・敗"}・${f(e.era)}</p>
        <h2>${e.title}</h2>
      </div>
    </header>
    ${l}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="戰後劇情">
        <div class="story-hand">${i}</div>
      </div>
      <div class="panel story-ready">
        <button type="button" class="btn primary" id="epilogue-next">下一步</button>
      </div>
    </div>
  </div>`}function gn(){var e;(e=u().querySelector("#epilogue-next"))==null||e.addEventListener("click",()=>{t.screen="result",p()})}function vn(){var i;const e=t.game,a=(i=e.winnerIds)==null?void 0:i.includes(0),n=t.unlockBanners,s=n.length?`<ul class="unlock-list">${n.map(l=>{const r=l.kind==="skin"&&l.generalId?`<img class="unlock-chibi" src="${J(S(l.generalId))}" alt="" />`:"";return`<li class="unlock-item ${l.kind}">${r}<div><strong>${f(l.title)}</strong><span>${f(l.detail)}</span></div></li>`}).join("")}</ul>`:"";return`
  <div class="screen panel-screen result-screen">
    <h2>${a?"勝利":"敗北"}</h2>
    <p>${f(e.resultMessage??"")}</p>
    ${s}
    <div class="cta-row">
      <button type="button" class="btn primary" id="again">再來一局</button>
      <button type="button" class="btn" id="home">回首頁</button>
      ${t.stage?`<button type="button" class="btn" id="story">${t.storyKind==="liezhuan"?"列傳關卡":"關卡列表"}</button>`:""}
    </div>
  </div>`}function kn(){var e,a,n;(e=u().querySelector("#home"))==null||e.addEventListener("click",()=>{t.game=null,t.stage=null,t.unlockBanners=[],t.screen="start",p()}),(a=u().querySelector("#story"))==null||a.addEventListener("click",()=>{t.game=null,t.unlockBanners=[],t.screen="story",p()}),(n=u().querySelector("#again"))==null||n.addEventListener("click",()=>{if(t.unlockBanners=[],t.stage){t.screen="stage",p();return}t.screen="setup",p()})}function f(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{En as s};
