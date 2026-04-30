// popstart-extras.js — optional supplement for popstart-core.js
// HTTP, forms, lists, streaming, alerts, cookies, storage, clipboard, URL args
//
// <script src="popstart-core.js"></script>
// <script src="popstart-extras.js"></script>

'use strict'

// --- helpers ---

// upgrade safify to DOMPurify if available (core defines the default)
if(typeof DOMPurify!=='undefined'&&typeof DOMPurify.sanitize==='function')
	__.safify=DOMPurify.sanitize

__.datawrite=(path,name,value)=>{__.data[path]=__.data[path]||{};__.data[path][name]=value}

__.objValue=(obj,path)=>{
	if(!obj)return undefined
	if(!path)return obj
	for(const k of path.split('.')){
		if(obj&&typeof obj==='object'&&k in obj)obj=obj[k]
		else return undefined
	}
	return obj
}

__.objValueSet=(obj,path,value)=>{
	if(!obj||!path)return
	const keys=path.split('.')
	for(let i=0;i<keys.length-1;i++){
		if(!obj[keys[i]])obj[keys[i]]={}
		obj=obj[keys[i]]
	}
	obj[keys[keys.length-1]]=value
}

// --- HTTP (fetch wrappers) ---
// yes, fetch is annoying. these wrappers hide the pain.
// set __.config.httpHeaders for default headers (e.g., auth tokens)

__.config.httpHeaders=__.config.httpHeaders||{}

__.http=(url,method,data,readdatapath,headers)=>{
	// if no explicit data, read from __.data[readdatapath]
	if((data===undefined||data==='')&&readdatapath)
		data=__.objValue(__.data,readdatapath)
	let opts={method:method||'GET',headers:Object.assign({},__.config.httpHeaders)}
	if(headers)Object.assign(opts.headers,headers)
	if(data!==undefined&&data!==null){
		if(method==='GET'||method==='HEAD'){
			// GET/HEAD can't have body — append as query params
			let q=typeof data==='string'?data:Object.entries(data)
				.map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
			url+=(url.includes('?')?'&':'?')+q
		}else{
			opts.body=typeof data==='string'?data:JSON.stringify(data)
			if(!opts.headers['Content-Type'])opts.headers['Content-Type']='application/json'
		}
	}
	return fetch(url,opts).then(r=>{
		if(!r.ok)return r.text().then(t=>{throw t||r.statusText})
		const ct=r.headers.get('content-type')||''
		return ct.includes('json')?r.json():r.text()
	})
}

__.get=(url,data,readdatapath,headers)=>__.http(url,'GET',data,readdatapath||'form',headers)
__.post=(url,data,readdatapath,headers)=>__.http(url,'POST',data,readdatapath||'form',headers)
__.put=(url,data,readdatapath,headers)=>__.http(url,'PUT',data,readdatapath||'form',headers)
__.delete=(url,headers)=>__.http(url,'DELETE',undefined,undefined,headers)
__.patch=(url,data,readdatapath,headers)=>__.http(url,'PATCH',data,readdatapath||'form',headers)
__.head=(url,headers)=>__.http(url,'HEAD',undefined,undefined,headers)
__.options=(url,headers)=>__.http(url,'OPTIONS',undefined,undefined,headers)

// GET + render response HTML into element (HTMX-style)
__.getHTML=function(url,selector){
	if(!selector)selector=this
	return __.get(url).then(html=>{__.html(selector,html);return html})
}

// --- form scraping ---

__.scrapeInputElement=(input,name)=>{
	if(!input)return{}
	if(!name)name=input.getAttribute("populate")||input.name||input.className.split(" ").pop()
	let data={}
	switch(input.type){
		case 'checkbox':data[name]=input.checked;break
		case 'radio':if(input.checked)data[name]=input.value;break
		case 'select-multiple':
			data[name]=__.el("option",input).filter(o=>o.selected).map(o=>o.value);break
		default:data[name]=input.value
	}
	return data
}

__.scrape=function(selector,writeDataPath){
	let el=selector?__.el(selector):this
	writeDataPath=writeDataPath||"form"
	let data={}
	__.el("input,textarea,select",el).forEach(input=>{
		Object.assign(data,__.scrapeInputElement(input))
	})
	__.data[writeDataPath]=data
	return data
}

// --- populate (data → DOM) ---

