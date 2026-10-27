// 起元星启 — 设备、投稿、伙伴和下载业务入口
(async function () {
  const main = document.querySelector('[data-static-business]');
  if (!main) return;
  const view = main.dataset.staticBusiness;
  const $ = (s, p = document) => p.querySelector(s);
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api = async (url, options = {}) => { const r = await fetch(url, options); const d = await r.json().catch(()=>({})); if (!r.ok) throw new Error(d.error || '请求失败'); return d; };
  const post = (url, body) => api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const page = (eyebrow, title, lead, body) => `<section class="page-hero"><div class="container"><span class="kicker">${eyebrow}</span><h1>${title}</h1><p>${lead}</p></div></section><section class="section"><div class="container">${body}</div></section>`;
  const note = `<div class="form-tip" data-tip></div>`;
  const tip = (msg,error=false) => { const t=$('[data-tip]'); if(!t)return; t.textContent=msg;t.className=`form-tip${error?' error':''}`;t.style.display='block'; t.scrollIntoView({behavior:'smooth',block:'center'}); };
  const guardSubmit = (form, handler) => {
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
      try { await handler(form); }
      finally { if (btn && btn.isConnected) { btn.disabled = false; if (label) btn.textContent = label; } }
    });
  };
  const needLogin = async () => { try { return await api('/api/account/me'); } catch { location.href=`/account/login.html?next=${encodeURIComponent(location.pathname+location.search)}`; return null; } };

  if (view === 'register-device') {
    const me = await needLogin(); if (!me) return;
    main.innerHTML = page('DEVICE REGISTRATION','登记你的起元星启设备','登记后可在账户内查看保修资料并将服务工单关联到设备。',`<form class="form-wrap" id="deviceForm"><div class="form-row"><div><label for="deviceSn">设备序列号 *</label><input id="deviceSn" name="serial_no" required placeholder="例如 YP-2026-XXXX"></div><div><label for="deviceProduct">设备型号 *</label><input id="deviceProduct" name="product_name" required></div></div><div class="form-row"><div><label for="devicePurchase">购买日期</label><input id="devicePurchase" name="purchase_date" type="date"></div><div><label for="deviceChannel">购买渠道</label><input id="deviceChannel" name="channel" placeholder="官方、经销商或其他"></div></div><button class="btn btn-primary btn-lg" type="submit">登记设备</button>${note}</form>`);
    guardSubmit($('#deviceForm'), async form => { try { const r = await post('/api/devices/register', Object.fromEntries(new FormData(form))); location.href = `/account/device.html?sn=${encodeURIComponent(r.device.serial_no)}`; } catch (err) { tip(err.message, true); } }); return;
  }
  if (view === 'warranty-check') {
    const me = await needLogin(); if (!me) return;
    const devices = await api('/api/devices');
    main.innerHTML = page('WARRANTY','保修查询','保修日期依据已登记设备、购买资料和当地适用政策展示；如有疑问请提交服务工单。',`<div class="card-list">${devices.length?devices.map(d=>`<article class="detail-panel"><span class="badge">${esc(d.status==='active'?'已登记':'待确认')}</span><h2>${esc(d.product_name)}</h2><p>序列号：${esc(d.serial_no)}</p><p>保修至：${esc(d.warranty_until||'待审核')}</p><a class="btn btn-outline" href="/account/device.html?sn=${encodeURIComponent(d.serial_no)}">查看设备资料</a></article>`).join(''):`<div class="empty-panel"><h2>尚未登记设备</h2><p>登记设备后才能查询账户关联的保修资料。</p><a class="btn btn-primary" href="/support/register-device.html">登记设备</a></div>`}</div>`); return;
  }
  if (view === 'repair-request') {
    const me=await needLogin(); if(!me)return; const sn=new URLSearchParams(location.search).get('sn')||'';
    main.innerHTML=page('REPAIR SERVICE','申请维修服务','本表单会以当前账户身份提交服务请求，不会发起自动维修或物流安排。',`<form class="form-wrap" id="repairForm"><div class="form-row"><div><label for="repairSn">设备序列号</label><input id="repairSn" name="serial_no" value="${esc(sn)}"></div><div><label for="repairProduct">设备型号</label><input id="repairProduct" name="product"></div></div><div class="form-row single"><div><label for="repairSubject">问题分类</label><input id="repairSubject" name="subject" required placeholder="如打印异常、硬件维护、连接问题"></div></div><div class="form-row single"><div><label for="repairDescription">问题说明</label><textarea id="repairDescription" name="description" required></textarea></div></div><button class="btn btn-primary btn-lg" type="submit">提交维修请求</button>${note}</form>`);
    guardSubmit($('#repairForm'), async form => { try { const data = Object.fromEntries(new FormData(form)); await post('/api/tickets', data); tip('✓ 服务请求已提交，可在“我的服务工单”查看进度。'); form.reset(); } catch (err) { tip(err.message, true); } }); return;
  }
  if (view === 'collections') {
    main.innerHTML=page('CURATED COLLECTIONS','官方精选与主题合集','浏览起元星启创作实验室持续维护的模型、项目和材料实践专题。',`<div class="content-grid" data-collections></div>`);
    try { const [models,projects] = await Promise.all([api('/api/content?type=model'),api('/api/content?type=project')]); const rows=[...models,...projects]; $('[data-collections]').innerHTML=rows.map(x=>`<article class="content-card"><a class="content-cover" href="/explore/model.html?slug=${encodeURIComponent(x.slug)}">${x.cover?`<img src="${esc(x.cover)}" alt="${esc(x.title)}">`:''}</a><div class="content-card-body"><span class="badge">${esc(x.tag||'官方精选')}</span><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p><a class="btn-link" href="/explore/model.html?slug=${encodeURIComponent(x.slug)}">查看项目</a></div></article>`).join('')||'<div class="empty-panel">暂无精选项目。</div>'; } catch { $('[data-collections]').innerHTML='<div class="empty-panel">加载失败。</div>'; } return;
  }
  if (view === 'model') {
    const slug=new URLSearchParams(location.search).get('slug');
    main.innerHTML=page('MODEL DETAILS','模型与项目详情','查看官方精选项目的材料建议、许可与打印参数。',`<div data-model-detail></div>`);
    if(!slug){
      // 没有 slug 时不要只给一句提示：把官方精选直接列出来，避免用户到这里无路可走
      $('[data-model-detail]').innerHTML=`<div class="empty-panel"><h2>还没有指定要看的模型</h2><p>下面的条目可以直接打开；想按类型、难度与打印时长筛选，去模型与项目库，或直接看带完整参数的作品档案。</p><div class="hero-actions hero-actions--center"><a class="btn btn-primary" href="/explore/models.html">浏览模型与项目库</a><a class="btn btn-outline" href="/works.html">看作品展厅</a></div></div><div class="content-grid mt-3" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))" data-model-suggest></div>`;
      try{
        const [models,projects]=await Promise.all([api('/api/content?type=model'),api('/api/content?type=project')]);
        const rows=[...models,...projects].slice(0,4);
        $('[data-model-suggest]').innerHTML=rows.map(x=>`<article class="content-card"><a class="content-cover" href="/explore/model.html?slug=${encodeURIComponent(x.slug)}">${x.cover?`<img src="${esc(x.cover)}" alt="${esc(x.title)}" loading="lazy">`:'<div class="image-fallback">官方精选</div>'}</a><div class="content-card-body"><div style="align-self:flex-start"><span class="badge">${esc(x.tag||'官方精选')}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.summary||'')}</p><a class="btn-link" href="/explore/model.html?slug=${encodeURIComponent(x.slug)}">查看项目</a></div></article>`).join('')||'<div class="empty-panel">暂无精选项目，可先看作品展厅。</div>';
      }catch{ $('[data-model-suggest]').innerHTML='<div class="empty-panel">精选内容加载失败，可先看作品展厅。</div>'; }
      return;
    }
    try { let item; try { item=await api(`/api/content/model/${encodeURIComponent(slug)}`); } catch { item=await api(`/api/content/project/${encodeURIComponent(slug)}`); } $('[data-model-detail]').innerHTML=`<article class="content-detail">${item.cover?`<img class="content-detail-cover" src="${esc(item.cover)}" alt="${esc(item.title)}">`:''}<div class="content-detail-copy"><span class="badge">${esc(item.tag||'官方精选')}</span><h1>${esc(item.title)}</h1><p class="content-detail-summary">${esc(item.summary)}</p><div class="content-detail-body">${esc(item.body).split(/\n+/).map(p=>`<p>${p}</p>`).join('')}</div><dl class="meta-list">${Object.entries(item.meta||{}).map(([k,v])=>`<div><dt>${esc(k.replace(/_/g,' '))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="form-note">此页展示官方精选与项目信息。模型文件下载将在完成审核和许可确认后提供。</p></div></article>`;} catch(e){$('[data-model-detail]').innerHTML=`<div class="empty-panel">${esc(e.message)}</div>`;} return;
  }
  if (view === 'submit') {
    const me=await needLogin();if(!me)return;
    main.innerHTML=page('CREATOR SUBMISSION','提交创作投稿','首期采用受控投稿与人工审核流程。提交后不会自动公开，也不会上传模型文件。',`<form class="form-wrap" id="submissionForm"><div class="form-row single"><div><label for="submissionTitle">作品标题 *</label><input id="submissionTitle" name="title" required></div></div><div class="form-row single"><div><label for="submissionDescription">作品介绍</label><textarea id="submissionDescription" name="description" required></textarea></div></div><div class="form-row single"><div><label for="submissionLicense">许可与署名说明</label><input id="submissionLicense" name="license" placeholder="例如：允许展示，需署名作者"></div></div><button class="btn btn-primary btn-lg" type="submit">提交审核</button>${note}</form>`);
    guardSubmit($('#submissionForm'), async form => { try { await post('/api/submissions', Object.fromEntries(new FormData(form))); tip('✓ 投稿已进入审核队列，可在“我的投稿”查看状态。'); form.reset(); } catch (err) { tip(err.message, true); } }); return;
  }
  if (view === 'partners-find') {
    main.innerHTML=page('PARTNER NETWORK','查找服务伙伴','按城市或服务类型查找演示、培训、维修和行业方案支持。当前未接入地图定位，结果为公开服务资料。',`<div class="toolbar"><input id="partnerCity" placeholder="输入省份或城市"><select id="partnerType"><option value="">全部服务类型</option><option value="演示">演示</option><option value="维修">维修</option><option value="培训">培训</option><option value="教育">教育</option></select><button class="btn btn-primary" id="partnerSearch">查询</button></div><div class="content-grid" data-partners></div>`);
    const search=async()=>{const city=$('#partnerCity').value.trim(),type=$('#partnerType').value;const rows=await api(`/api/partners?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`);$('[data-partners]').innerHTML=rows.map(p=>`<article class="content-card"><div class="content-card-body"><span class="badge">${esc(p.service_type||'合作伙伴')}</span><h3>${esc(p.name)}</h3><p>${esc([p.province,p.city,p.address].filter(Boolean).join(' · '))}</p><p>${esc(p.phone||'请提交预约请求')}</p><a class="btn btn-outline" href="/contact.html?subject=${encodeURIComponent(p.name)}">预约联系</a></div></article>`).join('')||'<div class="empty-panel">暂无匹配服务伙伴。</div>';};$('#partnerSearch').onclick=search;search();return;
  }
  if (view === 'partners-apply') {
    main.innerHTML=page('PARTNER APPLICATION','合作伙伴申请','面向经销、教育集成和授权维修伙伴开放申请；提交后进入人工审核。',`<form class="form-wrap" id="partnerForm"><div class="form-row"><div><label for="partnerCompany">企业名称 *</label><input id="partnerCompany" name="company" required></div><div><label for="partnerContact">联系人 *</label><input id="partnerContact" name="contact_name" required></div></div><div class="form-row"><div><label for="partnerPhone">电话</label><input id="partnerPhone" name="phone"></div><div><label for="partnerEmail">邮箱</label><input id="partnerEmail" name="email" type="email"></div></div><div class="form-row"><div><label for="partnerApplyType">申请类型</label><select id="partnerApplyType" name="application_type"><option>区域经销</option><option>教育集成</option><option>授权维修</option></select></div><div><label for="partnerApplyCity">服务城市</label><input id="partnerApplyCity" name="city"></div></div><div class="form-row single"><div><label for="partnerDesc">企业与服务能力说明</label><textarea id="partnerDesc" name="description"></textarea></div></div><button class="btn btn-primary btn-lg" type="submit">提交合作申请</button>${note}</form>`);
    guardSubmit($('#partnerForm'), async form => { try { await post('/api/partner-applications', Object.fromEntries(new FormData(form))); tip('✓ 合作申请已提交，我们将在 3 个工作日内联系你。'); form.reset(); } catch (err) { tip(err.message, true); } }); return;
  }
  if (view === 'partners-guide') { main.innerHTML=page('PARTNER GUIDE','合作伙伴指南','了解经销、教育集成与授权维修伙伴的协作方式。',`<div class="content-grid"><article class="content-card"><div class="content-card-body"><span class="badge">01</span><h3>提交申请</h3><p>填写服务区域、行业能力和团队信息，进入人工审核。</p></div></article><article class="content-card"><div class="content-card-body"><span class="badge">02</span><h3>能力评估</h3><p>围绕产品、服务、培训和客户覆盖能力进行沟通。</p></div></article><article class="content-card"><div class="content-card-body"><span class="badge">03</span><h3>协同交付</h3><p>获得产品资料、项目支持和售后协同机制。</p><a class="btn btn-primary" href="/partners/apply.html">提交申请</a></div></article></div>`);return; }
  if (view === 'downloads') {
    main.innerHTML=page('DOWNLOAD CENTER','统一下载中心','获取软件、手册和资料入口，含版本、适配范围与更新说明。',`<div class="content-grid" data-downloads-center></div>`);
    const rows=await api('/api/downloads');$('[data-downloads-center]').innerHTML=rows.map(d=>`<article class="content-card"><div class="content-card-body"><span class="badge">${esc(d.platform||'全平台')}</span><h3>${esc(d.name)}</h3><p>版本：${esc(d.version||'待发布')} · 大小：${esc(d.size||'在线资料')}</p><a class="btn btn-outline" href="${esc(d.url&&d.url!=='#'?d.url:`/downloads/release.html?slug=${encodeURIComponent(d.name)}`)}">查看说明</a></div></article>`).join('');return;
  }
  if (view === 'release' || view === 'manual') { const slug=new URLSearchParams(location.search).get('slug')||'资料'; main.innerHTML=page(view==='release'?'RELEASE NOTES':'MANUALS',view==='release'?'发行说明':'资料详情','版本说明、适配范围与下载资料的对应关系，以本页信息为准。',`<div class="detail-panel"><span class="badge">资料中心</span><h2>${esc(slug)}</h2><p>这是资料与版本说明页面。当前不提供自动固件下发或远程设备更新，请在确认设备型号与适配信息后获取资料。</p><a class="btn btn-primary" href="/downloads/index.html">返回下载中心</a></div>`);return; }
})();
