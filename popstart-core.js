/*

Popstart.js (https://popstart.org)

Copyright (c) 2025 Popchat Inc. MIT License

Popstart is a lightweight,modern JavaScript library for building interactive
web applications. It's designed to be simple to use, easy to understand, and
quick to implement.

*/

'use strict'

// promise-polyfill.min.js MIT v8.3.0
// https://github.com/taylorhakes/promise-polyfill
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t():"function"==typeof define&&define.amd?define(t):t()}(0,function(){"use strict";function e(e){var t=this.constructor;return this.then(function(n){return t.resolve(e()).then(function(){return n})},function(n){return t.resolve(e()).then(function(){return t.reject(n)})})}function t(e){return new this(function(t,n){function r(e,n){if(n&&("object"==typeof n||"function"==typeof n)){var f=n.then;if("function"==typeof f)return void f.call(n,function(t){r(e,t)},function(n){o[e]={status:"rejected",reason:n},0==--i&&t(o)})}o[e]={status:"fulfilled",value:n},0==--i&&t(o)}if(!e||"undefined"==typeof e.length)return n(new TypeError(typeof e+" "+e+" is not iterable(cannot read property Symbol(Symbol.iterator))"));var o=Array.prototype.slice.call(e);if(0===o.length)return t([]);for(var i=o.length,f=0;o.length>f;f++)r(f,o[f])})}function n(e,t){this.name="AggregateError",this.errors=e,this.message=t||""}function r(e){var t=this;return new t(function(r,o){if(!e||"undefined"==typeof e.length)return o(new TypeError("Promise.any accepts an array"));var i=Array.prototype.slice.call(e);if(0===i.length)return o();for(var f=[],u=0;i.length>u;u++)try{t.resolve(i[u]).then(r)["catch"](function(e){f.push(e),f.length===i.length&&o(new n(f,"All promises were rejected"))})}catch(c){o(c)}})}function o(e){return!(!e||"undefined"==typeof e.length)}function i(){}function f(e){if(!(this instanceof f))throw new TypeError("Promises must be constructed via new");if("function"!=typeof e)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=undefined,this._deferreds=[],s(e,this)}function u(e,t){for(;3===e._state;)e=e._value;0!==e._state?(e._handled=!0,f._immediateFn(function(){var n=1===e._state?t.onFulfilled:t.onRejected;if(null!==n){var r;try{r=n(e._value)}catch(o){return void a(t.promise,o)}c(t.promise,r)}else(1===e._state?c:a)(t.promise,e._value)})):e._deferreds.push(t)}function c(e,t){try{if(t===e)throw new TypeError("A promise cannot be resolved with itself.");if(t&&("object"==typeof t||"function"==typeof t)){var n=t.then;if(t instanceof f)return e._state=3,e._value=t,void l(e);if("function"==typeof n)return void s(function(e,t){return function(){e.apply(t,arguments)}}(n,t),e)}e._state=1,e._value=t,l(e)}catch(r){a(e,r)}}function a(e,t){e._state=2,e._value=t,l(e)}function l(e){2===e._state&&0===e._deferreds.length&&f._immediateFn(function(){e._handled||f._unhandledRejectionFn(e._value)});for(var t=0,n=e._deferreds.length;n>t;t++)u(e,e._deferreds[t]);e._deferreds=null}function s(e,t){var n=!1;try{e(function(e){n||(n=!0,c(t,e))},function(e){n||(n=!0,a(t,e))})}catch(r){if(n)return;n=!0,a(t,r)}}n.prototype=Error.prototype;var d=setTimeout;f.prototype["catch"]=function(e){return this.then(null,e)},f.prototype.then=function(e,t){var n=new this.constructor(i);return u(this,new function(e,t,n){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.promise=n}(e,t,n)),n},f.prototype["finally"]=e,f.all=function(e){return new f(function(t,n){function r(e,o){try{if(o&&("object"==typeof o||"function"==typeof o)){var u=o.then;if("function"==typeof u)return void u.call(o,function(t){r(e,t)},n)}i[e]=o,0==--f&&t(i)}catch(c){n(c)}}if(!o(e))return n(new TypeError("Promise.all accepts an array"));var i=Array.prototype.slice.call(e);if(0===i.length)return t([]);for(var f=i.length,u=0;i.length>u;u++)r(u,i[u])})},f.any=r,f.allSettled=t,f.resolve=function(e){return e&&"object"==typeof e&&e.constructor===f?e:new f(function(t){t(e)})},f.reject=function(e){return new f(function(t,n){n(e)})},f.race=function(e){return new f(function(t,n){if(!o(e))return n(new TypeError("Promise.race accepts an array"));for(var r=0,i=e.length;i>r;r++)f.resolve(e[r]).then(t,n)})},f._immediateFn="function"==typeof setImmediate&&function(e){setImmediate(e)}||function(e){d(e,0)},f._unhandledRejectionFn=function(e){void 0!==console&&console&&console.warn("Possible Unhandled Promise Rejection:",e)};var p=function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw Error("unable to locate global object")}();"function"!=typeof p.Promise?p.Promise=f:(p.Promise.prototype["finally"]||(p.Promise.prototype["finally"]=e),p.Promise.allSettled||(p.Promise.allSettled=t),p.Promise.any||(p.Promise.any=r))});

