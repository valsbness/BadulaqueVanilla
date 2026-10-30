const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

const SUPABASE_URL='https://okxdhbteqgjwjugwuljm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_hfDtRFUYMR3TonqbFHQ7dg_ZPSXPb4M';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let cloudUser=null,cloudReady=false,cloudWriteQueue=Promise.resolve();
async function syncCloud(){if(!cloudUser||!cloudReady)return;const payload={user_id:cloudUser.id,data:db,profile,updated_at:new Date().toISOString()};cloudWriteQueue=cloudWriteQueue.then(()=>supabaseClient.from('vanilla_store_data').upsert(payload,{onConflict:'user_id'})).then(({error})=>{if(error){console.error('Supabase save:',error);toast('No se pudo sincronizar. Revisa tu conexión.')}});return cloudWriteQueue}
async function loadCloudForUser(user){cloudUser=user;cloudReady=false;const {data,error}=await supabaseClient.from('vanilla_store_data').select('data,profile').eq('user_id',user.id).maybeSingle();if(error){console.error(error);$('#auth-message').textContent='Error al cargar la tienda: '+error.message;return false}if(data){db={...{products:[],sales:[],events:[],dailyClosings:[]},...(data.data||{})};profile=data.profile||{name:'Mi perfil',photo:''};localStorage.setItem(KEY,JSON.stringify(db));localStorage.setItem('badulaque_vanilla_profile',JSON.stringify(profile))}else{const {error:insertError}=await supabaseClient.from('vanilla_store_data').insert({user_id:user.id,data:db,profile});if(insertError){console.error(insertError);$('#auth-message').textContent='No se pudo migrar la información: '+insertError.message;return false}}cloudReady=true;$('#auth-gate').style.display='none';renderAll();renderProfile();return true}
async function initCloudAuth(){$('#auth-form').addEventListener('submit',async e=>{e.preventDefault();const email=$('#auth-email').value.trim(),password=$('#auth-password').value;$('#auth-message').textContent='Conectando…';$('#auth-submit').disabled=true;const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});$('#auth-submit').disabled=false;if(error){$('#auth-message').textContent=error.message;return}if(data.user)await loadCloudForUser(data.user)});$('#auth-signup').addEventListener('click',async()=>{const email=$('#auth-email').value.trim(),password=$('#auth-password').value;if(!email||password.length<6){$('#auth-message').textContent='Escribe tu correo y una contraseña de al menos 6 caracteres.';return}$('#auth-message').textContent='Creando cuenta…';const {data,error}=await supabaseClient.auth.signUp({email,password});if(error){$('#auth-message').textContent=error.message;return}if(data.session&&data.user)await loadCloudForUser(data.user);else $('#auth-message').textContent='Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'});const {data:{session}}=await supabaseClient.auth.getSession();if(session?.user)await loadCloudForUser(session.user)}