__.populate=function(selector,readdatapath){
	let data=null
	let els=selector?__.el(selector):[this]
	readdatapath=readdatapath||"form"
	if(typeof readdatapath==='string'){
		data=__.objValue(__.data,readdatapath)
		if(!data){error(`populate: "${readdatapath}" not found in __.data`);return}
	}else data=readdatapath
	if(!data||typeof data!=='object'){error("populate: no data");return}
	if(Array.isArray(data)&&data.length===1)data=data[0]
	els.forEach(el=>{
		// fill inputs from data
		__.el("input,textarea,select",el).forEach(input=>{
			let name=input.getAttribute("populate-with")||input.name
			if(!name||input.hasAttribute("skip-populate"))return
			let val=__.objValue(data,name)
			if(val===undefined)return
			switch(input.type){
				case 'checkbox':
					input.checked=!!val
					input.checked?input.setAttribute('checked',''):input.removeAttribute('checked')
					break
				case 'radio':
					input.checked=input.value===val
					input.checked?input.setAttribute('checked',''):input.removeAttribute('checked')
					break
				case 'select-multiple':
					__.el("option",input).forEach(o=>{o.selected=val.includes(o.value)})
					break
				default:input.value=__._s(val)||''
			}
			input.dispatchEvent(new Event('change'))
		})
		// fill [populate] elements with data values
		__.el("[populate]",el).forEach(p=>{
			let name=p.getAttribute("populate")
			if(!name)return
			let val=__.objValue(data,name)
			if(val!==undefined)p.innerHTML=__._s(val)
		})
		// template replacement: {key} → value in [populate-html] elements
		__.el("[populate-html]",el).forEach(p=>{
			let h=p.innerHTML
			for(let k in data)h=h.replace(new RegExp(`\\{${k}\\}`,'g'),__._s(data[k]))
			p.innerHTML=h
		})
		__.PopEvent.call(el,{type:"populated"})
	})
}

// --- notifications / toasts ---

__.config.notificationTimeout=__.config.notificationTimeout||5000
__.config.notificationMaxVisible=__.config.notificationMaxVisible||6
__.config.notificationHandler=__.config.notificationHandler||null
__.config.notificationRenderer=__.config.notificationRenderer||null
__.data.notifications=Array.isArray(__.data.notifications)?__.data.notifications:[]
__.data.notificationListeners=Array.isArray(__.data.notificationListeners)?__.data.notificationListeners:[]