window.logLevel=window.logLevel||'debug'
window.MutationObserver=window.MutationObserver||window.WebKitMutationObserver
window.__=window.__||{}
__.data=__.data||{}
__.state=__.state||{}
__.config=__.config||{} // respect any existing defined __.config

__.configDefaults={
	AlwaysPreventDefault:false,
	AlwaysPreventClickPropagation:true,
	AttrPrefixes:['ps-','','data-','x-'],
	// focus blur mouseover mouseout
	BoundEventNames:'mouseup change input keyup submit click'.split(' '),
	DebounceTimes:{'click':50,'mouseup':50,'input':300,'change':300,'keyup':300,"DOMWatcher.psObsvr":500,'flash':2000},
	DontAutostart:false,
	DarkModeName:'dark',LightModeName:'light',
	// by default, stop	propagation on these events:
	StopPropagationEventNames:['submit','mouseup','change','click'],
	errorNameArgs:['error','err','errorResponse','errorResponseText'],
	eventNameArgs:['ev','evt','event'],
	elementNameArgs:['el','ele','element'],
	// only override these if you know what you're doing:
	DetectDOMAttrChanges:undefined,
	DetectDOMSubtreeChanges:true,
	DetectDOMChildListChanges:true,
	DetectDOMAttrChangesFilter:undefined,
	// set to false to disable automatic HTML sanitization (e.g. if you sanitize server-side)
	sanitize:true,
	// set to false only when you explicitly trust HTML passed into raw DOM sink helpers
	sanitizeHTMLSinks:true,
}

for(let k in __.configDefaults){
	if(__.config[k]===undefined)__.config[k]=__.configDefaults[k]
}

// HTML escaping — call __.safify(str) on user data before interpolating into HTML
// extras upgrades this to DOMPurify if available
// __.config.sanitize controls whether populate/populateEach auto-sanitize data values
// set to false if you sanitize server-side before storage
__.safify=(str)=>{
	if(typeof str!=='string')return str
	const d=document.createElement("div")
	d.appendChild(document.createTextNode(str))
	return d.innerHTML
}
__.sanitizeHTML=(html)=>{
	if(typeof html!=='string')return html
	if(typeof DOMPurify!=='undefined'&&typeof DOMPurify.sanitize==='function')
		return DOMPurify.sanitize(html)
	const tpl=document.createElement('template')
	tpl.innerHTML=html
	tpl.content.querySelectorAll('script,iframe,object,embed,meta').forEach(el=>el.remove())
	tpl.content.querySelectorAll('*').forEach(el=>{
		Array.from(el.attributes).forEach(attr=>{
			const name=attr.name.toLowerCase()
			const value=(attr.value||'').trim()
			if(name.startsWith('on')||name==='srcdoc'){
				el.removeAttribute(attr.name)
				return
			}
			if(['href','src','xlink:href','action','formaction'].includes(name)){
				const lower=value.toLowerCase()
				if(lower.startsWith('javascript:')||lower.startsWith('data:text/html')){
					el.removeAttribute(attr.name)
				}
			}
		})
	})
	return tpl.innerHTML
}
__._html=(v)=>__.config.sanitizeHTMLSinks&&typeof v==='string'?__.sanitizeHTML(v):v
// helper used by template functions: sanitize if config says so, pass through if not
__._s=(v)=>__.config.sanitize?__.safify(v):v

// popstart's simple logger
__.quietLogger=function(...params){setTimeout(console.log.bind(console,...params))}
__.log=(()=>{
	return{
		logger:(...args)=>{
			const levels=['debug','info','warn','danger','error','section','success']
			let colors=['#05f','#091','#d15e00','#610','#921','purple;font-weight:bold','#0a0']
			if(__.prefersDarkMode&&__.prefersDarkMode())
				colors=['#5af','#193','orange','#f62','#d31','purple;font-weight:bold','#0a0']
			const defaultLevel='debug'
			let color=colors[0]
			let level=args[0]
			if(typeof level==='string' && levels.includes(level)){
				level=levels.indexOf(level)
				args.shift()
				color=colors[level]
			}
			if(logLevel==='' || level >=levels.indexOf(logLevel)){
				const stack=new Error().stack
				if(stack.split('\n').length < 4){
					__.quietLogger(`%c${args[0]}`,`background-color:${color};color:#fff`,...args.slice(1).filter(arg=> arg !==undefined))
					return
				}
				const line=stack.split('\n')[3].trim().split('/').pop().split(':').slice(0,-1).join(':')
				let logArgs=[line,...args]
				let simpleArgs=''
				let complexArgs=[]
				for(let i=1; i < logArgs.length; i++){
					const arg=logArgs[i]
					if(typeof arg==='string' || typeof arg==='number' || typeof arg==='boolean'){
						simpleArgs+=' '+arg
					}else{
						complexArgs.push(arg)
					}
				}
				if(simpleArgs){
					complexArgs.unshift(simpleArgs.trim())
				}
				complexArgs=complexArgs.filter(arg=> arg !==undefined)
				__.quietLogger(`%c${line}%c ${complexArgs[0]}`,`border-radius:3px;padding:2px 3px 1px;color:#fff;background-color:${color}`,`color:${color}`,...complexArgs.slice(1))
			}
		},
		log:(...args)=>{__.log.logger('debug',...args)},
		debug:(...args)=>{__.log.logger('debug',...args)},
		info:(...args)=>{__.log.logger('info',...args)},
		warn:(...args)=>{__.log.logger('warn',...args)},
		danger:(...args)=>{__.log.logger('danger',...args)},
		error:(...args)=>{__.log.logger('error',...args)},
		success:(...args)=>{__.log.logger('success',...args)},
		// new: section logger
		section:(title, ...args)=>{__.log.logger('section','<<<<',title,'>>>>');if(args.length>0)__.log.logger('section',...args)},
	}
})()
window.debug=window.debug||__.log.debug
window.info=window.info||__.log.info
window.warn=window.warn||__.log.warn
window.danger=window.danger||__.log.danger
window.error=window.error||__.log.error
window.success=window.success||__.log.success
window.Section=window.Section||__.log.section

