const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='badulaque_vanilla_v1';
let db=JSON.parse(localStorage.getItem(KEY)||'{"products":[],"sales":[],"events":[]}');
let selectedEvent=null,calcValue='0',calcStored=null,calcOp=null,calcFresh=false,wheelRotation=0;
const money=n=>new Intl.NumberFormat('es-PA',{style:'currency',currency:'USD'}).format(Number(n)||0);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));renderAll()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id===name));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('#page-title').textContent=({dashboard:'Resumen',calculator:'Calculadora',inventory:'Inventario',events:'Eventos y ruleta'})[name]}
$$('.nav').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
$('#today').textContent=new Intl.DateTimeFormat('es-PA',{dateStyle:'full'}).format(new Date());
function renderAll(){renderDashboard();renderProducts();renderSales();renderEvents()}
function renderDashboard(){
 const today=new Date().toLocaleDateString('en-CA'),sales=db.sales.filter(s=>s.date===today);
 const revenue=sales.reduce((a,s)=>a+s.total,0),profit=sales.reduce((a,s)=>a+s.profit,0);
 $('#day-sales').textContent=money(revenue);$('#day-profit').textContent=money(profit);
 $('#product-count').textContent=db.products.length;$('#unit-count').textContent=db.products.reduce((a,p)=>a+p.stock,0);
 $('#recent-sales').innerHTML=sales.length?sales.slice().reverse().slice(0,6).map(s=>`<div class="participant"><span>${esc(s.name)} × ${s.qty}</span><b>${money(s.total)}</b></div>`).join(''):'Todavía no hay ventas registradas hoy.';
}
function renderProducts(){
 const capital=db.products.reduce((a,p)=>a+p.cost*p.stock,0),stockValue=db.products.reduce((a,p)=>a+p.price*p.stock,0),total=db.sales.reduce((a,s)=>a+s.total,0);
 $('#capital').textContent=money(capital);$('#stock-value').textContent=money(stockValue);$('#all-sales').textContent=money(total);
 $('#product-rows').innerHTML=db.products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><div class="actions"><button class="action" data-edit="${p.id}">Editar</button><button class="action" data-restock="${p.id}">＋ Stock</button><button class="action danger" data-delete="${p.id}">Eliminar</button></div></td></tr>`).join('');
 $('#inventory-empty').classList.toggle('hidden',db.products.length>0);
 $('#sale-product').innerHTML='<option value="">Seleccionar producto</option>'+db.products.map(p=>`<option value="${p.id}" ${p.stock<1?'disabled':''}>${esc(p.name)} (${p.stock} disponibles)</option>`).join('');
 $('#product-rows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));
 $('#product-rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este producto? El historial de ventas se conserva.')){db.products=db.products.filter(p=>p.id!==b.dataset.delete);save()}});
 $('#product-rows').querySelectorAll('[data-restock]').forEach(b=>b.onclick=()=>{const p=db.products.find(x=>x.id===b.dataset.restock),n=Number(prompt(`¿Cuántas unidades agregar a ${p.name}?`,1));if(Number.isInteger(n)&&n>0){p.stock+=n;save();toast('Inventario actualizado')}});
 updateEstimate();
}
function renderSales(){
 $('#sales-history').innerHTML=db.sales.length?'<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Ganancia</th></tr></thead><tbody>'+db.sales.slice().reverse().map(s=>`<tr><td>${new Date(s.created).toLocaleString('es-PA')}</td><td>${esc(s.name)}</td><td>${s.qty}</td><td>${money(s.total)}</td><td>${money(s.profit)}</td></tr>`).join('')+'</tbody></table></div>':'Todavía no hay ventas registradas.';
}
function openProduct(id){const p=db.products.find(x=>x.id===id);$('#product-form').reset();$('#product-id').value=p?.id||'';$('#product-modal-title').textContent=p?'Editar producto':'Agregar producto';if(p){$('#product-name').value=p.name;$('#product-cost').value=p.cost;$('#product-price').value=p.price;$('#product-stock').value=p.stock}$('#product-modal').classList.remove('hidden')}
$('#add-product').onclick=()=>openProduct();
$('#product-form').onsubmit=e=>{e.preventDefault();const id=$('#product-id').value,data={name:$('#product-name').value.trim(),cost:+$('#product-cost').value,price:+$('#product-price').value,stock:+$('#product-stock').value};if(!data.name||data.cost<0||data.price<0||data.stock<0)return;const old=db.products.find(p=>p.id===id);if(old)Object.assign(old,data);else db.products.push({id:crypto.randomUUID(),...data});$('#product-modal').classList.add('hidden');save();toast('Producto guardado')};
$('#sale-product').onchange=updateEstimate;$('#sale-quantity').oninput=updateEstimate;
function updateEstimate(){const p=db.products.find(x=>x.id===$('#sale-product').value),q=Number($('#sale-quantity').value)||0;$('#sale-estimate').textContent=money((p?.price||0)*q)}
$('#sale-form').onsubmit=e=>{e.preventDefault();const p=db.products.find(x=>x.id===$('#sale-product').value),qty=Number($('#sale-quantity').value);if(!p||!Number.isInteger(qty)||qty<1||qty>p.stock)return toast('Revisa el producto y la cantidad disponible');p.stock-=qty;const total=p.price*qty,profit=(p.price-p.cost)*qty;db.sales.push({id:crypto.randomUUID(),productId:p.id,name:p.name,qty,total,profit,date:new Date().toLocaleDateString('en-CA'),created:new Date().toISOString()});$('#sale-quantity').value=1;save();toast('Venta registrada correctamente')};
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
$('#event-form').onsubmit=async e=>{e.preventDefault();const title=$('#event-title').value.trim(),prize=$('#event-prize').value.trim(),file=$('#event-image').files[0];let image='';if(file){if(file.size>1.5*1024*1024)return toast('La imagen debe pesar menos de 1.5 MB');image=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
const ev={id:crypto.randomUUID(),title,prize,image,participants:[],winner:null,created:new Date().toISOString()};db.events.push(ev);selectedEvent=ev.id;$('#event-form').reset();save();toast('Evento creado')};
function currentEvent(){return db.events.find(e=>e.id===selectedEvent)}
function renderEvents(){
 $('#event-list').innerHTML=db.events.length?db.events.slice().reverse().map(ev=>`<div class="event-item ${ev.id===selectedEvent?'selected':''}" data-event="${ev.id}"><b>${esc(ev.title)}</b><small>${esc(ev.prize)} · ${ev.participants.reduce((a,p)=>a+p.quantity,0)} números</small></div>`).join(''):'Todavía no hay eventos.';
 $('#event-list').querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{selectedEvent=b.dataset.event;renderEvents()});
 const ev=currentEvent();$('#selected-event-label').textContent=ev?`${ev.title} · Premio: ${ev.prize}`:'Selecciona o crea un evento';
 $('#add-participant').disabled=!ev;$('#spin-button').disabled=!ev||!ev.participants.some(p=>p.quantity>0);
 const count=ev?ev.participants.reduce((a,p)=>a+p.quantity,0):0;$('#ticket-count').textContent=`${count} participaciones`;
 $('#participant-list').innerHTML=ev?(ev.participants.length?ev.participants.map(p=>`<div class="participant"><span><b>${esc(p.name)}</b><br><small>${esc(p.phone)}</small></span><span>${p.quantity} números <button class="action danger" data-remove="${p.id}">×</button></span></div>`).join(''):'Aún no hay participantes.'):'Selecciona un evento para ver sus participantes.';
 $('#participant-list').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const e=currentEvent();e.participants=e.participants.filter(p=>p.id!==b.dataset.remove);save()});
 if(ev?.winner){$('#winner').classList.remove('hidden');$('#winner').textContent=`Ganador: ${ev.winner.name} · ${ev.winner.phone}`}else{$('#winner').classList.add('hidden');$('#winner').textContent=''}
}
$('#participant-form').onsubmit=e=>{e.preventDefault();const ev=currentEvent();if(!ev)return;const name=$('#participant-name').value.trim(),phone=$('#participant-phone').value.trim(),quantity=Number($('#participant-quantity').value);if(!Number.isInteger(quantity)||quantity<1||quantity>500)return toast('Cantidad no válida');const old=ev.participants.find(p=>p.name.toLowerCase()===name.toLowerCase()&&p.phone===phone);if(old)old.quantity+=quantity;else ev.participants.push({id:crypto.randomUUID(),name,phone,quantity});$('#participant-form').reset();$('#participant-quantity').value=1;save();toast(`${quantity} participaciones agregadas`)};
$('#spin-button').onclick=()=>{const ev=currentEvent();if(!ev)return;const tickets=[];ev.participants.forEach(p=>{for(let i=0;i<p.quantity;i++)tickets.push(p)});if(!tickets.length)return;$('#spin-button').disabled=true;$('#winner').classList.add('hidden');const chosen=tickets[Math.floor(Math.random()*tickets.length)];wheelRotation+=1800+Math.floor(Math.random()*720);$('#wheel').style.transform=`rotate(${wheelRotation}deg)`;setTimeout(()=>{ev.winner={name:chosen.name,phone:chosen.phone,at:new Date().toISOString()};save();$('#winner-name').textContent=chosen.name;$('#winner-prize').textContent=`Ganó: ${ev.prize} · ${chosen.phone}`;if(ev.image){$('#winner-image').src=ev.image;$('#winner-image').classList.remove('hidden')}else $('#winner-image').classList.add('hidden');$('#winner-modal').classList.remove('hidden');$('#spin-button').disabled=false},4100)};
renderAll();