;(()=>{
	// Skip the inline-style injection when:
	//  - the styles have already been injected (id `ps-notify-style`), OR
	//  - the host page provides them via an external stylesheet whose
	//    <link> element carries id `ps-notify-styles`. The latter lets
	//    apps with strict CSP `style-src 'self'` (no `unsafe-inline`)
	//    serve `popstart-extras.css` directly instead of letting this
	//    IIFE create an inline <style> element that the CSP would
	//    block. See README.md for the recommended <link> snippet.
	const id='ps-notify-style'
	if(document.getElementById(id))return
	if(document.getElementById('ps-notify-styles'))return
	const s=document.createElement('style')
	s.id=id
	s.textContent=`
.ps-note-stack{
	position:fixed;
	right:1rem;
	bottom:1rem;
	z-index:9999;
	display:flex;
	flex-direction:column-reverse;
	align-items:flex-end;
	gap:.65rem;
	max-width:min(26rem,calc(100vw - 1.5rem));
	pointer-events:none
}
.ps-note{
	--ps-note-accent:#5aaadd;
	pointer-events:auto;
	width:min(24rem,calc(100vw - 1.5rem));
	opacity:.88;
	transform:translate3d(24px,16px,0) scale(.97);
	animation:ps-note-in .32s cubic-bezier(.2,.8,.2,1) forwards
}
.ps-note.closing{
	animation:ps-note-out .18s ease-in forwards
}
.ps-note-card{
	position:relative;
	padding:.8rem .9rem .85rem;
	border:1px solid transparent;
	border-radius:14px;
	background:
		linear-gradient(180deg,rgba(34,37,43,.94),rgba(20,22,27,.94)) padding-box,
		linear-gradient(135deg,var(--ps-note-accent),rgba(255,255,255,.15),rgba(255,255,255,.04)) border-box;
	box-shadow:0 18px 40px rgba(0,0,0,.28);
	backdrop-filter:blur(18px) saturate(1.1);
	-webkit-backdrop-filter:blur(18px) saturate(1.1);
	color:#f2eee8;
	animation:ps-note-float var(--ps-note-time,5000ms) linear forwards
}
.ps-note.success{--ps-note-accent:#43c488}
.ps-note.info{--ps-note-accent:#58a7e7}
.ps-note.warning{--ps-note-accent:#e0b24c}
.ps-note.error,.ps-note.danger{--ps-note-accent:#ef5d73}
.ps-note-head{
	display:flex;
	align-items:flex-start;
	gap:.75rem
}
.ps-note-copy{
	min-width:0;
	flex:1
}
.ps-note-title{
	display:block;
	font-size:.88rem;
	font-weight:700;
	line-height:1.3;
	color:#fff4ec
}
.ps-note-msg{
	display:block;
	font-size:.82rem;
	line-height:1.45;
	color:rgba(255,244,236,.92)
}
.ps-note-title+.ps-note-msg{
	margin-top:.22rem
}
.ps-note-close{
	appearance:none;
	border:none;
	background:none;
	color:rgba(255,244,236,.72);
	font-size:1.1rem;
	line-height:1;
	padding:.05rem;
	cursor:pointer;
	transition:color .15s,transform .15s
}
.ps-note-close:hover{
	color:#fff;
	transform:scale(1.08)
}
.ps-note-detail{
	margin-top:.55rem;
	border-top:1px solid rgba(255,255,255,.08);
	padding-top:.45rem
}
.ps-note-detail summary{
	cursor:pointer;
	font-size:.72rem;
	font-weight:600;
	letter-spacing:.02em;
	color:rgba(255,244,236,.62);
	list-style:none
}
.ps-note-detail summary::-webkit-details-marker{
	display:none
}
.ps-note-detail pre{
	margin-top:.45rem;
	padding:.6rem .7rem;
	border-radius:10px;
	background:rgba(0,0,0,.22);
	color:rgba(255,244,236,.8);
	font-size:.72rem;
	line-height:1.45;
	white-space:pre-wrap;
	word-break:break-word
}
@keyframes ps-note-in{
	from{opacity:0;transform:translate3d(24px,16px,0) scale(.97)}
	to{opacity:.88;transform:translate3d(0,0,0) scale(1)}
}
@keyframes ps-note-out{
	from{opacity:.88;transform:translate3d(0,0,0) scale(1)}
	to{opacity:0;transform:translate3d(18px,8px,0) scale(.96)}
}
@keyframes ps-note-float{
	from{transform:translateY(0)}
	to{transform:translateY(-8px)}
}
@media(max-width:600px){
	.ps-note-stack{
		right:.75rem;
		left:.75rem;
		bottom:.75rem;
		max-width:none
	}
	.ps-note{
		width:100%
	}
}`
	document.head.appendChild(s)
})()

__.notificationEnsureStack=()=>{
	let stack=document.getElementById('ps-note-stack')
	if(stack)return stack
	stack=document.createElement('div')
	stack.id='ps-note-stack'
	stack.className='ps-note-stack'
	stack.setAttribute('aria-live','polite')
	stack.setAttribute('aria-atomic','false')
	document.body.appendChild(stack)
	return stack
}

__.notificationUse=fn=>{
	if(typeof fn!=='function')return fn
	if(!__.data.notificationListeners.includes(fn))__.data.notificationListeners.push(fn)
	return fn
}
__.notificationUnuse=fn=>{
	__.data.notificationListeners=__.data.notificationListeners.filter(f=>f!==fn)
	return fn
}
__.notificationEmit=(type,note,extra={})=>{
	let payload=Object.assign({type,note},extra)
	__.data.notificationListeners.slice().forEach(fn=>{
		try{fn(payload)}catch(e){error('notification listener failed',e)}
	})
	try{document.dispatchEvent(new CustomEvent('popstart:notification',{detail:payload}))}catch(e){}
	return payload
}

