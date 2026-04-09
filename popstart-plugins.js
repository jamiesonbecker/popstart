// popstart-plugins.js — lazy plugin loader for popstart
// loads JS, CSS, and HTML templates from a configurable root path
// supports recursive deps — circular references drop out safely
// supports late injection — MutationObserver watches both new nodes and attribute changes
//
// <script src="popstart-core.js"></script>
// <script src="popstart-extras.js"></script>
// <script src="popstart-plugins.js"></script>
//
// <div ps-use="router"></div>
// <input ps-use="autocomplete" autocomplete-url="/api/search">

'use strict'

__.config.pluginRoot=__.config.pluginRoot||'/popstart/plugins'
__.plugins=__.plugins||{}

// all use-attr variants we scan for
let useAttrs=__.config.AttrPrefixes.map(p=>p+'use')

// find use attribute value on an element (checks all prefixes)
let getUse=(el)=>{
	for(const attr of useAttrs){
		let v=el.getAttribute(attr)
		if(v)return{attr:attr,name:v}
	}
	return null
}

// find all elements with any use attribute
let findUseEls=()=>{
	let selector=useAttrs.map(a=>'['+a+']').join(',')
	return __.el(selector)
}

__.loadPlugin=(name)=>{
	// already loading or loaded — return same promise (dedup + circular guard)
	if(__.plugins[name])return __.plugins[name]
	let root=__.config.pluginRoot.replace(/\/$/,'')+'/'+name+'/'+name
	// set promise BEFORE any async work — this is the circular reference guard
	// if plugin A loads B and B loads A, A's promise already exists → drops out
	__.plugins[name]=Promise.all([
		// JS (required)
		new Promise((resolve,reject)=>{
			let s=document.createElement('script')
			s.src=root+'.js'
			s.onload=resolve
			s.onerror=()=>reject('Plugin not found: '+name)
			document.head.appendChild(s)
		}),
		// CSS (optional, silent fail)
		new Promise(resolve=>{
			let l=document.createElement('link')
			l.rel='stylesheet'
			l.href=root+'.css'
			l.onload=resolve
			l.onerror=resolve
			document.head.appendChild(l)
		}),
		// HTML template (optional, inject hidden)
			fetch(root+'.html').then(r=>{
				if(!r.ok)return
				return r.text().then(html=>{
					let wrap=document.createElement('div')
					wrap.className='ps-plugin ps-plugin-'+name+' hidden'
					wrap.style.display='none'
					wrap.innerHTML=__.sanitizeHTML?__.sanitizeHTML(html):html
					document.body.appendChild(wrap)
					// template may contain ps-use for other plugins — scan triggers via MutationObserver
				})
			}).catch(()=>{})
	]).then(()=>{
		info('plugin loaded:',name)
		__.Popstart()
		// fire use-loaded on all elements that requested this plugin
		findUseEls().forEach(el=>{
			let u=getUse(el)
			if(!u||u.name!==name)return
			el.removeAttribute(u.attr)
			el.setAttribute('ps-use-loaded',name)
			__.PopEvent.call(el,{type:'use-loaded'})
		})
		return name
	})
	return __.plugins[name]
}

// scan DOM for use attributes, load any new plugins
__.loadPlugins=()=>{
	let names=new Set()
	findUseEls().forEach(el=>{
		let u=getUse(el)
		if(u&&!__.plugins[u.name])names.add(u.name)
	})
	names.forEach(name=>__.loadPlugin(name))
}

// auto-scan on startup
if(document.readyState==='loading')
	document.addEventListener('DOMContentLoaded',__.loadPlugins)
else __.loadPlugins()

// watch for new elements with use attrs AND attribute changes on existing elements
;(()=>{
	let check=(node)=>{
		if(node.nodeType!==1)return false
		if(getUse(node))return true
		let sel=useAttrs.map(a=>'['+a+']').join(',')
		return node.querySelector&&!!node.querySelector(sel)
	}
	let obs=new MutationObserver(mutations=>{
		let found=false
		for(const m of mutations){
			// new nodes added to DOM
			if(m.type==='childList'){
				for(const n of m.addedNodes)if(check(n)){found=true;break}
			}
			// attribute changed on existing node (e.g. el.setAttribute('ps-use','calendar'))
			if(m.type==='attributes'&&useAttrs.includes(m.attributeName)){
				if(m.target.getAttribute(m.attributeName))found=true
			}
			if(found)break
		}
		if(found)__.loadPlugins()
	})
	let start=()=>obs.observe(document.body,{
		childList:true,
		subtree:true,
		attributes:true,
		attributeFilter:useAttrs
	})
	if(document.body)start()
	else document.addEventListener('DOMContentLoaded',start)
})()
