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
let selectedEvent=null,calcValue='0',calcStored=null,calcOp=null,calcFresh=false,wheelRotation=0;
const money=n=>new Intl.NumberFormat('es-PA',{style:'currency',currency:'USD'}).format(Number(n)||0);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));renderAll();syncCloud()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id===name));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('#page-title').textContent=({dashboard:'Resumen',calculator:'Mostrador',daily:'Cierre diario',inventory:'Inventario',events:'Eventos y ruleta'})[name]}
$$('.nav').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
$('#today').textContent=new Intl.DateTimeFormat('es-PA',{dateStyle:'full'}).format(new Date());
$('#event-image').addEventListener('change',e=>{$('#event-file-name').textContent=e.target.files[0]?.name||'Ningún archivo seleccionado'});
function renderAll(){renderDashboard();renderProducts();renderEvents();renderDaily()}
function renderProfile(){const name=profile.name||'Mi perfil',avatar=profile.photo?`<img src="${profile.photo}" alt="Foto de perfil">`:esc(name.trim().charAt(0).toUpperCase()||'♡');$('#profile-name').textContent=name;$('#profile-avatar').innerHTML=avatar;$('#profile-preview').innerHTML=avatar;$('#profile-name-input').value=name}
function openProfile(){renderProfile();$('#profile-backdrop').classList.remove('hidden')}
$('#profile-edit').onclick=openProfile;$('#profile-close').onclick=()=>$('#profile-backdrop').classList.add('hidden');$('#profile-backdrop').addEventListener('click',e=>{if(e.target.id==='profile-backdrop')e.currentTarget.classList.add('hidden')});
async function imageToDataUrl(file,maxBytes=1.4*1024*1024){if(!file.type.startsWith('image/'))throw new Error('Selecciona una imagen válida');if(file.size<=maxBytes)return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();for(const quality of [.86,.76,.66,.56,.46]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=maxBytes)return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)})}throw new Error('La imagen es demasiado grande para comprimirla automáticamente')}
$('#profile-photo').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const image=await imageToDataUrl(file);profile.photo=image;renderProfile();$('#profile-file-name').textContent=file.name+' (optimizada)';syncCloud()}catch(err){e.target.value='';toast(err.message||'No se pudo procesar la imagen')}});
$('#profile-remove-photo').onclick=()=>{profile.photo='';$('#profile-photo').value='';$('#profile-file-name').textContent='Foto eliminada';renderProfile()};
$('#profile-form').onsubmit=e=>{e.preventDefault();const name=$('#profile-name-input').value.trim();if(!name)return toast('Escribe un nombre para tu perfil');profile.name=name;localStorage.setItem('badulaque_vanilla_profile',JSON.stringify(profile));syncCloud();renderProfile();$('#profile-backdrop').classList.add('hidden');toast('Perfil guardado ♡')};

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
 const fields=$('#daily-product-fields'); if(!fields)return;
 const previous=db.dailyClosings.at(-1);
 fields.innerHTML=db.products.map(p=>{const old=previous?.products?.find(x=>x.id===p.id);const opening=old?old.closing:p.stock;return `<div class="daily-product-row" data-product="${p.id}"><div class="daily-product-name"><b>${esc(p.name)}</b><small>Inicio: ${opening} · Precio: ${money(p.price)}</small></div><label>Repusiste<input type="number" min="0" step="1" value="0" data-restock="${p.id}"></label><label>Quedan<input type="number" min="0" step="1" value="${p.stock}" data-closing="${p.id}"></label></div>`}).join('')||'<p class="empty">Primero agrega tus productos en Inventario.</p>';
 $('#daily-opening-cash').value=previous?previous.closingCash:'';
 $('#daily-results').innerHTML=previous?`<div class="panel"><h3>Último cierre · ${new Date(previous.created).toLocaleDateString('es-PA')}</h3><p>Caja registrada: <b>${money(previous.closingCash)}</b> · Diferencia pendiente: <b>${money(previous.unidentified)}</b></p></div>`:'';
 $('#daily-history').innerHTML=db.dailyClosings.length?db.dailyClosings.slice().reverse().map(x=>`<div class="daily-history-row"><div><b>${new Date(x.created).toLocaleDateString('es-PA')}</b><small>${x.products.reduce((a,p)=>a+p.sold,0)} unidades vendidas estimadas · ${esc(x.note||'Sin notas')}</small></div><div><b>${money(x.closingCash)}</b><small>Diferencia: ${money(x.unidentified)}</small></div></div>`).join(''):'Todavía no hay cierres registrados.';
}
$('#daily-form').onsubmit=e=>{
 e.preventDefault();
 const previous=db.dailyClosings.at(-1),openingCash=Number($('#daily-opening-cash').value),closingCash=Number($('#daily-closing-cash').value),extraIn=Number($('#daily-extra-in').value)||0,extraOut=Number($('#daily-extra-out').value)||0;
 if(!Number.isFinite(openingCash)||!Number.isFinite(closingCash)||openingCash<0||closingCash<0)return toast('Revisa los valores de caja');
 const products=db.products.map(p=>{const old=previous?.products?.find(x=>x.id===p.id),opening=old?old.closing:p.stock,restock=Number($('[data-restock="'+p.id+'"]').value)||0,closing=Number($('[data-closing="'+p.id+'"]').value);if(!Number.isInteger(restock)||restock<0||!Number.isInteger(closing)||closing<0)throw new Error('Revisa las cantidades de '+p.name);const sold=Math.max(0,opening+restock-closing);return {id:p.id,name:p.name,cost:p.cost,price:p.price,opening,restock,closing,sold,revenue:sold*p.price,restockCost:restock*p.cost,profit:sold*(p.price-p.cost)}});
 const revenue=products.reduce((a,p)=>a+p.revenue,0),restockCost=products.reduce((a,p)=>a+p.restockCost,0),expected=openingCash+revenue+extraIn-restockCost-extraOut,unidentified=closingCash-expected;
 const entry={id:crypto.randomUUID(),created:new Date().toISOString(),openingCash,closingCash,extraIn,extraOut,revenue,restockCost,expected,unidentified,profit:products.reduce((a,p)=>a+p.profit,0),products,note:$('#daily-note').value.trim()};
 db.dailyClosings.push(entry);products.forEach(x=>{const p=db.products.find(p=>p.id===x.id);if(p)p.stock=x.closing});
 save();$('#daily-closing-cash').value='';$('#daily-extra-in').value='0';$('#daily-extra-out').value='0';$('#daily-note').value='';renderDaily();
 $('#daily-results').innerHTML=`<div class="daily-result-grid"><article><small>Ventas estimadas</small><b>${money(revenue)}</b></article><article><small>Ganancia estimada</small><b>${money(entry.profit)}</b></article><article><small>Reposiciones</small><b>${money(restockCost)}</b></article><article><small>Ingreso sin identificar</small><b>${money(unidentified)}</b><small>Puede incluir pasiva, ajustes u otros movimientos.</small></article></div>`;
 toast('Cierre diario guardado ♡');
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
 const total=db.events.reduce((n,e)=>n+(e.participants||[]).reduce((a,p)=>a+p.quantity,0),0);
 $('#raffle-total').textContent=db.events.length;$('#raffle-participants').textContent=total;
 $('#event-list').classList.toggle('empty',!db.events.length);
 $('#event-list').innerHTML=db.events.length?db.events.slice().reverse().map(ev=>{const n=(ev.participants||[]).reduce((a,p)=>a+p.quantity,0);return `<div class="raffle-event-card ${ev.id===selectedEvent?'selected':''}" data-event="${ev.id}"><button class="raffle-event-select" type="button" data-select-event="${ev.id}"><span class="raffle-event-thumb">${ev.image?`<img src="${ev.image}" alt="">`:'🎁'}</span><span class="raffle-event-copy"><b>${esc(ev.title)}</b><small>${esc(ev.prize)}</small><em>${n} participaciones · ${(ev.winners|| (ev.winner?[ev.winner]:[])).length} ganadores</em></span></button><button class="raffle-delete" type="button" data-delete-event="${ev.id}" title="Eliminar sorteo" aria-label="Eliminar sorteo">×</button></div>`}).join(''):'Todavía no hay sorteos. ¡Crea el primero!';
 $('#event-list').querySelectorAll('[data-select-event]').forEach(b=>b.onclick=()=>{selectedEvent=b.dataset.selectEvent;renderEvents()});
 $('#event-list').querySelectorAll('[data-delete-event]').forEach(b=>b.onclick=()=>{const ev=db.events.find(x=>x.id===b.dataset.deleteEvent);if(!ev)return;if(confirm('¿Eliminar el sorteo "'+ev.title+'" y todos sus participantes y ganadores? Esta acción no se puede deshacer.')){db.events=db.events.filter(x=>x.id!==ev.id);if(selectedEvent===ev.id)selectedEvent=db.events.at(-1)?.id||null;save();toast('Sorteo eliminado')}}); 
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
$('#spin-button').onclick=()=>{const ev=currentEvent();if(!ev||drawing)return;const tickets=[];ev.participants.forEach(p=>{for(let i=0;i<p.quantity;i++)tickets.push(p)});if(!tickets.length)return;drawing=true;$('#spin-button').disabled=true;$('#winner').classList.add('hidden');const chosen=tickets[Math.floor(Math.random()*tickets.length)];wheelRotation+=1800+Math.floor(Math.random()*720);$('#wheel').style.transform=`rotate(${wheelRotation}deg)`;setTimeout(()=>{const entry={name:chosen.name,phone:chosen.phone,at:new Date().toISOString(),round:(ev.winners||[]).length+1};ev.winners||=[];ev.winners.push(entry);ev.winner=entry;save();$('#winner-name').textContent=chosen.name;$('#winner-prize').textContent=`Ganó: ${ev.prize} · ${chosen.phone} · Ronda ${entry.round}`;if(ev.image){$('#winner-image').src=ev.image;$('#winner-image').classList.remove('hidden')}else $('#winner-image').classList.add('hidden');$('#winner-modal').classList.remove('hidden');launchConfetti();drawing=false;$('#spin-button').disabled=false},4100)};
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