const KEY='badulaque_vanilla_v1';
let db=JSON.parse(localStorage.getItem(KEY)||'{"products":[],"sales":[],"events":[],"dailyClosings":[]}');
db.dailyClosings ||= []; db.sales ||= []; db.products ||= []; db.events ||= [];
let profile=JSON.parse(localStorage.getItem('badulaque_vanilla_profile')||'{"name":"Mi perfil","photo":""}');
let selectedEvent=null,pendingDeleteEvent=null,editingDailyId=null,calcValue='0',calcStored=null,calcOp=null,calcFresh=false,wheelRotation=0;
const money=n=>new Intl.NumberFormat('es-PA',{style:'currency',currency:'USD'}).format(Number(n)||0);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));renderAll();syncCloud()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id===name));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('#page-title').textContent=({dashboard:'Resumen',calculator:'Mostrador',daily:'Cierre diario',inventory:'Inventario',events:'Eventos y ruleta'})[name]}
$$('.nav').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
$('#today').textContent=new Intl.DateTimeFormat('es-PA',{dateStyle:'full'}).format(new Date());
$('#cancel-delete-event').onclick=()=>{pendingDeleteEvent=null;$('#confirm-delete-modal').classList.add('hidden')};
$('#confirm-delete-modal').addEventListener('click',e=>{if(e.target.id==='confirm-delete-modal'){$('#cancel-delete-event').click()}});
$('#confirm-delete-event').onclick=()=>{if(!pendingDeleteEvent)return;const id=pendingDeleteEvent;pendingDeleteEvent=null;db.events=db.events.filter(x=>x.id!==id);if(selectedEvent===id)selectedEvent=db.events.at(-1)?.id||null;$('#confirm-delete-modal').classList.add('hidden');save();toast('Sorteo eliminado ♡')};
$('#event-image').addEventListener('change',e=>{$('#event-file-name').textContent=e.target.files[0]?.name||'Ningún archivo seleccionado'});
function renderAll(){renderDashboard();renderProducts();renderEvents();renderDaily();renderGreeting()}
function renderGreeting(){const name=(profile.name||'').trim().split(/\\s+/)[0];const el=$('#dashboard-greeting');if(el)el.textContent=name?'¡Hola, '+name+'! ♡':'¡Hola! ♡'}
function renderProfile(){const name=profile.name||'Mi perfil',avatar=profile.photo?`<img src="${profile.photo}" alt="Foto de perfil">`:esc(name.trim().charAt(0).toUpperCase()||'♡');$('#profile-name').textContent=name;$('#profile-avatar').innerHTML=avatar;$('#profile-preview').innerHTML=avatar;$('#profile-name-input').value=name}
function openProfile(){renderProfile();$('#profile-backdrop').classList.remove('hidden')}
$('#profile-edit').onclick=openProfile;$('#profile-close').onclick=()=>$('#profile-backdrop').classList.add('hidden');$('#profile-backdrop').addEventListener('click',e=>{if(e.target.id==='profile-backdrop')e.currentTarget.classList.add('hidden')});
async function imageToDataUrl(file,maxBytes=1.4*1024*1024){if(!file.type.startsWith('image/'))throw new Error('Selecciona una imagen válida');if(file.size<=maxBytes)return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();for(const quality of [.86,.76,.66,.56,.46]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=maxBytes)return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)})}throw new Error('La imagen es demasiado grande para comprimirla automáticamente')}
$('#profile-photo').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const image=await imageToDataUrl(file);profile.photo=image;renderProfile();$('#profile-file-name').textContent=file.name+' (optimizada)';syncCloud()}catch(err){e.target.value='';toast(err.message||'No se pudo procesar la imagen')}});
$('#profile-remove-photo').onclick=()=>{profile.photo='';$('#profile-photo').value='';$('#profile-file-name').textContent='Foto eliminada';renderProfile()};
$('#profile-form').onsubmit=e=>{e.preventDefault();const name=$('#profile-name-input').value.trim();if(!name)return toast('Escribe un nombre para tu perfil');profile.name=name;renderGreeting();localStorage.setItem('badulaque_vanilla_profile',JSON.stringify(profile));syncCloud();renderProfile();$('#profile-backdrop').classList.add('hidden');toast('Perfil guardado ♡')};

