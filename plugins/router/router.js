// popstart router plugin — hash and history API routing for SPAs
// depends on: popstart-core.js + popstart-extras.js
//
// <div use="router"></div>
// <a click="__.navigate" navigate-url="/dashboard">Dashboard</a>
// <div route="/dashboard" startup="loadDashboard"></div>
// <div route="/users/:id" startup="loadUser"></div>
// <div route="*" startup="load404"></div>

'use strict'

;(()=>{

// --- config ---

__.config.routeMode=__.config.routeMode||'hash' // 'hash' or 'history'
__.config.routeAttr=__.config.routeAttr||'route'
__.config.routeActiveClass=__.config.routeActiveClass||'route-active'

// --- route matching ---

// match "/users/:id" against "/users/42" → {id:"42"}
// match "/posts/:id/comments/:cid" → {id:"1",cid:"5"}
// match "*" → wildcard catch-all
__.matchPath=(pattern,path)=>{
	if(pattern==='*')return{}
	let pParts=pattern.split('/').filter(Boolean)
	let uParts=path.split('/').filter(Boolean)
	if(pParts.length!==uParts.length)return null
	let params={}
	for(let i=0;i<pParts.length;i++){
		if(pParts[i][0]===':')params[pParts[i].slice(1)]=decodeURIComponent(uParts[i])
		else if(pParts[i]!==uParts[i])return null
	}
	return params
}

// --- get current path ---

__.routePath=()=>{
	if(__.config.routeMode==='history')return location.pathname
	let h=location.hash
	return h?h.replace(/^#!?/,'').split('?')[0]:'/'
}

// --- route resolution ---

__.resolveRoute=(path)=>{
	if(!path)path=__.routePath()
	let matched=false
	let wildcard=null
	__.el('['+__.config.routeAttr+']').forEach(el=>{
		let pattern=el.getAttribute(__.config.routeAttr)
		if(pattern==='*'){wildcard=el;return}
		let params=__.matchPath(pattern,path)
		if(params){
			matched=true
			// store route params in __.data.route
			__.data.route={path:path,pattern:pattern,params:params}
			// show this route, hide others
			__.el('['+__.config.routeAttr+']').forEach(r=>{
				if(r===el){__.show(r);__.addClass(r,__.config.routeActiveClass)}
				else{__.hide(r);__.removeClass(r,__.config.routeActiveClass)}
			})
			// fire the route element's startup chain
			__.PopEvent.call(el,{type:'routed'})
		}
	})
	// wildcard catch-all
	if(!matched&&wildcard){
		__.data.route={path:path,pattern:'*',params:{}}
		__.el('['+__.config.routeAttr+']').forEach(r=>{
			if(r===wildcard){__.show(r);__.addClass(r,__.config.routeActiveClass)}
			else{__.hide(r);__.removeClass(r,__.config.routeActiveClass)}
		})
		__.PopEvent.call(wildcard,{type:'routed'})
	}
}

// --- navigation ---

__.navigate=(url)=>{
	if(__.config.routeMode==='history'){
		history.pushState(null,'',url)
	}else{
		location.hash=url.startsWith('#')?url:'#'+url
		return // hashchange listener will call resolveRoute
	}
	__.resolveRoute()
}

__.historyReplace=(url)=>{
	if(__.config.routeMode==='history'){
		history.replaceState(null,'',url)
	}else{
		location.replace(url.startsWith('#')?url:'#'+url)
		return
	}
	__.resolveRoute()
}

__.back=()=>history.back()

// --- listen for navigation ---

window.addEventListener('popstate',()=>__.resolveRoute())
window.addEventListener('hashchange',()=>__.resolveRoute())

// update nav links: add active class to links matching current route
__.updateNavLinks=()=>{
	let path=__.routePath()
	__.el('[nav]').forEach(a=>{
		let href=a.getAttribute('nav')||a.getAttribute('href')||''
		href=href.replace(/^#!?/,'')
		if(href===path)__.addClass(a,__.config.routeActiveClass)
		else __.removeClass(a,__.config.routeActiveClass)
	})
}

// --- init: resolve current route on load ---

// hide all route elements initially, then resolve
__.el('['+__.config.routeAttr+']').forEach(el=>__.hide(el))
__.resolveRoute()
__.updateNavLinks()

})()
