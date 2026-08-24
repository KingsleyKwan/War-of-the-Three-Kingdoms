import{r as be,f as fe}from"./ai-DUUczygG.js";import{g as S,i as ye,h as z,a as v,j as ve,r as X,s as $e,k as H,e as K,m as B,o as A,p as Y,q as ke,l as _,t as Z,f as C,C as Se,u as Ie,v as w,w as J,P as ee,d as L,x as te,y as ae,z as qe,B as xe,T as Ee,D as Pe,E as Le}from"./data-BRG6pqhp.js";import{k as we,m as He,l as Ae,r as Me,a as _e,n as Te,b as T,s as Ce,e as ze,p as Be,f as je,d as D,o as se}from"./engine-ClETg1el.js";import{l as Ue,g as M,a as Fe,b as Ke,i as De,h as N,s as Ne,c as Re,m as ne,d as Ge,r as Oe,e as Qe,u as Ve,f as We,j as R,C as ie}from"./persist-DziTBo-J.js";const Xe={tutorial_01:[{title:"座位與體力",body:"周圍是各座位。紅心是體力。你永遠在畫面靠近自己的一側。點座位上的 ℹ 可看武將技能。"},{title:"手牌區",body:"底部一排是你的手牌。亮起、可點的牌才是現在能用的。點 ℹ 看牌面說明。"},{title:"出【殺】",body:"出牌階段點一張【殺】（再點一次打出），然後點亮起的敵方座位作為目標。對方可出【閃】抵消。"},{title:"結束與棄牌",body:"不想再出牌就按「結束出牌」。手牌多過體力上限時，要棄到上限。完成後輪到對手。"}],tutorial_02:[{title:"裝備區",body:"座位上「裝備」那一行就是裝備區。本關你已戴上【諸葛連弩】：攻擊範圍 1，但一回合可出多張【殺】。"},{title:"錦囊",body:"【無中生有】摸兩張；【過河拆橋】選一名角色，棄其手牌或裝備（手牌背面看不見內容）。錦囊多數無距離限制。"},{title:"再出殺",body:"有連弩時，出完一張【殺】後仍可再出【殺】。打完按「結束出牌」。"}],tutorial_03:[{title:"瀕死",body:"體力到 0 會問全場是否出【桃】。救到體力大於 0 才活。問到你時，亮起的【桃】點兩下打出。"},{title:"這一關",body:"雙方體力都很低。你可用【殺】先手；自己受傷時記得留【桃】。華佗的紅牌也可當桃（技能詳見 ℹ）。"}]};function le(e){return e?Xe[e]??[]:[]}function ce(e){return!!e&&ye(e.config.campaignStageId)}function Ye(e,n){const a=e.prompt,s=e.players.find(i=>i.isHuman);if(!s||e.winnerIds)return"";if(e.matchPhase==="pick_general")return"請點選一名武將，確認後開局";if(a.actorId!==s.id)return"等待其他角色行動…";switch(a.kind){case"choose_card":{if(n){const i=s.hand.find(c=>c.uid===n);return`已選【${i?S(i.defId).name:"此牌"}】— 再點同一張打出，或點其他牌改選`}return e.phase==="play"?"出牌階段：點亮起的手牌使用，或按「結束出牌」":a.message||"請選擇一張牌"}case"choose_target":return"請點亮起、會閃爍的座位作為目標";case"respond_shan":return"需要【閃】：點亮起的【閃】打出，或按「放棄」承受傷害";case"respond_sha":return"需要【殺】：點亮起的【殺】打出，或按「放棄」";case"discard":return`棄牌階段：點選要棄的牌（需棄 ${a.discardCount??""} 張）`;case"choice":return a.message||"請在上方選項中點選";case"skill_cards":return a.message||"請依技能選擇牌，再按確認";default:return a.message||""}}const Ze="0.16.0",t={screen:"start",setupMode:"duel",campaignId:null,storyKind:"campaign",stage:null,allyChoice:null,game:null,selectedUid:null,settings:Ue(),detailHtml:null,aiBusy:!1,fxSettledSeq:null,matchEndPending:!1,matchPaused:!1,unlockBanners:[],liezhuanFilter:"all",coachSlide:0},r=()=>document.querySelector("#app");function Rt(){d()}function d(){var a,s,i,l;const e=r();switch(t.screen){case"start":e.innerHTML=tt(),at();break;case"setup":e.innerHTML=pt(),ht();break;case"settings":e.innerHTML=dt(),ut();break;case"story":e.innerHTML=gt(),bt();break;case"liezhuan":e.innerHTML=it(),ct();break;case"achievements":e.innerHTML=rt(),ot();break;case"stage":e.innerHTML=ft(),yt();break;case"table":e.innerHTML=kt(),Ct(),Tt();break;case"epilogue":e.innerHTML=zt(),Bt();break;case"result":e.innerHTML=jt(),Ut();break}t.detailHtml&&(e.insertAdjacentHTML("beforeend",Je(t.detailHtml)),(a=r().querySelector("#detail-close"))==null||a.addEventListener("click",()=>{t.detailHtml=null,d()}),(s=r().querySelector("#detail-backdrop"))==null||s.addEventListener("click",()=>{t.detailHtml=null,d()}));const n=(l=(i=t.game)==null?void 0:i.fx.play)==null?void 0:l.seq;n!==void 0?requestAnimationFrame(()=>{var c,p;((p=(c=t.game)==null?void 0:c.fx.play)==null?void 0:p.seq)===n&&(t.fxSettledSeq=n)}):t.fxSettledSeq=null}function Je(e){return`<div class="modal-backdrop" id="detail-backdrop"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-body">${e}</div>
    <button type="button" class="btn primary" id="detail-close">關閉</button>
  </div>`}function et(){return Ge().asked?"":`<div class="modal-backdrop" id="tut-ask-backdrop"></div>
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
  </div>`}function tt(){return`
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
        <button type="button" class="btn ghost" data-go="settings">設定</button>
      </div>
      <p class="version" id="app-version">v${Ze}</p>
    </div>
    ${et()}
  </div>`}function G(){ne(),t.storyKind="campaign",t.campaignId=Ee,t.screen="story",d()}function at(){var e,n;(e=r().querySelector("#tut-yes"))==null||e.addEventListener("click",()=>G()),(n=r().querySelector("#tut-later"))==null||n.addEventListener("click",()=>{ne(),d()}),r().querySelectorAll("[data-go]").forEach(a=>{a.addEventListener("click",()=>{const s=a.dataset.go;if(s==="tutorial"){G();return}s==="story"&&(t.storyKind="campaign",t.campaignId=null),s==="liezhuan"&&(t.storyKind="liezhuan",t.campaignId=null),t.screen=s,d()})})}function st(e){var l,c,p;const n=e.setup;if(!n)return"";const a=[],s=n.player;(l=s==null?void 0:s.equipKinds)!=null&&l.length&&a.push(`你裝備：${s.equipKinds.join("、")}`),(c=s==null?void 0:s.handKinds)!=null&&c.length&&a.push(`你指定手牌：${s.handKinds.join("、")}`),(s==null?void 0:s.handCount)!=null&&a.push(`你手牌數 ${s.handCount}`),((s==null?void 0:s.hp)!=null||(s==null?void 0:s.maxHp)!=null)&&a.push(`你體力 ${s.hp??s.maxHp}/${s.maxHp??s.hp}`);const i=n.enemies;return((i==null?void 0:i.hp)!=null||(i==null?void 0:i.maxHp)!=null)&&a.push(`敵體力 ${i.hp??i.maxHp}/${i.maxHp??i.hp}`),(p=i==null?void 0:i.equipKinds)!=null&&p.length&&a.push(`敵裝備：${i.equipKinds.join("、")}`),a.length?`<p class="intel-pack">特殊開局：${a.map(u).join("　·　")}</p>`:""}function nt(e){if(!ce(e)||t.coachSlide<0||e.winnerIds)return"";const n=le(e.config.campaignStageId);if(!n.length||t.coachSlide>=n.length)return"";const a=n[t.coachSlide],s=n.length,i=t.coachSlide>=s-1;return`<div class="coach-layer" role="dialog" aria-modal="true">
    <div class="coach-box">
      <p class="coach-kicker">教學 ${t.coachSlide+1}/${s}</p>
      <h3>${u(a.title)}</h3>
      <p>${u(a.body)}</p>
      <div class="coach-actions">
        <button type="button" class="btn primary" id="coach-next">${i?"開始實戰":"下一步"}</button>
        <button type="button" class="btn ghost" id="coach-skip">略過本關講解</button>
      </div>
    </div>
  </div>`}function O(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function it(){const e=_().filter(i=>t.liezhuanFilter==="all"?!0:i.kingdom===t.liezhuanFilter),n=["all","wei","shu","wu","qun"],a=_().filter(i=>N(i.id)).length,s=_().length;return`
  <div class="screen panel-screen liezhuan-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>武將列傳</h2>
    </header>
    <p class="story-intro">每位武將皆有個人列傳（一至數關）。通關後解鎖該武將的 Q 版造型；預設無造型。</p>
    <p class="lz-progress">已解鎖造型 ${a}/${s}</p>
    <div class="lz-filters">
      ${n.map(i=>{const l=i==="all"?"全部":O(i);return`<button type="button" class="btn ${t.liezhuanFilter===i?"primary":"ghost"}" data-filter="${i}">${l}</button>`}).join("")}
    </div>
    <ul class="lz-grid">
      ${e.map(i=>{const l=Z(i.id);if(!l)return"";const c=C(l.id),p=Math.min(c-1,l.stages.length),g=N(i.id),b=M(i.id)==="chibi",m=g?z(i):lt(i);return`<li class="lz-card ${g?"done":""}">
            <button type="button" class="lz-open" data-lz="${i.id}">
              <img class="lz-avatar ${g?"chibi-on":""}" src="${m}" alt="" />
              <span class="lz-name">${u(i.name)}</span>
              <span class="lz-meta">${O(i.kingdom)}・${l.stages.length} 關・${p}/${l.stages.length}</span>
              <span class="lz-badge">${g?b?"Q 版已裝備":"已解鎖":"尚無造型"}</span>
            </button>
            ${g?`<button type="button" class="btn ghost lz-toggle" data-skin="${i.id}">${b?"卸下造型":"裝備 Q 版"}</button>`:""}
          </li>`}).join("")}
    </ul>
  </div>`}function lt(e){return H(e)}function ct(){var e;(e=r().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",d()}),r().querySelectorAll("[data-filter]").forEach(n=>{n.addEventListener("click",()=>{t.liezhuanFilter=n.dataset.filter,d()})}),r().querySelectorAll("[data-lz]").forEach(n=>{n.addEventListener("click",()=>{const a=n.dataset.lz,s=Z(a);s&&(t.storyKind="liezhuan",t.campaignId=s.id,t.screen="story",d())})}),r().querySelectorAll("[data-skin]").forEach(n=>{n.addEventListener("click",a=>{a.stopPropagation();const s=n.dataset.skin,i=M(s)==="chibi";Ne(s,i?null:ie),d()})})}function rt(){const e=Fe(),{unlocked:n,total:a}=Ke();return`
  <div class="screen panel-screen ach-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>成就</h2>
    </header>
    <p class="story-intro">完成列傳可解鎖 Q 版造型。成就進度 ${n}/${a}。</p>
    ${[{kind:"feat",title:"功業"},{kind:"campaign",title:"劇情傳記"},{kind:"set",title:"勢力集齊"},{kind:"liezhuan",title:"武將列傳"}].map(i=>{const l=e.filter(c=>c.kind===i.kind);return`<section class="ach-group">
          <h3>${i.title}</h3>
          <ul class="ach-list">
            ${l.map(c=>{const p=De(c.id),g=c.generalId?v(c.generalId):null,b=g?`<img src="${p?z(g):H(g)}" alt="" />`:"";return`<li class="ach-item ${p?"on":""}">
                  ${b}
                  <div>
                    <strong>${u(c.title)}</strong>
                    <span>${u(c.hint)}</span>
                  </div>
                  <em>${p?"已達成":"未達成"}</em>
                </li>`}).join("")}
          </ul>
        </section>`}).join("")}
  </div>`}function ot(){var e;(e=r().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",d()})}function dt(){const e=t.settings,n=!!e.aiApiToken.trim();return`
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
        ${ee.map(a=>{const s=e.enabledPacks.includes(a.id),i=!!a.alwaysOn;return`<label class="field check">
            <input type="checkbox" data-pack="${a.id}" ${s?"checked":""} ${i?"disabled":""} />
            <span><strong>${a.name}</strong> — ${a.hint}${i?"（固定）":""}</span>
          </label>`}).join("")}
      </div>
      <hr class="settings-sep" />
      <h3 class="settings-sub">進階 AI（選填）</h3>
      <p class="hint">填入 OpenAI 相容 API Token 後，每位電腦座位會用大模型依「自己所知」決策；留空則使用內建規則 AI。</p>
      <label class="field">
        <span>AI API Token ${n?"（已儲存）":""}</span>
        <input type="password" id="ai-token" placeholder="sk-... 或供應商 Token" value="${u(e.aiApiToken)}" autocomplete="off" />
      </label>
      <label class="field">
        <span>API Base URL</span>
        <input type="text" id="ai-base" value="${u(e.aiApiBaseUrl)}" placeholder="https://api.openai.com/v1" />
      </label>
      <label class="field">
        <span>Model</span>
        <input type="text" id="ai-model" value="${u(e.aiModel)}" placeholder="gpt-4o-mini" />
      </label>
      <label class="field check">
        <input type="checkbox" id="ai-debug" ${e.showAiDebug?"checked":""} />
        <span>角色 ℹ 中顯示當下 AI 想法（身份推測一律可在 ℹ 查看）</span>
      </label>
      <p class="hint">身份局中點座位 ℹ 可看該角色對他人的身份推測、排除項與人數池；內奸可能伪装。</p>
      <button type="button" class="btn primary" id="save-settings">儲存</button>
    </div>
  </div>`}function ut(){var a,s;const e=r().querySelector("#think-delay"),n=r().querySelector("#delay-label");e.addEventListener("input",()=>{n.textContent=`${(Number(e.value)/1e3).toFixed(1)} 秒`}),(a=r().querySelector("[data-back]"))==null||a.addEventListener("click",()=>{t.screen="start",d()}),(s=r().querySelector("#save-settings"))==null||s.addEventListener("click",()=>{const i=ee.filter(l=>{if(l.alwaysOn)return!0;const c=r().querySelector(`[data-pack="${l.id}"]`);return!!(c!=null&&c.checked)}).map(l=>l.id);t.settings={thinkDelayMs:Number(e.value),showPortraits:r().querySelector("#show-portraits").checked,forceSelectGeneral:r().querySelector("#force-select").checked,enabledPacks:i,aiApiToken:r().querySelector("#ai-token").value.trim(),aiApiBaseUrl:r().querySelector("#ai-base").value.trim()||"https://api.openai.com/v1",aiModel:r().querySelector("#ai-model").value.trim()||"gpt-4o-mini",showAiDebug:r().querySelector("#ai-debug").checked},Re(t.settings),t.screen="start",d()})}function pt(){return`
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
      <p class="hint">卡包：${Y(t.settings.enabledPacks)}（可在設定中變更；預設僅標準包）</p>
      <p class="hint">進入對局後會先看到座位與身份，再從系統隨機抽出的三名武將中選擇（可在設定改為全部可選）。</p>
      <button type="button" class="btn primary" id="start-match">開始對戰</button>
    </div>
  </div>`}function j(e){return{wei:"魏",shu:"蜀",wu:"吳",qun:"群",god:"神"}[e]??e}function ht(){var e,n;(e=r().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",d()}),(n=r().querySelector("#start-match"))==null||n.addEventListener("click",()=>{mt()})}async function mt(){const e=r().querySelector("#mode").value;t.setupMode=e;const n=xe({mode:e,packs:t.settings.enabledPacks,forceSelectGeneral:t.settings.forceSelectGeneral});t.game=se(n),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.stage=null,t.screen="table",d()}function gt(){if(!t.campaignId)return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情模式</h2>
    </header>
    <p class="story-intro">選擇傳記。關卡會依登場武將自動啟用對應卡包（風／火／林／山／一將等）。</p>
    <ul class="stage-list campaign-pick">
      ${Se.map(a=>{const s=C(a.id),i=Math.min(s-1,a.stages.length);return`<li>
          <button type="button" data-campaign="${a.id}">
            <span class="idx">${u(a.title)}</span>
            <span class="st">${u(a.blurb)}</span>
            <span class="sub">進度 ${i}/${a.stages.length}</span>
          </button>
        </li>`}).join("")}
    </ul>
  </div>`;const e=Ie(t.campaignId),n=C(e.id);return`
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back-campaigns>${w(t.campaignId)?"返回標題":t.storyKind==="liezhuan"?"列傳列表":"傳記列表"}</button>
      <h2>${w(t.campaignId)?u(e.title):`劇情・${u(e.title)}`}</h2>
    </header>
    <p class="story-intro">${u(e.blurb)}</p>
    <ul class="stage-list">
      ${e.stages.map(a=>{const s=a.index>n;return`<li class="${s?"locked":""}">
          <button type="button" data-stage="${a.id}" ${s?"disabled":""}>
            <span class="idx">第${a.index}關</span>
            <span class="st">${a.title}</span>
            <span class="sub">${a.subtitle}・${a.era}</span>
            ${s?'<span class="lock">未解鎖</span>':""}
          </button>
        </li>`}).join("")}
    </ul>
  </div>`}function bt(){var e,n;(e=r().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="start",d()}),(n=r().querySelector("[data-back-campaigns]"))==null||n.addEventListener("click",()=>{if(w(t.campaignId)){t.campaignId=null,t.screen="start",d();return}if(t.storyKind==="liezhuan"){t.campaignId=null,t.screen="liezhuan",d();return}t.campaignId=null,d()}),r().querySelectorAll("[data-campaign]").forEach(a=>{a.addEventListener("click",()=>{t.campaignId=a.dataset.campaign,d()})}),r().querySelectorAll("[data-stage]").forEach(a=>{a.addEventListener("click",()=>{var l,c;const s=a.dataset.stage,i=J(s);t.stage=(i==null?void 0:i.stage)??null,t.campaignId=(i==null?void 0:i.campaign.id)??t.campaignId,t.allyChoice=((c=(l=t.stage)==null?void 0:l.allyChoices)==null?void 0:c[0])??null,t.screen="stage",d()})})}function ft(){var b;const e=t.stage,n=e.allyChoices??[],a=u(e.briefing).split(/\n+/).filter(Boolean).map(m=>`<p>${m}</p>`).join(""),s=e.prevLink?`<p class="story-bridge">${u(e.prevLink)}</p>`:"",i=e.allies.map(m=>m.name?m.name:v(m.generalId).name),l=e.enemies.map(m=>m.name??v(m.generalId).name),c=v(e.playerGeneralId).name,p=`
    <section class="intel-block">
      <h4>參戰勢力</h4>
      <div class="force-cols">
        <div>
          <p class="force-side">我方</p>
          <ul class="force-list">
            <li>${u(c)}</li>
            ${i.map(m=>`<li>${u(m)}</li>`).join("")}
            ${n.length?'<li class="force-pick">＋自選副將</li>':""}
          </ul>
        </div>
        <div>
          <p class="force-side foe">敵方</p>
          <ul class="force-list">
            ${l.map(m=>`<li>${u(m)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="intel-block">
      <h4>關卡設定</h4>
      <p class="intel-pack">卡包：${Y(ke(e))}${(b=e.requiredCardKinds)!=null&&b.length?`　·　必備：${e.requiredCardKinds.map(m=>m==="tiesuo"?"鐵索連環":m).join("、")}`:""}</p>
      <p class="intel-pack">勝利：${e.victory.type==="kill_target"?`擊殺 ${v(e.victory.targetGeneralId).name}`:e.victory.type==="survive_rounds"?`堅守突圍 ${e.victory.rounds??4} 輪（或擊潰追兵）`:"殲滅敵軍"}</p>
      ${st(e)}
    </section>`,g=X({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds,intelExtraHtml:p});return`
  <div class="screen story-brief-screen">
    <header class="topbar story-brief-top">
      <button type="button" class="btn ghost" data-back>返回</button>
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${u(e.era)}・第${e.index}關</p>
        <h2>${e.title}</h2>
        <p class="story-brief-sub">${u(e.subtitle)}</p>
      </div>
    </header>
    ${g}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="關卡劇情">
        <div class="story-hand">${s}${a}</div>
      </div>
      <div class="panel story-ready">
        ${n.length?`<label class="field"><span>自選副將</span>
              <select id="ally">${n.map(m=>{const h=v(m==="dianwei_proxy"?"xuchu":m),f=m==="dianwei_proxy"?`${h.name}（代典韋）`:h.name;return`<option value="${m}" ${t.allyChoice===m?"selected":""}>${f}</option>`}).join("")}</select></label>`:'<p class="meta">確認戰局後進入戰鬥</p>'}
        <button type="button" class="btn primary" id="enter-stage">下一步</button>
      </div>
    </div>
  </div>`}function yt(){var e,n;(e=r().querySelector("[data-back]"))==null||e.addEventListener("click",()=>{t.screen="story",d()}),(n=r().querySelector("#enter-stage"))==null||n.addEventListener("click",()=>{vt()})}async function vt(){var a;const e=(a=r().querySelector("#ally"))==null?void 0:a.value;t.allyChoice=e??null;const n=qe(t.stage,t.allyChoice??void 0);t.game=se(n),t.selectedUid=null,t.fxSettledSeq=null,t.matchEndPending=!1,t.matchPaused=!1,t.coachSlide=0,t.screen="table",d(),await k()}function re(e,n,a){if(e.identity==="none")return"";const s={lord:"主公",loyal:"忠臣",rebel:"反賊",spy:"內奸"}[e.identity]??"";return a==="duel"?"":e.id===n.id?s:e.identity==="lord"?"主公":e.alive?"？":s}function $t(e){const n=e.winnerIds.includes(0);return`<div class="match-end-overlay" role="dialog" aria-modal="true" aria-labelledby="match-end-title">
    <div class="match-end-card">
      <p class="match-end-kicker">${n?"我方勝":"敵方勝"}</p>
      <h2 id="match-end-title">${n?"勝利":"敗北"}</h2>
      <p class="match-end-msg">${u(e.resultMessage??"")}</p>
      <button type="button" class="btn primary" id="ack-match-end">下一步</button>
    </div>
  </div>`}function kt(){const e=t.game,n=e.players.find(o=>o.isHuman),a=e.prompt,s=e.matchPhase==="pick_general",i=!!e.winnerIds,l=a.actorId===n.id&&!t.aiBusy&&!s&&!i&&!t.matchPaused,c=e.players.length,p=!i&&!t.matchPaused&&a.kind==="choice"&&a.choiceKey==="wuxie"&&a.actorId!==n.id,g=(()=>{var o;return i||t.matchPaused?t.matchPaused?'<div class="thinking paused-banner">對局已暫停</div>':"":p?'<div class="thinking">有角色正在考慮是否使用【無懈可擊】…</div>':t.aiBusy&&a.actorId!==null&&!((o=e.players[a.actorId])!=null&&o.isHuman)?`<div class="thinking">${L(e.players[a.actorId].name,a.actorId)} 思考中…</div>`:""})(),b=e.players.map(o=>({id:o.id,name:o.name,generalName:o.generalId?v(o.generalId).name:void 0})),m=i?"":p?"等待【無懈可擊】結算…":Ye(e,t.selectedUid),h=t.selectedUid&&a.kind==="choose_card"?"已選取手牌 — 再點一次同一張牌以打出，或點其他牌改選":p?"等待【無懈可擊】結算…":a.message||"等待中…",f=l&&!i;return`
  <div class="screen table-screen ${i?"match-ended":""} ${t.matchPaused?"match-paused":""} ${ce(e)?"tutorial-match":""}">
    <header class="battle-top">
      <div>
        <strong>${s?"選將階段":`第 ${e.round} 輪`}</strong>
        <span class="phase">${s?"請選擇武將":wt(e.phase)}</span>
      </div>
      <div class="battle-top-right">
        <div class="deck-info">${s?`座位 ${c} 人`:`牌堆 ${e.deck.length}　棄牌 ${e.discard.length}`}</div>
        ${i?"":`<button type="button" class="btn ghost" id="pause-match">${t.matchPaused?"繼續":"暫停"}</button>`}
      </div>
    </header>
    ${g}
    <div class="arena" style="--n:${c}" id="arena">
      ${e.players.map(o=>{var F;const y=!!o.generalId,$=y?v(o.generalId):null,x=!s&&e.currentPlayer===o.id,I=!s&&a.kind==="choose_target"&&((F=a.targetIds)==null?void 0:F.includes(o.id))&&l,q=(o.id-n.id+c)%c,E=q/c*360+90,de=o.id===n.id?"—":String(we(e,n.id,o.id)),ue=!s&&o.id!==n.id&&o.alive&&y&&He(e,n.id,o.id)?"in-range":"",U=re(o,n,e.config.mode),P=e.fx.damages.find(ge=>ge.playerId===o.id),pe=$e(o.id),he=t.settings.showPortraits&&$?`<img class="portrait ${M($.id)==="chibi"?"chibi-on":""}" src="${H($)}" alt="" width="48" height="48" />`:t.settings.showPortraits?'<div class="portrait portrait-empty" aria-hidden="true">？</div>':"",me=y?`<button type="button" class="info-btn" data-info-seat="${o.id}" title="詳情" aria-label="詳情">ℹ</button>`:"";return`<div class="seat-wrap" style="--angle:${E}deg;--seat-c:${pe}" data-visual="${q}" data-seat-pos="${o.id}">
            <div class="seat ${o.alive?"":"dead"} ${x?"active":""} ${o.isHuman?"human":""} ${I?"targetable":""} ${ue} ${s&&!y?"hidden-gen":""} ${P?"hurt":""}" data-seat="${o.id}" role="${I?"button":"group"}" tabindex="${I?"0":"-1"}">
              ${he}
              <div class="seat-head">
                <span class="seat-gen">${$?u($.name):"未亮將"}</span>
                ${me}
              </div>
              <div class="seat-name">${u(o.name)}${U?`・${U}`:""}</div>
              <div class="hp">${y?Pt(o.hp,o.maxHp):"—"}</div>
              <div class="equip">${y?Lt(o):s?"等待選將":"無裝備"}</div>
              <div class="meta-row"><span>手牌 ${s?"—":o.hand.length}</span><span class="dist">距 ${de}</span></div>
              ${P?`<span class="dmg-float" data-dmg-seq="${P.seq}">-${P.amount}</span>`:""}
            </div>
          </div>`}).join("")}
      ${xt(e,n.id,c)}
    </div>
    ${m?`<div class="action-hint ${f?"loud":""}" role="status">${u(m)}</div>`:""}
    <div class="prompt-bar ${f?"prompt-loud":""}">${K(h,b)}</div>
    ${nt(e)}
    ${s?It(e):""}
    ${!s&&l&&(a.kind==="choice"||a.kind==="skill_cards")?St(e):""}
    ${!s&&l&&a.kind==="choose_card"?`<div class="skill-row">${Ae(e,n.id).map(o=>`<button type="button" class="btn ghost" data-skill="${o.id}" title="${u(o.hint)}">${u(o.label)}</button>`).join("")}</div>`:""}
    ${s?"":`<div class="hand">
      ${n.hand.map(o=>{var q,E;const y=S(o.defId),$=l&&!!((q=a.cardUids)!=null&&q.includes(o.uid))&&(a.kind==="choose_card"||a.kind==="discard"||a.kind==="respond_shan"||a.kind==="respond_sha"||a.kind==="skill_cards"),x=t.selectedUid===o.uid||a.kind==="skill_cards"&&!!((E=a.selectedCardUids)!=null&&E.includes(o.uid)),I=y.suit==="heart"||y.suit==="diamond";return`<div class="card-wrap">
            <button type="button" class="card ${$?"selectable":""} ${x?"selected":""} ${I?"red":"black"}" data-uid="${o.uid}" ${$?"":"disabled"}>
              <span class="csuit ${I?"red":""}">${B(y.suit)}${A(y.rank)}</span>
              <span class="cname">${y.name}</span>
              <span class="ctype">${oe(y)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${o.uid}" title="牌面說明">ℹ</button>
          </div>`}).join("")}
    </div>`}
    <div class="log" aria-live="polite">${[...e.log].slice(-8).map((o,y,$)=>`<div class="${y===$.length-1?"log-latest":""}">${K(o.text,b)}</div>`).join("")}</div>
    <div class="actions">
      <div class="actions-main">
      ${!s&&l&&a.kind==="choose_card"&&t.selectedUid?'<button type="button" class="btn ghost" id="cancel-select">取消選牌</button>':""}
      ${!s&&l&&a.kind==="choose_card"?'<button type="button" class="btn" id="end-play">結束出牌</button>':""}
      ${!s&&l&&(a.kind==="respond_shan"||a.kind==="respond_sha")?'<button type="button" class="btn" id="pass-resp">放棄</button>':""}
      ${!s&&l&&(a.kind==="choose_target"||a.kind==="skill_cards"||a.kind==="choice"&&(a.choiceKey==="fangtian_confirm"||a.choiceKey==="rende_target"||a.choiceKey==="zhangba_target"))?'<button type="button" class="btn" id="cancel-tgt">取消</button>':""}
      </div>
      <div class="actions-quit">
        <button type="button" class="btn ghost danger" id="flee">退出對局</button>
      </div>
    </div>
    ${i?$t(e):""}
  </div>`}function St(e){var c;const n=e.prompt.choices??[];if(!n.length)return"";const a=e.prompt.kind==="skill_cards",s=e.prompt.choiceKey==="zone_pick",i=((c=e.prompt.selectedCardUids)==null?void 0:c.length)??0,l=e.prompt.minTargets??1;return`<div class="choice-panel">
    <h3>${u(e.prompt.message)}</h3>
    <div class="choice-row">
      ${n.map(p=>{var h;const g=(a||s)&&p.id==="confirm"&&i<l,b=s&&!!((h=e.prompt.selectedCardUids)!=null&&h.includes(p.id));return`<button type="button" class="${["btn",p.id==="skip"||p.id==="no"?"ghost":"primary",b?"selected-pick":""].filter(Boolean).join(" ")}" data-choice="${p.id}" ${g?"disabled":""}>${u(p.label)}</button>`}).join("")}
    </div>
  </div>`}function It(e){const n=e.prompt.generalIds??[];return`<div class="pick-panel">
    <h3>${n.length>3?"選擇武將（全部可選）":"系統隨機三將，請選一"}</h3>
    <div class="pick-grid">
      ${n.map(s=>{const i=v(s);return`<div class="pick-card">
            ${t.settings.showPortraits?`<img class="pick-portrait ${M(i.id)==="chibi"?"chibi-on":""}" src="${H(i)}" alt="" />`:""}
            <div class="pick-name">${i.name}</div>
            <div class="pick-meta">${j(i.kingdom)}・${i.maxHp} 血</div>
            <p class="pick-skill">${u(i.skillText)}</p>
            <div class="pick-actions">
              <button type="button" class="btn ghost" data-gen-info="${s}">詳情</button>
              <button type="button" class="btn primary" data-pick-gen="${s}">選定</button>
            </div>
          </div>`}).join("")}
    </div>
  </div>`}function Q(e,n,a){const l=((e-n+a)%a/a*360+90)*Math.PI/180,c=38;return{x:50+Math.cos(l)*c,y:50+Math.sin(l)*c}}function qt(e,n){var a;if(e.fx.play)return e.fx.play;if(e.prompt.kind==="choose_target"&&((a=e.prompt.cardUids)!=null&&a[0])&&e.prompt.actorId!==null){const s=e.players[e.prompt.actorId],i=s==null?void 0:s.hand.find(l=>l.uid===e.prompt.cardUids[0]);if(i){const l=S(i.defId);return{cardName:l.name,suit:l.suit,rank:l.rank,sourceId:e.prompt.actorId,targetIds:[],note:"選擇目標",seq:0}}}return null}function xt(e,n,a){const s=qt(e);if(!s&&!e.fx.damages.length)return'<div class="arena-center" aria-hidden="true"><span>距離</span></div>';const i=!!(s&&t.fxSettledSeq===s.seq),l=s?Q(s.sourceId,n,a):null,c=s&&l?s.targetIds.filter(m=>m!==s.sourceId).map(m=>{const h=Q(m,n,a);return Et(l.x,l.y,h.x,h.y,s.seq,i)}).join(""):"",p=s&&s.targetIds.length===1&&s.targetIds[0]===s.sourceId?`<div class="fx-self-ring ${i?"fx-settled":""}" style="left:${l.x}%;top:${l.y}%"></div>`:"",g=s&&(s.suit==="heart"||s.suit==="diamond"),b=s?`<div class="fx-card ${g?"red":"black"} ${i?"fx-settled":""}" data-fx-seq="${s.seq}">
        <span class="csuit">${B(s.suit)}${A(s.rank)}</span>
        <span class="cname">${u(s.cardName)}</span>
        ${s.note?`<span class="fx-note">${u(s.note)}</span>`:""}
      </div>`:"";return`
    <div class="arena-fx" aria-hidden="true">
      <svg class="fx-arrows" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#c4a35a" />
          </marker>
        </defs>
        ${c}
      </svg>
      ${p}
      <div class="fx-card-slot">${b||'<span class="arena-center-label">距離</span>'}</div>
    </div>`}function Et(e,n,a,s,i,l=!1){const c=a-e,p=s-n,g=Math.hypot(c,p)||1,b=Math.min(8,g*.2),m=e+c/g*b,h=n+p/g*b,f=a-c/g*b,o=s-p/g*b;return`<line class="fx-arrow-line ${l?"fx-settled":""}" data-fx-seq="${i}" x1="${m}" y1="${h}" x2="${f}" y2="${o}" marker-end="url(#arrowHead)" />`}function Pt(e,n){const a=Math.max(0,e);return"●".repeat(a)+"○".repeat(Math.max(0,n-a))}function Lt(e){const n=[];if(e.equips.weapon){const a=S(e.equips.weapon.defId),s=a.attackRange??1;n.push(`<span class="eq-line eq-weapon">${u(a.name)} <em>攻${s}</em></span>`)}if(e.equips.armor){const a=S(e.equips.armor.defId);n.push(`<span class="eq-line eq-armor">${u(a.name)}</span>`)}if(e.equips.horseMinus){const a=S(e.equips.horseMinus.defId);n.push(`<span class="eq-line eq-horse">-1 ${u(a.name)}</span>`)}if(e.equips.horsePlus){const a=S(e.equips.horsePlus.defId);n.push(`<span class="eq-line eq-horse">+1 ${u(a.name)}</span>`)}for(const a of e.judges??[]){const s=S(a.defId);n.push(`<span class="eq-line eq-judge">判定・${u(s.name)}</span>`)}return n.length?n.join(""):"無裝備"}function wt(e){return{prepare:"準備",judge:"判定",draw:"摸牌",play:"出牌",discard:"棄牌",end:"結束"}[e]??e}function Ht(e){return{basic:"基本",trick:"錦囊",equip:"裝備"}[e]??e}function oe(e){return e.slot==="weapon"?`武器・攻${e.attackRange??1}`:e.slot==="armor"?"防具":e.slot==="horseMinus"?"-1坐騎":e.slot==="horsePlus"?"+1坐騎":Ht(e.type)}function At(e){if(!e.generalId)return`<h3>${L(e.name,e.id)}</h3><p class="muted">尚未亮出武將。</p>`;const n=v(e.generalId),a=["weapon","armor","horseMinus","horsePlus"].map(c=>{const p=e.equips[c];if(!p)return null;const g=S(p.defId);let b="";return c==="weapon"?b=`攻擊範圍 ${g.attackRange??1}`:c==="horseMinus"?b="-1 坐騎（與其他角色距離-1）":c==="horsePlus"?b="+1 坐騎（其他角色與你距離+1）":c==="armor"&&(b="防具"),`<li><strong>${u(g.name)}</strong>（${ae(g.suit)}${A(g.rank)}）· ${b}<br/><span class="muted">${te[g.kind]??""}</span></li>`}).filter(Boolean).join(""),s=t.game;let i="";s&&(s.config.mode==="identity5"||s.config.mode==="identity8")&&(i=fe(s,e.id),t.settings.showAiDebug||(i=i.replace(/<p class="mind-thought">[\s\S]*?<\/p>/,"")));const l=s&&(()=>{const c=s.players.find(g=>g.isHuman);if(!c)return"";const p=re(e,c,s.config.mode);return p?`<p class="muted">公開身份資訊：${p}</p>`:""})();return`<h3>${L(n.name,e.id)} <span class="muted">·</span> ${L(e.name,e.id)}</h3>
    <p class="muted">${j(n.kingdom)}・${n.maxHp} 血・${n.gender==="female"?"女":"男"}</p>
    ${l??""}
    <h4>武將技</h4>
    <p>${u(n.skillText)}</p>
    <h4>裝備</h4>
    ${a?`<ul class="detail-list">${a}</ul>`:'<p class="muted">無</p>'}
    ${i}`}function Mt(e){const n=v(e);return`<h3>${n.name}</h3>
    <p class="muted">${j(n.kingdom)}・體力上限 ${n.maxHp}・${n.gender==="female"?"女":"男"}</p>
    <h4>武將技</h4>
    <p>${u(n.skillText)}</p>`}function _t(e,n){const a=n.hand.find(i=>i.uid===e);if(!a)return"<p>找不到此牌</p>";const s=S(a.defId);return`<h3>${s.name}</h3>
    <p>${B(s.suit)} ${ae(s.suit)} ${A(s.rank)}　·　${oe(s)}</p>
    <p>${te[s.kind]??"暫無說明。"}</p>`}async function k(){const e=t.game;if(!(!e||t.aiBusy||t.matchPaused)&&e.matchPhase!=="pick_general"){if(e.fx.play||e.fx.damages.length){t.aiBusy=!0,d();const n=Math.min(Math.max(t.settings.thinkDelayMs,500),1e3);if(await new Promise(a=>setTimeout(a,n)),t.matchPaused){t.aiBusy=!1,d();return}V(e)&&!e.winnerIds&&D(e),t.aiBusy=!1,d()}if(e.winnerIds){W(),d();return}if(!t.matchPaused){t.aiBusy=!0,d();try{await be(e,()=>{t.screen==="table"&&t.game===e&&d()},()=>t.matchPaused)}finally{t.aiBusy=!1}if(t.matchPaused){d();return}V(e)&&!e.winnerIds&&D(e),W(),d()}}}function V(e){const n=e.prompt.kind;return n==="choose_card"||n==="discard"||n==="game_over"||n==="idle"||n==="choose_general"}function Tt(){const e=r().querySelector(".log");if(!e)return;const n=e.querySelector(".log-latest");n&&n.scrollIntoView({block:"nearest",behavior:"instant"}),e.scrollTop=e.scrollHeight}function Ct(){var a,s,i,l,c,p,g,b,m;const e=t.game,n=e.players.find(h=>h.isHuman);(a=r().querySelector("#coach-next"))==null||a.addEventListener("click",()=>{const h=le(e.config.campaignStageId);t.coachSlide+1>=h.length?t.coachSlide=-1:t.coachSlide+=1,d()}),(s=r().querySelector("#coach-skip"))==null||s.addEventListener("click",()=>{t.coachSlide=-1,d()}),r().querySelectorAll("[data-choice]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choice"&&e.prompt.kind!=="skill_cards"||e.prompt.actorId!==n.id)return;const f=h.dataset.choice;Me(e,n.id,f),k()})}),r().querySelectorAll("[data-skill]").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.prompt.kind!=="choose_card"||e.prompt.actorId!==n.id)return;const f=h.dataset.skill;_e(e,n.id,f),t.selectedUid=null,k()})}),r().querySelectorAll("[data-gen-info]").forEach(h=>{h.addEventListener("click",()=>{const f=h.dataset.genInfo;t.detailHtml=Mt(f),d()})}),r().querySelectorAll("[data-pick-gen]").forEach(h=>{h.addEventListener("click",()=>{const f=h.dataset.pickGen;Te(e,f),t.detailHtml=null,d(),k()})}),r().querySelectorAll("[data-info-seat]").forEach(h=>{h.addEventListener("click",f=>{f.stopPropagation(),f.preventDefault();const o=Number(h.dataset.infoSeat);t.detailHtml=At(e.players[o]),d()})}),r().querySelectorAll("[data-info-card]").forEach(h=>{h.addEventListener("click",f=>{f.stopPropagation(),f.preventDefault();const o=h.dataset.infoCard;t.detailHtml=_t(o,n),d()})}),r().querySelectorAll(".card.selectable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const f=h.dataset.uid;if(e.prompt.kind==="choose_card"){if(t.selectedUid!==f){t.selectedUid=f,d();return}T(e,n.id,f),t.selectedUid=null,k();return}if(e.prompt.kind==="skill_cards"){T(e,n.id,f),d();return}T(e,n.id,f),t.selectedUid=null,k()})}),(i=r().querySelector("#cancel-select"))==null||i.addEventListener("click",()=>{t.selectedUid=null,d()}),r().querySelectorAll(".seat.targetable").forEach(h=>{h.addEventListener("click",()=>{if(t.aiBusy||e.matchPhase==="pick_general")return;const f=Number(h.dataset.seat);Ce(e,n.id,f),k()})}),(l=r().querySelector("#end-play"))==null||l.addEventListener("click",()=>{t.aiBusy||(ze(e,n.id),k())}),(c=r().querySelector("#pass-resp"))==null||c.addEventListener("click",()=>{t.aiBusy||(Be(e,n.id),k())}),(p=r().querySelector("#cancel-tgt"))==null||p.addEventListener("click",()=>{je(e,n.id),d()}),(g=r().querySelector("#ack-match-end"))==null||g.addEventListener("click",()=>{t.matchEndPending=!1,t.screen=t.stage?"epilogue":"result",d()}),(b=r().querySelector("#pause-match"))==null||b.addEventListener("click",()=>{if(t.matchPaused){t.matchPaused=!1,d(),k();return}t.matchPaused=!0,d()}),(m=r().querySelector("#flee"))==null||m.addEventListener("click",()=>{window.confirm("確定要退出對局嗎？進度不會保存。")&&(t.game=null,t.aiBusy=!1,t.matchEndPending=!1,t.matchPaused=!1,t.screen=t.stage?"story":"start",d())})}function W(){const e=t.game;if(!(e!=null&&e.winnerIds)){t.matchEndPending=!1;return}if(!t.matchEndPending){const n=e.winnerIds.includes(0);if(Oe({won:n,identity:e.config.mode==="identity5"||e.config.mode==="identity8"}),e.config.campaignStageId&&n){const a=J(e.config.campaignStageId);if(a){Pe(a.campaign.id,a.stage.index),Qe();const s=[];if(Le(a.campaign.id)&&a.stage.index>=a.campaign.stages.length){const i=a.campaign.id.slice(3),l=v(i);Ve(i,ie)&&s.push({kind:"skin",title:"解鎖 Q 版造型",detail:`${l.name}・簡單 Q 版角色樣`,generalId:i})}w(a.campaign.id)&&a.stage.index>=a.campaign.stages.length&&We(),s.push(...R()),t.unlockBanners=s}}else n&&(t.unlockBanners=R());t.matchEndPending=!0}}function zt(){var c;const e=t.stage,n=t.game,a=!!((c=n.winnerIds)!=null&&c.includes(0)),s=ve(e,n),i=u(s).split(/\n+/).filter(Boolean).map(p=>`<p>${p}</p>`).join(""),l=X({title:e.title,era:e.era,battlefieldCityId:e.battlefieldCityId,cityFactions:e.cityFactions,movements:e.movements,visibleCityIds:e.visibleCityIds});return`
  <div class="screen story-brief-screen epilogue-screen">
    <header class="topbar story-brief-top">
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${a?"戰後・勝":"戰後・敗"}・${u(e.era)}</p>
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
  </div>`}function Bt(){var e;(e=r().querySelector("#epilogue-next"))==null||e.addEventListener("click",()=>{t.screen="result",d()})}function jt(){var i;const e=t.game,n=(i=e.winnerIds)==null?void 0:i.includes(0),a=t.unlockBanners,s=a.length?`<ul class="unlock-list">${a.map(l=>{const c=l.kind==="skin"&&l.generalId?`<img class="unlock-chibi" src="${z(v(l.generalId))}" alt="" />`:"";return`<li class="unlock-item ${l.kind}">${c}<div><strong>${u(l.title)}</strong><span>${u(l.detail)}</span></div></li>`}).join("")}</ul>`:"";return`
  <div class="screen panel-screen result-screen">
    <h2>${n?"勝利":"敗北"}</h2>
    <p>${u(e.resultMessage??"")}</p>
    ${s}
    <div class="cta-row">
      <button type="button" class="btn primary" id="again">再來一局</button>
      <button type="button" class="btn" id="home">回首頁</button>
      ${t.stage?`<button type="button" class="btn" id="story">${t.storyKind==="liezhuan"?"列傳關卡":"關卡列表"}</button>`:""}
    </div>
  </div>`}function Ut(){var e,n,a;(e=r().querySelector("#home"))==null||e.addEventListener("click",()=>{t.game=null,t.stage=null,t.unlockBanners=[],t.screen="start",d()}),(n=r().querySelector("#story"))==null||n.addEventListener("click",()=>{t.game=null,t.unlockBanners=[],t.screen="story",d()}),(a=r().querySelector("#again"))==null||a.addEventListener("click",()=>{if(t.unlockBanners=[],t.stage){t.screen="stage",d();return}t.screen="setup",d()})}function u(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{Rt as s};
