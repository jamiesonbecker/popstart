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

// --- alerts ---

;(()=>{
	const s=document.createElement('style')
	s.textContent='.ps-alert{position:fixed;top:0;left:0;right:0;padding:.75rem 1.25rem;'
		+'display:flex;align-items:center;justify-content:space-between;z-index:9999;'
		+'height:3rem;box-shadow:0 0 1rem #0009;font-size:1.25rem;color:#fff;'
		+'text-shadow:-1px -1px 1px #0002;animation:ps-fadein .3s}'
		+'.ps-alert .ps-close{cursor:pointer;background:none;border:none;'
		+'color:#fff;font-size:1.5rem;padding:0 .5rem}'
		+'.ps-alert.success{background:#094}'
		+'.ps-alert.info{background:#33d}'
		+'.ps-alert.warning{background:#c90;color:#333}'
		+'.ps-alert.error,.ps-alert.danger{background:#d33}'
		+'@keyframes ps-fadein{from{opacity:0;transform:translateY(-100%)}'
		+'to{opacity:1;transform:translateY(0)}}'
	document.head.appendChild(s)
})()

__.alert=(msg,classes,timeout)=>{
	timeout=timeout||15000
	__.del(".ps-alert")
	const m=document.createElement("div")
	m.textContent=msg
	m.classList.add("ps-alert")
	if(classes)classes.split(/[, ]/).filter(Boolean).forEach(c=>m.classList.add(c))
	const btn=document.createElement("button")
	btn.classList.add("ps-close")
	btn.innerHTML='&times;'
	btn.addEventListener("mouseup",()=>m.remove())
	m.appendChild(btn)
	document.body.appendChild(m)
	setTimeout(()=>m.remove(),timeout)
}
__.alertError=(msg,timeout)=>{__.alert(msg,"error",timeout);danger(msg)}
__.alertSuccess=(msg,timeout)=>{__.alert(msg,"success",timeout);success(msg)}
__.alertWarning=(msg,timeout)=>{__.alert(msg,"warning",timeout);warn(msg)}
__.alertInfo=(msg,timeout)=>{__.alert(msg,"info",timeout);info(msg)}
__.alertClose=()=>__.del(".ps-alert")

// upgrade __.error: try .error-msg element first (core behavior), then visual alert
__.error=(msg,timeout)=>{
	const em=__.parseErrorResponse(msg)
	const el=__.el(".error-msg")
	if(el.length>0){__.text(el,em);__.show(el);setTimeout(()=>__.hide(el),timeout||10000);return}
	__.alert(em,"error",timeout)
	danger(em)
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