info('Popstart is loading')

__.sortBasedOnNesting=(a, b)=>{
if (a.contains(b))return 1
if (b.contains(a))return -1
return 0}

__.el=(selector,container)=>{
	let c=container
	if(selector instanceof Array&&selector.length > 0) return selector
	if(selector instanceof Element&&!container)return[selector]
	if(c instanceof Array&&c.length>0)c=c[0]
	else if(!c)c=document
	else if(typeof c==='string')c=document.querySelector(c)||(()=>{error('Container not found:',c);return[]})()
	if(!(c instanceof Element)){
		// error("__.el","Container is not an element",c)
		var els=Array.from(document.querySelectorAll(selector))
		var els2=els.sort(__.sortBasedOnNesting)
		return els2
	}
	if(selector instanceof Element){
		var els=c.contains(selector)?[selector]:[]
		els=els.sort(__.sortBasedOnNesting)
		return els
	}
	try{
		const eles=c.querySelectorAll(selector)
		if(!eles){
			return[]
		}
		var foundEls=Array.from(eles)
		if(c&&c.matches&&c.matches(selector))foundEls.unshift(c)
		foundEls=foundEls.sort(__.sortBasedOnNesting)
		return foundEls
	}catch(e) {
		error(`Error:${e.message}`)
		return[]
	}
}

// Per-element debounce to prevent cross-element interference
// (e.g., __.trigger() on one element cancelling another's handler)
__.debounce=function(func,wait){
	const timeoutKey = '__popstart_debounce_' + (func.name || 'default')
	return function(...args){
		const context=this
		let override=__.GetStringAttr(context,"debounce","__.debounce")
		if(override!==undefined&&override!==''){
			override=parseInt(override)
			if(override===0)return func.apply(context,args)
			if(override>0)wait=override
		}
		clearTimeout(context[timeoutKey])
		context[timeoutKey]=setTimeout(()=>func.apply(context,args),wait||25)
	}}

// this attr function also works with inline styles:
__.attr=(selector,name,value)=>{
	const els=__.el(selector)
	if(name==='style'){
		if(value===undefined){
			return els.map(el=>el.style.cssText)
		}else{
			els.forEach(el=>el.style.cssText=value)
		}
	}else{
		if(value===undefined){
			return els.map(el=>el.getAttribute(name))
		}else{
			els.forEach(el=>el.setAttribute(name,value))
		}
	}
}

// core DOM utilities (function keyword for this-fallback, arrow to save bytes)
__.addClass=function(selector,classes){if(!selector)selector=this
	classes.split(/[, ]/).filter(Boolean).forEach(c=>__.el(selector).forEach(el=>el.classList.add(c[0]==='.'?c.slice(1):c)))}
__.removeClass=function(selector,classes){if(!selector)selector=this
	classes.split(/[, ]/).filter(Boolean).forEach(c=>__.el(selector).forEach(el=>el.classList.remove(c[0]==='.'?c.slice(1):c)))}
__.toggleClass=function(selector,classes){if(!selector)selector=this
	classes.split(/[, ]/).filter(Boolean).forEach(c=>__.el(selector).forEach(el=>el.classList.toggle(c[0]==='.'?c.slice(1):c)))}
__.hasClass=(selector,cls)=>__.el(selector).some(el=>el.classList.contains(cls[0]==='.'?cls.slice(1):cls))
__.text=function(selector,content){if(!selector)selector=this
	if(content===undefined)return __.el(selector).map(el=>el.textContent)
	__.el(selector).forEach(el=>el.textContent=content)}
__.html=function(selector,content){if(!selector)selector=this
	if(content===undefined)return __.el(selector).map(el=>el.innerHTML)
	__.el(selector).forEach(el=>el.innerHTML=__._html(content))}
__.val=function(selector,value){if(!selector)selector=this
	if(value===undefined)return __.el(selector).map(el=>el.value)
	__.el(selector).forEach(el=>el.value=value)}
__.del=(selector)=>__.el(selector).forEach(el=>el.remove())
__.show=function(selector){if(!selector)selector=this
	__.el(selector).forEach(el=>{el.classList.remove('hidden');el.style.display=''})}
__.hide=function(selector){if(!selector)selector=this
	__.el(selector).forEach(el=>{el.classList.add('hidden');el.style.display='none'})}
__.toggle=function(selector){if(!selector)selector=this
	__.el(selector).forEach(el=>{el.classList.contains('hidden')?__.show(el):__.hide(el)})}