function renderDashboard(){
 const today=new Date().toLocaleDateString('en-CA'),sales=db.sales.filter(s=>s.date===today);
 const latest=db.dailyClosings?.at(-1),revenue=latest?.revenue??sales.reduce((a,s)=>a+s.total,0),profit=latest?.profit??sales.reduce((a,s)=>a+s.profit,0);
 $('#day-sales').textContent=money(revenue);$('#day-profit').textContent=money(profit);
 $('#product-count').textContent=db.products.length;$('#unit-count').textContent=db.products.reduce((a,p)=>a+p.stock,0);
 $('#recent-sales').innerHTML=sales.length?sales.slice().reverse().slice(0,6).map(s=>`<div class="participant"><span>${esc(s.name)} × ${s.qty}</span><b>${money(s.total)}</b></div>`).join(''):'Todavía no hay ventas registradas hoy.';
}
function renderProducts(){
 const capital=db.products.reduce((a,p)=>a+p.cost*p.stock,0),stockValue=db.products.reduce((a,p)=>a+p.price*p.stock,0),total=db.sales.reduce((a,s)=>a+s.total,0);
 $('#capital').textContent=money(capital);$('#stock-value').textContent=money(stockValue);$('#all-sales').textContent=money(total);
 $('#product-rows').innerHTML=db.products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><div class="actions"><button class="action" data-edit="${p.id}">Editar</button><button class="action" data-restock="${p.id}">＋ Stock</button><button class="action danger" data-delete="${p.id}">Eliminar</button></div></td></tr>`).join('');
 $('#inventory-empty').classList.toggle('hidden',db.products.length>0);
 $('#product-rows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));
 $('#product-rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este producto? El historial de ventas se conserva.')){db.products=db.products.filter(p=>p.id!==b.dataset.delete);save()}});
 $('#product-rows').querySelectorAll('[data-restock]').forEach(b=>b.onclick=()=>{const p=db.products.find(x=>x.id===b.dataset.restock),n=Number(prompt(`¿Cuántas unidades agregar a ${p.name}?`,1));if(Number.isInteger(n)&&n>0){p.stock+=n;save();toast('Inventario actualizado')}});
}
function openProduct(id){const p=db.products.find(x=>x.id===id);$('#product-form').reset();$('#product-id').value=p?.id||'';$('#product-modal-title').textContent=p?'Editar producto':'Agregar producto';if(p){$('#product-name').value=p.name;$('#product-cost').value=p.cost;$('#product-price').value=p.price;$('#product-stock').value=p.stock}$('#product-modal').classList.remove('hidden')}
$('#add-product').onclick=()=>openProduct();
$('#product-form').onsubmit=e=>{e.preventDefault();const id=$('#product-id').value,data={name:$('#product-name').value.trim(),cost:+$('#product-cost').value,price:+$('#product-price').value,stock:+$('#product-stock').value};if(!data.name||data.cost<0||data.price<0||data.stock<0)return;const old=db.products.find(p=>p.id===id);if(old)Object.assign(old,data);else db.products.push({id:crypto.randomUUID(),...data});$('#product-modal').classList.add('hidden');save();toast('Producto guardado')};

// Daily cash and inventory snapshots (no per-sale entry required)
function renderDaily(){
 const fields=$('#daily-product-fields');if(!fields)return;
 const previous=db.dailyClosings.at(-1);
 fields.innerHTML=db.products.map(p=>{
  const old=previous?.products?.find(x=>x.id===p.id),opening=old?old.closing:p.stock;
  return `<div class="daily-product-row" data-product="${p.id}"><div class="daily-product-name"><b>${esc(p.name)}</b><small>Había: <strong>${opening}</strong> · Precio: ${money(p.price)} · Costo: ${money(p.cost)}</small></div><label>Trajiste de la capital<input type="number" min="0" step="1" value="0" data-restock="${p.id}"></label><label>Quedan ahora<input type="number" min="0" step="1" value="${opening}" data-closing="${p.id}"></label></div>`
 }).join('')||'<p class="empty">Primero agrega tus productos en Inventario.</p>';
 $('#daily-results').innerHTML=previous?dailyStatsMarkup(previous,true):'<p class="empty">Tu primer cierre aparecerá aquí con las estadísticas del día.</p>';
 $('#daily-history').innerHTML=db.dailyClosings.length?db.dailyClosings.slice().reverse().map((x,i)=>`<div class="daily-history-row"><div><b>${new Date(x.created).toLocaleDateString('es-PA')}</b><small>${x.products.reduce((a,p)=>a+p.sold,0)} unidades vendidas · ${esc(x.note||'Cierre diario')}</small></div><div><b>${money(x.revenue||0)}</b><small>Ganancia: ${money(x.profit||0)}</small>${i===0?`<button type="button" class="action" data-edit-daily="${x.id}">Ajustar cantidades</button>`:''}</div></div>`).join(''):'Todavía no hay cierres registrados.';
}
$('#daily-history').addEventListener('click',e=>{const b=e.target.closest('[data-edit-daily]');if(!b)return;const entry=db.dailyClosings.at(-1);if(!entry||entry.id!==b.dataset.editDaily)return;editingDailyId=entry.id;const previous=db.dailyClosings.at(-2);$('#daily-product-fields').innerHTML=db.products.map(p=>{const saved=entry.products.find(x=>x.id===p.id),opening=previous?.products?.find(x=>x.id===p.id)?.closing??saved?.opening??0;return `<div class="daily-product-row"><div class="daily-product-name"><b>${esc(p.name)}</b><small>Había: ${opening}</small></div><label>Trajiste de la capital<input type="number" min="0" step="1" value="${saved?.restock??0}" data-restock="${p.id}"></label><label>Quedan ahora<input type="number" min="0" step="1" value="${saved?.closing??0}" data-closing="${p.id}"></label></div>`}).join('');$('#daily-note').value=entry.note||'';$('#daily-form button[type="submit"]').textContent='♡ Guardar corrección';$('#daily-form').scrollIntoView({behavior:'smooth',block:'start'});toast('Corrige las cantidades y guarda');});
function dailyStatsMarkup(entry,previous=false){
 const products=entry.products||[],sold=products.reduce((a,p)=>a+(p.sold||0),0);
 const rows=products.filter(p=>p.sold>0).sort((a,b)=>b.revenue-a.revenue).map(p=>`<div class="daily-stat-row"><span><b>${esc(p.name)}</b><small>${p.sold} vendidos × ${money(p.price)}</small></span><strong>${money(p.revenue)}</strong></div>`).join('');
 return `<div class="daily-stats"><div class="daily-stats-head"><span class="eyebrow">${previous?'ÚLTIMO CIERRE':'CIERRE GUARDADO'}</span><h3>${new Date(entry.created).toLocaleDateString('es-PA',{dateStyle:'full'})}</h3></div><div class="daily-result-grid"><article><small>Venta estimada</small><b>${money(entry.revenue||0)}</b></article><article><small>Ganancia estimada</small><b>${money(entry.profit||0)}</b></article><article><small>Unidades vendidas</small><b>${sold}</b></article><article><small>Reposición</small><b>${(entry.products||[]).reduce((n,p)=>n+(p.restock||0),0)} unidades</b></article></div><div class="daily-stat-list"><h4>¿Qué vendiste?</h4>${rows||'<p class="empty">No se registraron ventas estimadas en este cierre.</p>'}</div><div class="daily-stat-footer">Inventario guardado automáticamente para el próximo cierre ♡</div></div>`;
}
$('#daily-form').onsubmit=e=>{
 e.preventDefault();const previous=editingDailyId?db.dailyClosings.at(-2):db.dailyClosings.at(-1);
 try{
  const products=db.products.map(p=>{
   const old=previous?.products?.find(x=>x.id===p.id),opening=old?old.closing:p.stock;
   const restock=Number($('[data-restock="'+p.id+'"]').value),closing=Number($('[data-closing="'+p.id+'"]').value);
   if(!Number.isInteger(restock)||restock<0||!Number.isInteger(closing)||closing<0)throw Error('Revisa las cantidades de '+p.name);
   const available=opening+restock;if(closing>available)throw Error('Quedan más unidades de '+p.name+' de las que había más la reposición.');
   const sold=available-closing;
   return {id:p.id,name:p.name,cost:p.cost,price:p.price,opening,restock,closing,sold,revenue:sold*p.price,restockCost:restock*p.cost,profit:sold*(p.price-p.cost)};
  });
  const revenue=products.reduce((n,p)=>n+p.revenue,0),restockCost=products.reduce((n,p)=>n+p.restockCost,0),profit=products.reduce((n,p)=>n+p.profit,0);
  const entry={id:crypto.randomUUID(),created:new Date().toISOString(),revenue,restockCost,profit,products,note:$('#daily-note').value.trim()};
  if(editingDailyId){const idx=db.dailyClosings.findIndex(x=>x.id===editingDailyId);if(idx>=0){entry.id=editingDailyId;entry.created=db.dailyClosings[idx].created;db.dailyClosings[idx]=entry;}}else db.dailyClosings.push(entry);editingDailyId=null;products.forEach(x=>{const p=db.products.find(p=>p.id===x.id);if(p)p.stock=x.closing});
  save();$('#daily-note').value='';$('#daily-form button[type="submit"]').textContent='♡ Calcular y guardar cierre';renderDaily();$('#daily-results').innerHTML=dailyStatsMarkup(entry);toast('Cierre diario guardado ♡');
 }catch(err){toast(err.message||'Revisa las cantidades ingresadas')}
};

// Calculadora
function calc(k){if(k==='AC'){calcValue='0';calcStored=null;calcOp=null;calcFresh=false}
else if(k==='±'){calcValue=String(-Number(calcValue))}
else if(k==='%'){calcValue=String(Number(calcValue)/100)}
else if(['+','-','*','/'].includes(k)){calcStored=Number(calcValue);calcOp=k;calcFresh=true}
else if(k==='='){if(calcOp&&calcStored!==null){const b=Number(calcValue);let r=calcOp==='+'?calcStored+b:calcOp==='-'?calcStored-b:calcOp==='*'?calcStored*b:calcStored/b;calcValue=String(Number.isFinite(r)?Number(r.toFixed(9)):'Error');calcStored=null;calcOp=null;calcFresh=true}}
else if(k==='.'){if(calcFresh){calcValue='0.';calcFresh=false}else if(!calcValue.includes('.'))calcValue+='.'}
else if(/^\d$/.test(k)){calcValue=calcFresh||calcValue==='0'?k:calcValue+k;calcFresh=false}
$('#calc-display').value=calcValue}
$$('[data-key]').forEach(b=>b.onclick=()=>calc(b.dataset.key));
// Events and raffle
let drawing=false,confettiFrame=null;
$('#event-form').onsubmit=async e=>{e.preventDefault();const title=$('#event-title').value.trim(),prize=$('#event-prize').value.trim(),file=$('#event-image').files[0];let image='';if(file){try{image=await imageToDataUrl(file)}catch(err){return toast(err.message||'No se pudo procesar la imagen')}}
const ev={id:crypto.randomUUID(),title,prize,image,participants:[],winner:null,winners:[],created:new Date().toISOString()};db.events.push(ev);selectedEvent=ev.id;$('#event-form').reset();$('#event-file-name').textContent='Ningún archivo seleccionado';save();toast('Sorteo creado ♡')};
function currentEvent(){return db.events.find(e=>e.id===selectedEvent)}
function renderEvents(){
 const active=currentEvent();if(active){const tickets=[];active.participants.forEach(p=>{for(let i=0;i<p.quantity;i++)tickets.push(p)});buildWheel(tickets)}else buildWheel([]);

 const total=db.events.reduce((n,e)=>n+(e.participants||[]).reduce((a,p)=>a+p.quantity,0),0);
 $('#raffle-total').textContent=db.events.length;$('#raffle-participants').textContent=total;
 $('#event-list').classList.toggle('empty',!db.events.length);
 $('#event-list').innerHTML=db.events.length?db.events.slice().reverse().map(ev=>{const n=(ev.participants||[]).reduce((a,p)=>a+p.quantity,0);return `<div class="raffle-event-card ${ev.id===selectedEvent?'selected':''}" data-event="${ev.id}"><button class="raffle-event-select" type="button" data-select-event="${ev.id}"><span class="raffle-event-thumb">${ev.image?`<img src="${ev.image}" alt="">`:'🎁'}</span><span class="raffle-event-copy"><b>${esc(ev.title)}</b><small>${esc(ev.prize)}</small><em>${n} participaciones · ${(ev.winners|| (ev.winner?[ev.winner]:[])).length} ganadores</em></span></button><button class="raffle-delete" type="button" data-delete-event="${ev.id}" title="Eliminar sorteo" aria-label="Eliminar sorteo">×</button></div>`}).join(''):'Todavía no hay sorteos. ¡Crea el primero!';
 $('#event-list').querySelectorAll('[data-select-event]').forEach(b=>b.onclick=()=>{selectedEvent=b.dataset.selectEvent;renderEvents()});
 $('#event-list').querySelectorAll('[data-delete-event]').forEach(b=>b.onclick=()=>{const ev=db.events.find(x=>x.id===b.dataset.deleteEvent);if(!ev)return;pendingDeleteEvent=ev.id;$('#confirm-delete-title').textContent='¿Eliminar este sorteo?';$('#confirm-delete-message').textContent=`¿Eliminar “${ev.title}” y todos sus participantes y ganadores? Esta acción no se puede deshacer.`;$('#confirm-delete-modal').classList.remove('hidden')}); 
 const ev=currentEvent(),count=ev?(ev.participants||[]).reduce((a,p)=>a+p.quantity,0):0;
 $('#selected-event-label').textContent=ev?`${ev.title} · Premio: ${ev.prize}`:'Selecciona un sorteo';
 $('#add-participant').disabled=!ev;$('#spin-button').disabled=drawing||!ev||!count;
 $('#ticket-count').textContent=`${count} participaciones`;$('#draw-ticket-count').textContent=count;
 $('#participant-list').classList.toggle('empty',!ev||!ev.participants?.length);
 $('#participant-list').innerHTML=ev?(ev.participants.length?ev.participants.map(p=>`<div class="raffle-person"><span><b>${esc(p.name)}</b><small>${esc(p.phone)}</small></span><span class="raffle-person-actions"><em>${p.quantity} números</em><button class="action danger" data-remove="${p.id}" type="button">Quitar</button></span></div>`).join(''):'Aún no hay participantes.'):'Selecciona un sorteo para ver participantes.';
 $('#participant-list').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const e=currentEvent();e.participants=e.participants.filter(p=>p.id!==b.dataset.remove);save()});
 const winners=ev?(ev.winners||(ev.winner?[ev.winner]:[])):[];
 $('#winner-count').textContent=`${winners.length} ganadores`;
 $('#winner-history').classList.toggle('empty',!winners.length);
 $('#winner-history').innerHTML=winners.length?winners.slice().reverse().map((w,i)=>`<div class="winner-row"><span class="winner-medal">✦</span><span><b>${esc(w.name)}</b><small>${esc(w.phone||'')} · Ronda ${w.round||winners.length-i}</small></span><time>${new Date(w.at).toLocaleDateString('es-PA')}</time></div>`).join(''):'Todavía no hay ganadores. ¡La primera ronda te espera!';
 if(ev?.winner){$('#winner').classList.remove('hidden');$('#winner').textContent=`Último ganador: ${ev.winner.name} · ${ev.winner.phone}`}else{$('#winner').classList.add('hidden');$('#winner').textContent=''}
}
$('#participant-form').onsubmit=e=>{e.preventDefault();const ev=currentEvent();if(!ev)return;const name=$('#participant-name').value.trim(),phone=$('#participant-phone').value.trim(),quantity=Number($('#participant-quantity').value);if(!Number.isInteger(quantity)||quantity<1||quantity>500)return toast('Cantidad no válida');const old=ev.participants.find(p=>p.name.toLowerCase()===name.toLowerCase()&&p.phone===phone);if(old)old.quantity+=quantity;else ev.participants.push({id:crypto.randomUUID(),name,phone,quantity});$('#participant-form').reset();$('#participant-quantity').value=1;save();toast(`${quantity} participaciones agregadas`)};
function launchConfetti(){const canvas=$('#confetti-canvas'),ctx=canvas.getContext('2d');canvas.width=window.innerWidth*devicePixelRatio;canvas.height=window.innerHeight*devicePixelRatio;canvas.style.display='block';ctx.scale(devicePixelRatio,devicePixelRatio);const w=window.innerWidth,h=window.innerHeight,colors=['#e7a8c7','#f3d78b','#a9c99b','#9fc9dc','#c3a5df','#f3a48f','#ffffff'];const bits=Array.from({length:190},()=>({x:Math.random()*w,y:-20-Math.random()*h*.7,vx:(Math.random()-.5)*4,vy:2+Math.random()*5,size:5+Math.random()*7,rot:Math.random()*6.28,spin:(Math.random()-.5)*.22,color:colors[Math.floor(Math.random()*colors.length)],shape:Math.random()>.45?'rect':'circle'}));let frame=0;function draw(){ctx.clearRect(0,0,w,h);bits.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.rot+=p.spin;p.vy+=.018;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;if(p.shape==='rect')ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.62);else{ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill()}ctx.restore()});frame++;if(frame<230){confettiFrame=requestAnimationFrame(draw)}else{ctx.clearRect(0,0,w,h);canvas.style.display='none'}}if(confettiFrame)cancelAnimationFrame(confettiFrame);draw()}
function buildWheel(tickets){const wheel=$('#wheel');if(!tickets.length){wheel.style.setProperty('--wheel-segments','conic-gradient(#c8d8bd 0 360deg)');return}const palette=['#c8d8bd','#f6e5c9','#e8c0d0','#cbbbe0','#a9c9d2','#e7d6ad','#b9cba9','#e6b8a8'];const step=360/tickets.length;const stops=tickets.map((_,i)=>`${palette[i%palette.length]} ${(i*step).toFixed(4)}deg ${((i+1)*step).toFixed(4)}deg`).join(',');wheel.style.setProperty('--wheel-segments',`conic-gradient(${stops})`)}
$('#spin-button').onclick=()=>{const ev=currentEvent();if(!ev||drawing)return;const tickets=[];ev.participants.forEach(p=>{for(let i=0;i<p.quantity;i++)tickets.push(p)});if(!tickets.length)return;drawing=true;$('#spin-button').disabled=true;$('#winner').classList.add('hidden');buildWheel(tickets);const winningIndex=Math.floor(Math.random()*tickets.length),chosen=tickets[winningIndex],segment=360/tickets.length,center=winningIndex*segment+segment/2;const current=((wheelRotation%360)+360)%360;const desired=(360-center+360)%360;const extra=(desired-current+360)%360;wheelRotation+=1800+extra;$('#wheel').style.transform=`rotate(${wheelRotation}deg)`;setTimeout(()=>{const entry={name:chosen.name,phone:chosen.phone,at:new Date().toISOString(),round:(ev.winners||[]).length+1};ev.winners||=[];ev.winners.push(entry);ev.winner=entry;save();$('#winner-name').textContent=chosen.name;$('#winner-prize').textContent=`Ganó: ${ev.prize} · ${chosen.phone} · Ronda ${entry.round}`;if(ev.image){$('#winner-image').src=ev.image;$('#winner-image').classList.remove('hidden')}else $('#winner-image').classList.add('hidden');$('#winner-modal').classList.remove('hidden');launchConfetti();drawing=false;$('#spin-button').disabled=false},4100)};
renderAll();renderProfile();
initCloudAuth();

const themeKey='badulaque_vanilla_theme';
function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(themeKey,theme);document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('chosen',b.dataset.theme===theme))}
applyTheme(localStorage.getItem(themeKey)||'natural');
$('#theme-launch').onclick=()=>$('#theme-backdrop').classList.remove('hidden');
$('#theme-close').onclick=()=>$('#theme-backdrop').classList.add('hidden');
$('#theme-backdrop').addEventListener('click',e=>{if(e.target.id==='theme-backdrop')e.currentTarget.classList.add('hidden')});
$$('[data-theme]').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
const scene=$('#counter-scene');
if(scene){scene.addEventListener('pointermove',e=>{const r=scene.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;scene.querySelectorAll('[data-float]').forEach((el,i)=>{el.style.setProperty('--mx',x*(i%2?22:-18)+'px');el.style.setProperty('--my',y*(i%2?16:-12)+'px')})});scene.addEventListener('pointerleave',()=>scene.querySelectorAll('[data-float]').forEach(el=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')}))}