__.notificationNormalize=(message,level,timeout,title,detail,visible,meta)=>{
	let note=message&&typeof message==='object'&&!Array.isArray(message)
		?Object.assign({},message)
		:{message,level,timeout,title,detail,visible,meta}
	let classes=(note.level||note.classes||'info').toString().split(/[, ]/).filter(Boolean)
	let known=classes.find(c=>/^(success|info|warning|error|danger)$/.test(c))||'info'
	let parsedTimeout=parseInt(note.timeout,10)
	note.id=note.id||('psn-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))
	note.level=known
	note.classes=classes
	note.title=note.title===undefined||note.title===null?'':String(note.title)
	note.message=note.message===undefined||note.message===null?'':String(note.message)
	note.detail=note.detail===undefined||note.detail===null?''
		:typeof note.detail==='string'?note.detail
		:JSON.stringify(note.detail,null,2)
	note.timeout=note.timeout===0||note.timeout==='0'
		?0
		:(Number.isNaN(parsedTimeout)||parsedTimeout<0?__.config.notificationTimeout:parsedTimeout)
	note.visible=!(note.visible===false||note.visible==='false'||note.visible===0||note.visible==='0')
	note.meta=note.meta===undefined?null:note.meta
	note.createdAt=note.createdAt||Date.now()
	note.open=true
	return note
}

__.notificationPrune=()=>{
	__.data.notifications=__.data.notifications.filter(n=>n&&n.open)
	let max=Math.max(1,parseInt(__.config.notificationMaxVisible,10)||6)
	let visible=__.data.notifications.filter(n=>n.visible&&n.open)
	if(visible.length>max){
		visible.slice(0,visible.length-max).forEach(n=>__.notificationClose(n.id))
	}
}

__.notificationRender=note=>{
	if(!note.visible)return
	__.notificationEmit('before-render',note)
	if(typeof __.config.notificationRenderer==='function'){
		let out=__.config.notificationRenderer(note)
		if(out===false)return
		if(out&&out.nodeType===1){
			let stack=__.notificationEnsureStack()
			stack.appendChild(out)
			note.el=out
			note.el.dataset.noteId=note.id
			if(note.timeout>0)note.timer=setTimeout(()=>__.notificationClose(note.id),note.timeout)
			__.notificationEmit('render',note,{element:note.el,custom:true})
			return
		}
	}
	let stack=__.notificationEnsureStack()
	let el=document.createElement('div')
	el.className='ps-note '+note.classes.join(' ')
	el.dataset.noteId=note.id
	el.style.setProperty('--ps-note-time',(note.timeout||__.config.notificationTimeout)+'ms')
	el.setAttribute('role',/^(error|danger|warning)$/.test(note.level)?'alert':'status')
	let card=document.createElement('div')
	card.className='ps-note-card'
	let head=document.createElement('div')
	head.className='ps-note-head'
	let copy=document.createElement('div')
	copy.className='ps-note-copy'
	if(note.title){
		let title=document.createElement('strong')
		title.className='ps-note-title'
		title.textContent=note.title
		copy.appendChild(title)
	}
	let msg=document.createElement('div')
	msg.className='ps-note-msg'
	msg.textContent=note.message||note.level
	copy.appendChild(msg)
	head.appendChild(copy)
	let close=document.createElement('button')
	close.className='ps-note-close'
	close.type='button'
	close.setAttribute('aria-label','Dismiss notification')
	close.innerHTML='&times;'
	close.addEventListener('click',()=>__.notificationClose(note.id))
	head.appendChild(close)
	card.appendChild(head)
	if(note.detail){
		let details=document.createElement('details')
		details.className='ps-note-detail'
		let summary=document.createElement('summary')
		summary.textContent='Details'
		let pre=document.createElement('pre')
		pre.textContent=note.detail
		details.appendChild(summary)
		details.appendChild(pre)
		card.appendChild(details)
	}
	el.appendChild(card)
	stack.appendChild(el)
	note.el=el
	if(note.timeout>0)note.timer=setTimeout(()=>__.notificationClose(note.id),note.timeout)
	__.notificationEmit('render',note,{element:el,custom:false})
}

__.notificationClose=id=>{
	if(!id){
		__.data.notifications.slice().forEach(n=>__.notificationClose(n.id))
		return
	}
	let note=__.data.notifications.find(n=>n.id===id)
	if(note){
		note.open=false
		if(note.timer)clearTimeout(note.timer)
	}
	__.notificationEmit('close',note||{id},{id})
	let el=document.querySelector(`.ps-note[data-note-id="${id}"]`)
	if(!el){__.notificationPrune();return}
	el.classList.add('closing')
	setTimeout(()=>{
		el.remove()
		__.notificationPrune()
	},180)
}

__.notify=(message,level,timeout,title,detail,visible,meta)=>{
	let note=__.notificationNormalize(message,level,timeout,title,detail,visible,meta)
	__.data.notifications.push(note)
	__.notificationEmit('create',note)
	if(typeof __.config.notificationHandler==='function'){
		try{__.config.notificationHandler(note)}catch(e){error('notificationHandler failed',e)}
	}
	__.notificationRender(note)
	__.notificationPrune()
	return note
}
__.notifySilent=(message,level,timeout,title,detail,meta)=>
	message&&typeof message==='object'&&!Array.isArray(message)
		?__.notify(Object.assign({},message,{visible:false}))
		:__.notify({message,level,timeout,title,detail,meta,visible:false})

__.alert=(msg,classes,timeout)=>__.notify({message:msg,level:classes,timeout})
__.alertError=(msg,timeout)=>__.notify({title:'Error',message:msg,level:'error',timeout})
__.alertSuccess=(msg,timeout)=>__.notify({title:'Success',message:msg,level:'success',timeout})
__.alertWarning=(msg,timeout)=>__.notify({title:'Warning',message:msg,level:'warning',timeout})
__.alertInfo=(msg,timeout)=>__.notify({title:'Info',message:msg,level:'info',timeout})
__.alertClose=id=>__.notificationClose(id)

// upgrade __.error: try .error-msg element first (core behavior), then visual alert
__.error=(msg,timeout)=>{
	const em=__.parseErrorResponse(msg)
	const el=__.el(".error-msg")
	if(el.length>0){__.text(el,em);__.show(el);setTimeout(()=>__.hide(el),timeout||10000);return}
	__.notify({
		title:'Request failed',
		message:em,
		detail:msg&&msg!==em?msg:'',
		level:'error',
		timeout
	})
}

// --- cookies ---

__.writeCookie=(name,value,days)=>{
	let expires=''
	if(days){let d=new Date();d.setTime(d.getTime()+(days*86400000));expires=`;expires=${d.toUTCString()}`}
	document.cookie=`${name}=${value||''}${expires};path=/`
}
__.getCookie=(name)=>{
	let v=undefined
	document.cookie.split(';').forEach(c=>{let i=c.indexOf('=');if(i>-1&&c.substring(0,i).trim()===name)v=c.substring(i+1)})
	return v
}
__.removeCookie=(name)=>__.writeCookie(name,'',-1)
__.succeedIfCookie=(name,value)=>new Promise((resolve,reject)=>{
	let t=__.getCookie(name);t===value?resolve(t):reject(t)})
__.failIfCookie=(name,value)=>new Promise((resolve,reject)=>{
	let t=__.getCookie(name);t===value?reject(t):resolve(t)})

// --- URL args ---

__.argsParse=(writedatapath)=>{
	writedatapath=writedatapath||'args'
	for(const[key,value]of new URLSearchParams(location.search).entries())
		__.datawrite(writedatapath,key,value)
}

__.requireArg=(name,writedatapath)=>{
	writedatapath=writedatapath||'arg'
	return new Promise((resolve,reject)=>{
		const value=new URL(window.location.href).searchParams.get(name)
		if(!value){reject(`Missing query arg: ${name}`);return}
		__.datawrite(writedatapath,name,value)
		resolve(value)
	})
}

// --- DOM extras ---

__.focus=(selector)=>{ let els=__.el(selector);if(els.length)els[0].focus() }
__.scrollTo=(selector)=>{ let els=__.el(selector);if(els.length)els[0].scrollIntoView({behavior:'smooth'}) }

__.resetForm=function(selector){
	if(!selector)selector=this
	__.el(selector).forEach(el=>{if(el.reset)el.reset();else __.el('form',el).forEach(f=>f.reset())})
}

// form state
__.enable=function(selector){if(!selector)selector=this;__.el(selector).forEach(el=>{el.disabled=false;el.classList.remove('disabled')})}
__.disable=function(selector){if(!selector)selector=this;__.el(selector).forEach(el=>{el.disabled=true;el.classList.add('disabled')})}

// loading state — adds .loading class, disables, swaps text, reverses with __.done
__.loading=function(selector,loadingtext){if(!selector)selector=this
	__.el(selector).forEach(el=>{
		el._psOrigText=el.textContent
		el._psOrigDisabled=el.disabled
		if(loadingtext)el.textContent=loadingtext
		el.disabled=true
		el.classList.add('loading')
	})}
__.done=function(selector,donetext){if(!selector)selector=this
	__.el(selector).forEach(el=>{
		el.textContent=donetext||el._psOrigText||el.textContent
		el.disabled=el._psOrigDisabled||false
		el.classList.remove('loading')
	})}

// one-line tab/radio/nav switching — show target, hide rest, swap active class on clicked
// ps-click="__.switchTo" switchTo-show="#panel" switchTo-hide=".panels" switchTo-siblings=".tabs .btn"
__.switchTo=function(show,hide,siblings,cls){
	if(!cls)cls='active'
	if(hide)__.hide(hide)
	if(show)__.show(show)
	if(siblings)__.removeClass(siblings,cls)
	__.addClass(this,cls)
}

// Deep-clone a DOM subtree into a target container
// startup="__.dupetree" dupetree-source="#nav-links" dupetree-target="#mobile-nav" dupetree-cls="mobile-clone"
// Clones source's children into target. Optional cls adds a class to the clone wrapper.
// Useful for responsive navs: one set of links, cloned into a mobile layout.
__.dupetree=function(source,target,cls){
	var src=__.el(source)[0]
	var tgt=__.el(target)[0]
	if(!src||!tgt)return
	var clone=src.cloneNode(true)
	// Strip IDs from cloned nodes to avoid duplicates
	clone.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id')})
	clone.removeAttribute('id')
	if(cls)clone.classList.add(cls)
	tgt.appendChild(clone)
	// Rebind Popstart events on cloned content
	if(__.Popstart)__.Popstart()
}

// one-line accordion/tree toggle — toggle target visibility + toggle class on trigger
// ps-click="__.togglePanel" togglePanel-selector="#panel"
__.togglePanel=function(selector,cls){
	if(!cls)cls='open'
	if(selector)__.toggle(selector)
	__.toggleClass(this,cls)
}
__.toggleNext=function(selector){
	let el=selector?__.el(selector)[0]:this
	if(!el||!el.nextElementSibling)return
	__.toggle(el.nextElementSibling)
}
__.hideClosest=function(match){
	if(!match||!this||!this.closest)return
	let el=this.closest(match)
	if(el)__.hide(el)
}
__.showClosest=function(match){
	if(!match||!this||!this.closest)return
	let el=this.closest(match)
	if(el)__.show(el)
}

// conditional show/hide — resolves always (doesn't break chain), just toggles visibility
// ps-click="__.showIf" showIf-selector=".panel" showIf-readdatapath="user.isAdmin" showIf-value="true"
__.showIf=function(selector,readdatapath,value){if(!selector)selector=this
	let data=__.objValue(__.data,readdatapath)
	let match=value===undefined?!!data:(String(data)===String(value))
	match?__.show(selector):__.hide(selector)}
__.hideIf=function(selector,readdatapath,value){if(!selector)selector=this
	let data=__.objValue(__.data,readdatapath)
	let match=value===undefined?!!data:(String(data)===String(value))
	match?__.hide(selector):__.show(selector)}
__.toggleIf=function(selector,readdatapath,value){if(!selector)selector=this
	let data=__.objValue(__.data,readdatapath)
	let match=value===undefined?!!data:(String(data)===String(value))
	match?__.show(selector):__.hide(selector)}

// conditional chain gates — resolve or reject based on __.data value
__.succeedIf=(readdatapath,value)=>{
	let data=__.objValue(__.data,readdatapath)
	let match=value===undefined?!!data:(String(data)===String(value))
	return match?Promise.resolve(data):Promise.reject('succeedIf: '+readdatapath+' did not match')}
__.failIf=(readdatapath,value)=>{
	let data=__.objValue(__.data,readdatapath)
	let match=value===undefined?!!data:(String(data)===String(value))
	return match?Promise.reject('failIf: '+readdatapath+' matched'):Promise.resolve(data)}

// basic navigation (no router plugin needed)
__.historyPush=(url)=>{history.pushState(null,'',url)}
__.historyReplace=(url)=>{history.replaceState(null,'',url)}
__.back=()=>history.back()

// utilities
__.uuid=()=>crypto.randomUUID?crypto.randomUUID():('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,c=>{let r=Math.random()*16|0;return(c==='x'?r:r&0x3|0x8).toString(16)})
__.template=(str,data)=>{if(!data)data=__.data;for(let k in data)str=str.replace(new RegExp('\\{'+k+'\\}','g'),data[k]===undefined?'':data[k]);return str}

// --- populateEach (array → repeated HTML) ---
// renders cards, lists, tables, select options from arrays
// uses <template> inside target, or builds <option>s for <select>
//
// <ul id="users"><template><li>{name} — {email}</li></template></ul>
// <div startup="__.get, __.populateEach" get-url="/api/users"
//   get-writedatapath="users" populateEach-selector="#users"
//   populateEach-readdatapath="users"></div>
//
// <select id="roles"><option value="">Pick…</option></select>
// <div startup="__.get, __.populateEach" get-url="/api/roles"
//   get-writedatapath="roles" populateEach-selector="#roles"
//   populateEach-readdatapath="roles"
//   populateEach-valuefield="id" populateEach-labelfield="name"></div>

__.populateEach=function(selector,readdatapath,valuefield,labelfield,append){
	if(!selector)selector=this
	let data=readdatapath
	if(typeof readdatapath==='string')data=__.objValue(__.data,readdatapath)
	if(!data)data=__.data[readdatapath]
	if(!Array.isArray(data)){warn("populateEach: expected array, got",typeof data);return data}
	let els=__.el(selector)
	els.forEach(target=>{
		// select element: build <option>s
		if(target.tagName==='SELECT'){
			// preserve first option if it's a placeholder (no value or empty value)
			let first=target.querySelector('option')
			let placeholder=(first&&!first.value)?first.outerHTML:''
			let vf=valuefield||'value'
			let lf=labelfield||'label'
			target.innerHTML=placeholder+data.map(item=>{
				if(typeof item==='string'||typeof item==='number')
					return `<option value="${__._s(item)}">${__._s(item)}</option>`
				let v=__.objValue(item,vf)||''
				let l=__.objValue(item,lf)||v
				return `<option value="${__._s(v)}">${__._s(l)}</option>`
			}).join('')
			return
		}
		// card/list/table: use <template> child
		let tpl=target.querySelector('template')
		if(!tpl){warn("populateEach: no <template> in",target);return}
		let tplHTML=tpl.innerHTML
		if(!append)target.innerHTML=''
		target.appendChild(tpl) // re-attach template for future re-renders
		let frag=document.createDocumentFragment()
		data.forEach(item=>{
			let html=tplHTML
			if(typeof item==='string'||typeof item==='number'){
				html=html.replace(/\{value\}/g,__._s(item))
					.replace(/\{\.\}/g,__._s(item))
			}else{
				for(let k in item)html=html.replace(new RegExp(`\\{${k}\\}`,'g'),__._s(item[k]))
			}
			let wrap=document.createElement('div')
			wrap.innerHTML=html
			while(wrap.firstChild)frag.appendChild(wrap.firstChild)
		})
		target.appendChild(frag)
		__.PopEvent.call(target,{type:"populated"})
	})
	return data
}

// --- upload (file input → FormData POST) ---

__.upload=function(url,selector,name){
	if(!selector)selector=this
	let input=__.el(selector).find(el=>el.type==='file')
		||__.el('input[type=file]',__.el(selector)[0])[0]
	if(!input||!input.files.length)return Promise.reject('No file selected')
	let fd=new FormData()
	Array.from(input.files).forEach(f=>fd.append(name||input.name||'file',f))
	return fetch(url,{
		method:'POST',
		headers:Object.assign({},__.config.httpHeaders),
		body:fd
	}).then(r=>{
		if(!r.ok)return r.text().then(t=>{throw t||r.statusText})
		const ct=r.headers.get('content-type')||''
		return ct.includes('json')?r.json():r.text()
	})
}

// --- validate (HTML5 constraint validation) ---
// rejects if invalid — stops chain. resolves if valid — chain continues.
// click="__.validate, __.scrape, __.post"

__.validate=function(selector){
	if(!selector)selector=this
	let els=__.el(selector)
	let form=els.find(el=>el.checkValidity)||els[0]
	if(!form)return Promise.reject('No form found')
	// find the actual form (might be a wrapper div)
	if(!form.checkValidity){
		let inner=form.querySelector('form')
		if(inner)form=inner
		else return Promise.reject('No form found')
	}
	if(form.checkValidity())return Promise.resolve(true)
	form.reportValidity()
	return Promise.reject('Validation failed')
}

// --- SSE (Server-Sent Events) ---
// opens an EventSource, writes each message to __.data[writedatapath]
// optionally auto-calls __.populateEach on a target selector
//
// <div startup="__.sseOpen" sseOpen-url="/api/stream"
//   sseOpen-writedatapath="feed" sseOpen-selector="#feed"></div>

__.sseOpen=(url,writedatapath,selector)=>{
	writedatapath=writedatapath||'sse'
	let es=new EventSource(url)
	__.data._sse=__.data._sse||{}
	__.data._sse[url]=es
	es.onmessage=(e)=>{
		let d
		try{d=JSON.parse(e.data)}catch(_){d=e.data}
		// accumulate as array
		if(!__.data[writedatapath])__.data[writedatapath]=[]
		if(Array.isArray(__.data[writedatapath]))__.data[writedatapath].push(d)
		else __.data[writedatapath]=d
		if(selector)__.populateEach(selector,writedatapath,undefined,undefined,false)
	}
	es.onerror=()=>{warn("SSE error:",url)}
	return es
}

__.sseClose=(url)=>{
	if(__.data._sse&&__.data._sse[url]){__.data._sse[url].close();delete __.data._sse[url]}
}

// --- WebSocket ---
// opens a WebSocket, writes each message to __.data[writedatapath]
// optionally auto-renders via populateEach
//
// <div startup="__.wsOpen" wsOpen-url="wss://example.com/ws"
//   wsOpen-writedatapath="messages" wsOpen-selector="#chat"></div>

__.wsOpen=(url,writedatapath,selector)=>{
	writedatapath=writedatapath||'ws'
	let ws=new WebSocket(url)
	__.data._ws=__.data._ws||{}
	__.data._ws[url]=ws
	ws.onmessage=(e)=>{
		let d
		try{d=JSON.parse(e.data)}catch(_){d=e.data}
		if(!__.data[writedatapath])__.data[writedatapath]=[]
		if(Array.isArray(__.data[writedatapath]))__.data[writedatapath].push(d)
		else __.data[writedatapath]=d
		if(selector)__.populateEach(selector,writedatapath,undefined,undefined,false)
	}
	ws.onerror=()=>{warn("WebSocket error:",url)}
	return ws
}

__.wsClose=(url)=>{
	if(__.data._ws&&__.data._ws[url]){__.data._ws[url].close();delete __.data._ws[url]}
}

__.wsSend=(url,data)=>{
	let ws=__.data._ws&&__.data._ws[url]
	if(!ws||ws.readyState!==1){warn("WebSocket not open:",url);return}
	ws.send(typeof data==='string'?data:JSON.stringify(data))
}

// --- storage (localStorage/sessionStorage with auto-JSON) ---

__.store=(key,value)=>{
	if(value===undefined)try{return JSON.parse(localStorage.getItem(key))}catch(_){return localStorage.getItem(key)}
	if(value===null){localStorage.removeItem(key);return}
	localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))
}
__.session=(key,value)=>{
	if(value===undefined)try{return JSON.parse(sessionStorage.getItem(key))}catch(_){return sessionStorage.getItem(key)}
	if(value===null){sessionStorage.removeItem(key);return}
	sessionStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))
}

// --- clipboard ---

__.copy=(text)=>navigator.clipboard?navigator.clipboard.writeText(text):
	new Promise(resolve=>{let t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();resolve()})

// --- timedclass ---

// add class, wait, remove it (useful for shake/flash animations)
// clears previous timer per-element, forces reflow so CSS animations always restart
__.timedclass=function(selector,removeclassname,addclassname,time){
	if(!selector)selector=this
	__.el(selector).forEach(el=>{
		if(el._psTcTimer)clearTimeout(el._psTcTimer)
		if(addclassname)addclassname.split(/\s+/).filter(Boolean).forEach(c=>el.classList.remove(c))
		void el.offsetWidth
		if(removeclassname)removeclassname.split(/\s+/).filter(Boolean).forEach(c=>el.classList.remove(c))
		if(addclassname)addclassname.split(/\s+/).filter(Boolean).forEach(c=>el.classList.add(c))
		el._psTcTimer=setTimeout(()=>{
			if(addclassname)addclassname.split(/\s+/).filter(Boolean).forEach(c=>el.classList.remove(c))
			if(removeclassname)removeclassname.split(/\s+/).filter(Boolean).forEach(c=>el.classList.add(c))
			el._psTcTimer=null
		},time||2000)
	})
}