__.trigger=(selector,type)=>__.el(selector).forEach(el=>{__.PopEvent.call(el,type)})
__.noop=()=>{}
__.delay=(time)=>new Promise(resolve=>setTimeout(resolve,time||1000))
__.redirect=(url)=>{if(url&&url!=='')document.location=url}

// DOM traversal
__.closest=function(selector,match){if(!selector)selector=this
	let el=__.el(selector)[0];return el?el.closest(match):null}
__.parent=function(selector){if(!selector)selector=this
	let el=__.el(selector)[0];return el?el.parentElement:null}
__.children=function(selector,filter){if(!selector)selector=this
	let kids=Array.from(__.el(selector)[0]?.children||[])
	return filter?kids.filter(el=>el.matches(filter)):kids}
__.siblings=function(selector){if(!selector)selector=this
	let el=__.el(selector)[0];if(!el||!el.parentElement)return[]
	return Array.from(el.parentElement.children).filter(s=>s!==el)}
__.next=(selector)=>{let el=__.el(selector)[0];return el?el.nextElementSibling:null}
__.prev=(selector)=>{let el=__.el(selector)[0];return el?el.previousElementSibling:null}

// DOM insertion
__.empty=function(selector){if(!selector)selector=this
	__.el(selector).forEach(el=>{el.innerHTML=''})}
__.append=function(selector,html){if(!selector)selector=this
	__.el(selector).forEach(el=>el.insertAdjacentHTML('beforeend',__._html(html)))}
__.prepend=function(selector,html){if(!selector)selector=this
	__.el(selector).forEach(el=>el.insertAdjacentHTML('afterbegin',__._html(html)))}
__.before=function(selector,html){if(!selector)selector=this
	__.el(selector).forEach(el=>el.insertAdjacentHTML('beforebegin',__._html(html)))}
__.after=function(selector,html){if(!selector)selector=this
	__.el(selector).forEach(el=>el.insertAdjacentHTML('afterend',__._html(html)))}
__.replace=function(selector,html){if(!selector)selector=this
	__.el(selector).forEach(el=>{let w=document.createElement('div');w.innerHTML=__._html(html)
			el.replaceWith(...w.childNodes)})}
__.clone=(selector,deep)=>{let el=__.el(selector)[0];return el?el.cloneNode(deep!==false):null}
__.create=(tag,attrs,content)=>{let el=document.createElement(tag)
	if(attrs)Object.entries(attrs).forEach(([k,v])=>k==='style'?el.style.cssText=v:el.setAttribute(k,v))
	if(content)el.innerHTML=__._html(content);return el}

// CSS get/set — __.css(sel,'color') reads, __.css(sel,'color','red') or __.css(sel,{color:'red'}) writes
__.css=function(selector,prop,value){if(!selector||typeof selector==='object'&&selector.style){value=prop;prop=selector;selector=this}
	let els=__.el(selector)
	if(typeof prop==='object'){els.forEach(el=>Object.assign(el.style,prop));return}
	if(value!==undefined){els.forEach(el=>el.style[prop]=value);return}
	let el=els[0];return el?getComputedStyle(el)[prop]:''}

// DOM property get/set (disabled, checked, etc)
__.prop=function(selector,name,value){if(!selector)selector=this
	let els=__.el(selector)
	if(value===undefined)return els[0]?els[0][name]:undefined
	els.forEach(el=>el[name]=value)}

// replaced regex with this string split version instead,
// slightly longer but more readable.
// (note the regex would be O(m)and this is O(n*m))
__.getArgs=fn=>{
	let args=null
	let fnString=fn.toString()
	if(fnString.includes('=>')){
		args = fnString.replace(/^async\s+/,'').split('=>')[0].trim()
	}
	// detect ifthe function contains()\s*=>or function\s*\(\s*\)
	// which means it's an arrow function or a function with no arguments
	// in which case return an empty array
	let tempfnString=fnString.replace(/\s/g,'')
	// we have to substring only up to the first {
	// because the function may contain a nested function
	// which would cause the regex to fail
	tempfnString=tempfnString.substring(0,tempfnString.indexOf('{'))
	if(tempfnString.includes('()=>')|| tempfnString.includes('function()')){
		return []
	}
	if(fnString.includes('=>')){
		args=fnString.split('=>')[0].trim()
	}else if(fnString.includes('function')){
		args=fnString.split('function')[1].split('{')[0].trim()
	}else{
		warn(`Unsupported function signature:${fnString}`)
		return []
	}
	if(args.includes('(')){
		return args.split('(')[1].split(')')[0].split(',').map(arg=>arg.trim().split('=')[0].trim())
	}else{
		return [args]
	}
}

// critical methods used by __.PopEvent:

__.GetStringAttr=(ele,name,fnName,eleName)=>{
	// error(ele,`__.GetStringAttr ${fnName}for ${eleName}:${name}`)
	if(!ele){
		return ''
	}
	if(!eleName)eleName=__.GetElementName(ele)
	if(!ele.getAttribute){
		info(ele,`__.GetStringAttr ${fnName}for ${eleName}:${name} ele has no getAttribute`)
		return ''
	}
	for(const prefix of __.config.AttrPrefixes){
		let attr=ele.getAttribute(prefix+name)
		if(attr){
			// debug(ele,prefix+name,`__.GetStringAttr ${fnName}for ${eleName}:${name}recd attr:${attr}`)
			debug(`__.GetStringAttr ${fnName} attached to ${eleName}:${name}:found attr:${attr}.`)
			return attr
		}
		// check lower case ifnot found
		attr=ele.getAttribute((prefix+name).toLowerCase())
		if(attr){
			debug(`__.GetStringAttr ${fnName} attached to ${eleName}:${name}:found attr:${attr}.`)
			return attr
		}
	}
	// if(!name.toLowerCase().endsWith('writedatapath'))
	//	debug(`__.GetStringAttr ${fnName} attached to ${eleName}:${name}:found no attr.`)
	return ''
}

__.GetIntAttr=(ele,name,fnName,eleName)=>{
	const attr=__.GetStringAttr(ele,name,fnName,eleName)
	if(attr){
		const int=parseInt(attr)
		if(!isNaN(int)){
			debug(`__.GetIntAttr ${fnName} for ${eleName}:${name}:found int:${int}.`)
			return int
		}
	}
	debug(`__.GetIntAttr ${fnName} for ${eleName}:${name}:found no int.`)
	return 0
}

__.parseErrorResponse=(r)=>{
	// You can replace this method,or __.displayError with your own
	// implementation ifyou have a different error message format or
	// preference for a different error display method
	// ifit's an XHR,extract responseText.
	// This will try to extract JSON if possible.
	if(typeof r==="object" && r.responseText){
		r=r.responseText
	}
	if(typeof r==="object" && r.message){
		r=r.message
	}
	if(typeof r==="string" && r.trim().startsWith("{")){
		try{
			debug('parseErrorResponse',r)
			const rJson=JSON.parse(r)
			if(rJson.message){
				r=rJson.message
				debug('parseErrorResponse',rJson.message)
			}else if(rJson.error){
				r=rJson.error
				debug('parseErrorResponse',rJson.error)
				if(r.message){
					r=r.message
					debug('parseErrorResponse',rJson.error.message)
				}
			}
		}catch(e){
			danger(`Error Message is not JSON: "${r}"`, e)
		}
	}
	if(r==="Unauthorized")r="Sorry, you lack authority to do that."
	if(r==="Bad Gateway")r="The server is down. Please try again later."
	return r
}

// __.displayError: display an error message
__.displayError=function(msg,selector=".error-msg"){
	try{
		const el=__.el(selector)
		if(el.length>0){
			debug("Found .error-msg:",el)
			__.text(el,msg)
			debug("Showing .error-msg:",el)
			__.show(el)
			setTimeout(()=>__.hide(el),10000)
			return
		}
		warn("Did not find .error-msg")
	}catch(e){
		warn(`Warning(probably no .error div)in __.displayError(default error handler):${e.message}`)
	}
	return __.alert(msg,"error-msg error danger")
}

// __.clearError: clear an error message
__.clearError=(selector=".error-msg")=>{
	__.hide(selector)
}

// __.error: default error handler
// You can replace this with your own error handler after popstart is loaded.
__.error=(e)=>{
	const em=__.parseErrorResponse(e);(__.displayError)?(__.displayError(em)):console.error("__.displayError does not exist!", em)
}

__.alert=(text)=>{console.warn('no __.alert function, falling back to alert()');alert(text)}
__.test=(text)=>{__.alert((text)?text:'Howdy!','info')}

__.triggerChangeEvent=(element)=>element.dispatchEvent(new Event('change', {bubbles: true}))

__.handleInputChange=(el)=>__.triggerChangeEvent(el.target)

__.attachInputListeners=()=>document.querySelectorAll(
	'input,textarea,select,[contenteditable]').forEach((el) => {
		el.addEventListener('input',__.handleInputChange)
})

__.removeInputListeners=(removedNode)=>{
	if (
		removedNode.nodeType === Node.ELEMENT_NODE &&
		(removedNode.matches('input, textarea, select') ||
			removedNode.hasAttribute('contenteditable'))
	) {
		removedNode.removeEventListener('input', __.handleInputChange)
	}
	if (removedNode && removedNode.nodeType === Node.ELEMENT_NODE) {
		removedNode.querySelectorAll('input, textarea, select, [contenteditable]').forEach((element) => {
			element.removeEventListener('input', __.handleInputChange)
		})
	}
}

__.Binding = (() => {
	let bound = new Map()
	return {
		bound: bound,
		on: (els, names, f) => {
			if(!Array.isArray(names))names=[names]
			names.forEach(name => {
				els.forEach(el => {
					info(`Binding.on: binding ${name} event to`, el)
					if (!bound.has(el)) bound.set(el, {})
					let bindings = bound.get(el)
					if (!bindings[name]) bindings[name] = []
					bindings[name].push(f)
					el.addEventListener(name, f, true)
				})
			})
		},
		off: (els, names) => {
			if(!Array.isArray(names))names=[names]
			names.forEach(name => {
				els.forEach(el => {
					info(`Binding.off: unbinding ${name} event from`, el)
					let bindings = bound.get(el)
					if (bindings && bindings[name]) {
						bindings[name].forEach(f => {
							el.removeEventListener(name, f, true)
						})
						delete bindings[name]
					}
				})
			})
		},
		resetAll: () => {
			info(`Binding.resetAll: unbinding all events.`)
			bound.forEach((bindings, el) => {
				for (const eventName in bindings) {
					__.Binding.off([el], eventName)
				}
			})
			bound.clear()
		}
	}
})()

__.CheckAndStop=(ev, el, elName, evtag)=>{
	let stopped=false
	let stopHere=(ev)=>{
		danger(`__.CheckAndStop: ${elName} ${evtag} stopped.`)
		if(typeof ev.preventDefault==='function')ev.preventDefault()
		else{
			danger(`__.CheckAndStop: ${elName} ${evtag} could not prevent default.`)
			return
		}
		if(typeof ev.stopPropagation==='function')ev.stopPropagation()
		else{
			danger(`__.CheckAndStop: ${elName} ${evtag} could not stop propagation.`)
			return
		}
		stopped=true
	}
	let s=__.GetStringAttr(el,evtag+"-prevent-default","N/A",elName)
	// explicit opt-out overrides all defaults
	if(s&&(s.toLowerCase()[0]==='f'||s==='0'||s==='off'))return
	if(__.config.AlwaysPreventDefault)stopHere(ev)
	if(s&&(s.toLowerCase()[0]==='t'||s==1||s==="on"))stopHere(ev)
	if(__.config.StopPropagationEventNames.includes(evtag))stopHere(ev)
	if(stopped)debug(`__.CheckAndStop: ${elName} ${evtag} stopped.`)
	else debug(`__.CheckAndStop: ${elName} ${evtag} not stopped.`)
}

__.findFunction=(base,pathArray)=>{
	let current=base
	for(let i=0;i<pathArray.length;i++){
		if(!current[pathArray[i]])return null
		current=current[pathArray[i]]
	}
	return current
}

__.functionFinder = (path, arr) => {
    // If arr is provided and different from path.split('.'), use it
    let pathArray = Array.isArray(arr) ? arr : path.split('.')

    // Try __ first
    let customFunction = __.findFunction(__, pathArray)
    if (customFunction) return customFunction

    // Fall back to window
    return __.findFunction(window, pathArray)
}

__.functionParser=(functionName,arr)=>{
		// handle function names with -N suffix (e.g., get-1, fetch-2)
		let idx=functionName.match(/-(\d+)$/)
		let Suffix=''
		if(idx){
			functionName=functionName.substring(0,functionName.length - idx[0].length)
			// remove the suffix from the function name in arr
			arr[arr.length-1]=functionName
			Suffix=`-${idx[1]}`
		}
		debug("__.functionParser",functionName,Suffix)
		return [functionName,Suffix]
}

__.GetElementName=(el)=>{
	if(!el){
		warn("__.GetElementName: el is null")
		return "unknown"
	}
	let elName=el.tagName
	if(el.id){elName+="#"+el.id.replace(/\s/g,'')
		return elName.toLowerCase()}
	if(elName)elName=elName.toLowerCase()
	warn(`__.GetElementName: el=${el}`, el.classList)
	if(el.classList&&el.classList.length){
		elName+="."+el.classList[el.classList.length-1]
	}
	if(!elName)elName="unknown"
	return elName
}

__.PopEvent=function(ev){

	// __.PopEvent: the most important function in Popstart
	// catches events and triggers your function (promise) chains.
	// PopEvent is actually called with a single argument, the event.
	// `this` is passed in as the element, which is then used to
	// find the function name(s) to call. The function name(s) are then
	// looked up in the window object and a promise is created for each
	// with that function name as the 'funcPath'. The promise is then added
	// to the promises array. The promises array is then passed to
	// Promise.all which will resolve when all promises are resolved. The
	// promises are resolved by calling the function with the event as the
	// first argument, and the element as the second argument. The
	// called function is called with the element as the 'this' context.
	// (Do not replace with arrow function because `this` is needed.)

	debug(`__.PopEvent: ${__.GetElementName(this)} ${ev.type} called.`)

	let el=this
	let evtype
	if(!el)el=window
	let promises=[]
	if(typeof ev == 'string'){
		evtype=ev
		ev={type:ev,target:el}
	} else if(typeof ev == 'object'){
		evtype = ev.type
	} else {
		error(`__.PopEvent: ${__.GetElementName(el)} ev is not a string or object.`, ev)
		return
	}
	if(typeof evtype!=='string'){
		danger(`__.PopEvent: ${__.GetElementName(el)} evtype is not a string.`, ev)
		return
	}
	if(evtype&&!ev.target)ev.target=el

	let evtag=evtype.replace(/\./g,'-')
	let fn=null
	for(const prefix of __.config.AttrPrefixes){
		fn=el.getAttribute(prefix+evtag)
		if(fn&&fn!=="")break
		fn=null
	}
	if(!fn)return
	let elName=__.GetElementName(el)
	__.state.lastOp={ev:ev,this:el}

	__.CheckAndStop(ev, el, elName, evtag)

	let promiseLoader=(funcPath)=>{
		let createPromise=()=>{
			return new Promise((resolve,reject)=>{

				let idx,Suffix,functionName,arr,path
				Section(`From event ${evtype} on ${elName}, calling function ${funcPath} now..`)

				path=funcPath.trim()
				arr=path.split(".")
				if(arr.length==0){
					debug("No function name provided for",funcPath)
					reject(new Error(`No function name provided for ${funcPath}`))
					return
				}

				// the functionName is the actual functionName,
				// without the container object(s)
				functionName=arr[arr.length-1]
				info("functionName",functionName,arr)

				// handle function names with numbers at the end
				let t=__.functionParser(functionName,arr)
				functionName=t[0]
				Suffix=t[1]
				debug(`using ${functionName} with Suffix ${Suffix}`)

				// find the actual function to call(in window)
				let f=__.functionFinder(functionName,arr)
				if(!f){
					warn(`Function ${functionName} doesn't exist in`,arr)
					reject(new Error(`Function ${functionName} not found`))
					return
				}

				// get list of and prepare arguments for the func
				let args=[]
				__.getArgs(f).map((arg)=>{
					if(!arg||arg==='')return
					debug("arg name:",arg)
					let attr=__.GetStringAttr(el,
						`${functionName}-${arg}${Suffix}`,functionName,elName)
					if(attr){args.push(attr);return}
					else if(__.config.eventNameArgs.indexOf(arg)>-1){args.push(ev);return}
					else if(__.config.elementNameArgs.indexOf(arg)>-1){args.push(el);return}
					// we have no argument available,so push undefined
					warn(`No arg ${functionName}-${arg} on ${elName}`)
					args.push(undefined)
				})

				debug(`Triggered ${functionName}(${args}) on ${elName}`)

				let dataPath=__.GetStringAttr(el,
					`${functionName}-writedatapath${Suffix}`,functionName,elName)

				// call it(whether promise or function)
				let possiblePromise
				try{
					possiblePromise=f.apply(el,[...args])
				}catch(err){
					if(args.length>0)warn(`Unable to execute ${functionName}(${args}) on ${elName}:`,err)
					else warn(`Unable to execute ${functionName}() on ${elName}:`,err)
					reject(err)
					return
				}
				if(possiblePromise && typeof possiblePromise.then==='function'){

					// this is a promise:
					possiblePromise.then((d)=>{
						if(d!==undefined){
							__.state.lastOp.last=d
							__.data[path]=d
							if(dataPath!=="")__.data[dataPath]=d
						}
						resolve(args)

					}).catch((err)=>{

						warn("Unable to execute",path + ":",err)

						// check for a specific functionName err handler
						let ehName=__.GetStringAttr(el,
							`${functionName}-error${Suffix}`,functionName,elName)
						// check for an element err handler
						if(ehName===''){
							ehName=__.GetStringAttr(el,`error`,functionName,elName)
						}

						// fallback to default err handler
						if(ehName=='') ehName="__.error"
						else warn("Default error handler:",ehName)

						// determine ifthe err handler's name has a suffix
						// and extract it(separate it out)using functionParser
						let u=__.functionParser(ehName,ehName.split("."))
						ehName=u[0]
						let ehIdxSuffix=u[1]
						let ehNameLastPart=ehName.split(".").pop()

						warn("Error handler:",ehName)

						// retrieve the err handler func
						let eh=__.functionFinder(ehName,ehName.split("."))
						if(!eh){
							warn("Error Function",ehName,"doesn't exist")
							reject(err)
							return
						}

						// parse error response
						const em=__.parseErrorResponse(err)
						info("PARSED ERROR RESPONSE",em)

						// get list of and prepare arguments for the err handler func
						let ehArgs=[]
						__.getArgs(eh).map((arg)=>{
							debug(`Parsing ${ehName}-${arg}${ehIdxSuffix}`)
							let attr=__.GetStringAttr(el,
								`${ehNameLastPart}-${arg}${ehIdxSuffix}`,
									ehNameLastPart,elName)
							if(attr)ehArgs.push(attr)
							else if(em!==""&&arg==='e')ehArgs.push(em)
							else if(em!==""&&arg==='msg')ehArgs.push(em)
							else if(em!==""&&arg==='message')ehArgs.push(em)
							else if(__.config.errorNameArgs.indexOf(arg)>-1)ehArgs.push(em)
							else if(__.config.eventNameArgs.indexOf(arg)>-1)ehArgs.push(ev)
							else if(__.config.elementNameArgs.indexOf(arg)>-1)ehArgs.push(el)
						})

						// call the err handler
						debug(`${elName}${ehName}(${ehArgs})`)

						// call it(whether promise or function)
						// error handler runs, then chain STOPS.
						// error handler can __.trigger() a new chain elsewhere.
						let errPossiblePromise=eh.apply(el,[...ehArgs])
						if(errPossiblePromise && typeof errPossiblePromise.then==='function'){
							errPossiblePromise.then((d)=>{
								if(d!==undefined){
									debug(ehName,d)
									__.state.lastOp.last=d
									__.data[ehName]=d
									if(dataPath!=="")__.data[dataPath]=d
								}
								reject(err)
							}).catch((innerErr)=>{
								warn("Unable to execute",ehName + ":",innerErr)
								reject(err)
							})
						} else {
							reject(err)
						}

					})

				}else{

					// NOT a promise
					if(possiblePromise!==undefined){
						__.state.lastOp.last=possiblePromise
						__.data[path]=possiblePromise
						if(dataPath!=="")__.data[dataPath]=possiblePromise
					}
					resolve(args)
				}
			})
		}
		promises.push(createPromise)
	}

	// we allow for multiple functions to be specified via comma or
	// whitespace delimiting,along with comments
	//
	// remove /* ... */ from function name(s):
	const fns=fn.replace(/\/\*[\s\S]*?\*\//g,'')
		// if# or // are found,remove from there to the end of the newline
		.replace(/(\/\/|#).*$/gm,'')
		// remove whitespace also.
		// finally,split on whitespace and commas and
		// execute promiseLoader
		// on each function name in the list
		.trim().split(/[\t\n,]+/)

	Section(`Event "${evtype}" on ${elName}; calling functions (in order):\n` +
		fns.map((fn,idx)=>`\t\t${idx+1}. ${fn}`).join("\n"))

	fns.map(promiseLoader)

	// if any promise is rejected,then the entire chain stops, by design!
	let chain=promises.reduce((prev,cur)=>prev.then((result)=>cur(result)),Promise.resolve([]))

	info("Returning promises",promises.length,promises)

	return chain
}

__.Popstart=()=>{
	warn("Popstart: called",__.Binding.bound)
	__.Binding.resetAll()
	__.config.BoundEventNames.map((eventname)=>{
		// convert show.bs.modal to show-bs-modal
		var eventtag=eventname.replace(/\./g,'-')
		__.config.AttrPrefixes.map((prefix)=>{
			let selector="[" + prefix + eventtag + "]"
			let els=__.el(selector)
			if(els.length==0)return
			if(__.config.DebounceTimes[eventname])
				__.Binding.on(els,eventname,
					__.debounce(__.PopEvent, __.config.DebounceTimes[eventname])
				)
			else
				__.Binding.on(els,eventname,__.PopEvent)
		})
	})
}

// detect dom changes and call Popstart and removeInputListeners
__.DOMWatcher = {
	psObsvr: new MutationObserver(__.debounce(__.Popstart,__.config.DebounceTimes["DOMWatcher.psObsvr"])),
	isRunning: false,
	RemovalObserver: new MutationObserver((records) => {
		for (const record of records) {
			for (const removedNode of record.removedNodes) {
				__.removeInputListeners(removedNode)
			}
		}
	}),
	start:()=> {
		if (!__.DOMWatcher.isRunning){
			__.DOMWatcher.psObsvr.observe(document.body,{
				childList:__.config.DetectDOMChildListChanges,
				subtree:__.config.DetectDOMSubtreeChanges,
				attributes:__.config.DetectDOMAttrChanges,
				attributeFilter:__.config.DetectDOMAttrChangesFilter,
			})
			__.DOMWatcher.RemovalObserver.observe(document.body,{childList:true,subtree:true})
			__.DOMWatcher.isRunning=true
			// Call the new function to attach input listeners
			__.attachInputListeners()
		}
	},
	stop:()=>{
		if (__.DOMWatcher.isRunning) {
			__.DOMWatcher.psObsvr.disconnect()
			__.DOMWatcher.RemovalObserver.disconnect()
			__.DOMWatcher.isRunning = false
		}
	},
}

// Startup loads the actual functions that are called by the event handlers.
__.Startup=()=>{

	// Launch immediately
	if(!__.config.DontAutostart)__.Popstart()
	else warn("__.config.DontAutostart is set, NOT starting Popstart automatically!")

	// also launch on popstate
	// https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event
	window.addEventListener("popstate",__.Popstart)

	// or on hashchange
	// https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onhashchange
	window.addEventListener("hashchange",__.Popstart)

	// when 'startup' is specified on an element, call those functions
	__.DOMWatcher.stop()
	let startupPromises=[]
	let failureFunctions=[]
	let startups=["startup","startup1","startup2"]
	startups.forEach((startupName)=>{
		info("POPSTART STARTUP:",startupName)
		let seen=new Set()
		__.config.AttrPrefixes.forEach(prefix=>{
			document.querySelectorAll("["+prefix+startupName+"]").forEach((el)=>{
				if(seen.has(el))return
				seen.add(el)
				// always pass bare name — PopEvent's prefix loop finds the right attribute
				let startupFunction=()=>__.PopEvent.call(el,{type:startupName})
				startupPromises.push(startupFunction())
				// check failure handler across all prefixes
				let failureFunctionName=null
				for(const p of __.config.AttrPrefixes){
					failureFunctionName=el.getAttribute(p+startupName+"-failure")
					if(failureFunctionName)break
				}
				if(failureFunctionName){
					failureFunctions.push(()=>__.PopEvent.call(el,{type:startupName+"-failure"}))
				}
			})
		})
	})

	// call allSettled on the startup promises:
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
	// This is the most modern item that we use, so a polyfill is required to
	// support browsers before 2020.
	return Promise.allSettled(startupPromises)
	.then((results)=>{
		let successfulResults=results.filter(
			(result)=>result.status==="fulfilled"
		)
		let failedResults=results.filter(
			(result)=>result.status==="rejected"
		)
		if(failedResults.length>0){
			error(failedResults)
			let failurePromises=[]
			failureFunctions.forEach((failureFunction)=>{
				failurePromises.push(failureFunction())
			})
			return Promise.allSettled(failurePromises).then(()=>{
				__.DOMWatcher.start()
			})
		}
		__.DOMWatcher.start()
		return successfulResults
	})
	.catch((e)=>{
		warn("Popstart startup failed:")
		error(e)
		__.error(e)
		__.DOMWatcher.start()
	})

}

// Startup (after DOM content loaded)
document.addEventListener('DOMContentLoaded', __.Startup)
