// popstart dragdrop plugin — sortable lists and drop zones
// depends on: popstart-core.js + popstart-extras.js
//
// sortable list:
//   <ul sortable>
//     <li>Item 1</li>
//     <li>Item 2</li>
//     <li>Item 3</li>
//   </ul>
//
// drop zone (files or elements):
//   <div dropzone="handleDrop">Drop files here</div>
//
// drag handle (optional — restrict drag start to a child):
//   <ul sortable>
//     <li><span drag-handle>☰</span> Item 1</li>
//   </ul>

'use strict'

;(()=>{

// --- sortable lists ---

let dragging=null
let placeholder=null

let onDragStart=(e)=>{
	let item=e.target.closest('[sortable] > *')
	if(!item)return
	// if drag-handle is present, only start from handle
	let handle=item.querySelector('[drag-handle]')
	if(handle&&!handle.contains(e.target))return
	dragging=item
	placeholder=document.createElement(item.tagName)
	placeholder.className='ps-drag-placeholder'
	placeholder.style.cssText='height:'+item.offsetHeight+'px;border:2px dashed #999;background:#f5f5f5;opacity:0.5'
	setTimeout(()=>{
		item.style.opacity='0.4'
		item.parentNode.insertBefore(placeholder,item.nextSibling)
	},0)
	e.dataTransfer.effectAllowed='move'
	e.dataTransfer.setData('text/plain','') // needed for firefox
}

let onDragOver=(e)=>{
	if(!dragging)return
	e.preventDefault()
	e.dataTransfer.dropEffect='move'
	let container=e.target.closest('[sortable]')
	if(!container)return
	let target=e.target.closest('[sortable] > *')
	if(!target||target===dragging||target===placeholder)return
	let rect=target.getBoundingClientRect()
	let mid=rect.top+rect.height/2
	if(e.clientY<mid)container.insertBefore(placeholder,target)
	else container.insertBefore(placeholder,target.nextSibling)
}

let onDragEnd=(e)=>{
	if(!dragging)return
	dragging.style.opacity=''
	if(placeholder&&placeholder.parentNode){
		placeholder.parentNode.insertBefore(dragging,placeholder)
		placeholder.remove()
	}
	// fire sorted event with new order
	let container=dragging.closest('[sortable]')
	if(container){
		let items=Array.from(container.children).filter(c=>c.tagName!=='TEMPLATE')
		let order=items.map((el,i)=>({index:i,text:el.textContent.trim(),el:el}))
		__.data.sorted={container:container,items:order}
		__.PopEvent.call(container,{type:'sorted'})
	}
	dragging=null
	placeholder=null
}

// init sortable containers
let initSortable=()=>{
	__.el('[sortable]').forEach(container=>{
		if(container._psSortable)return
		container._psSortable=true
		Array.from(container.children).forEach(child=>{
			if(child.tagName==='TEMPLATE')return
			child.draggable=true
			child.addEventListener('dragstart',onDragStart)
		})
		container.addEventListener('dragover',onDragOver)
		container.addEventListener('dragend',onDragEnd)
	})
}

// --- drop zones (file drops) ---

let initDropZones=()=>{
	__.el('[dropzone]').forEach(zone=>{
		if(zone._psDropzone)return
		zone._psDropzone=true
		let handler=zone.getAttribute('dropzone')
		zone.addEventListener('dragover',e=>{
			e.preventDefault()
			e.dataTransfer.dropEffect='copy'
			__.addClass(zone,'ps-dragover')
		})
		zone.addEventListener('dragleave',()=>__.removeClass(zone,'ps-dragover'))
		zone.addEventListener('drop',e=>{
			e.preventDefault()
			__.removeClass(zone,'ps-dragover')
			let files=Array.from(e.dataTransfer.files)
			let items=Array.from(e.dataTransfer.items||[])
			__.data.dropped={files:files,items:items,text:e.dataTransfer.getData('text')}
			if(handler){
				let fn=__.findFunction?__.findFunction(handler):window[handler]
				if(fn)fn.call(zone,files,e)
			}
			__.PopEvent.call(zone,{type:'dropped'})
		})
	})
}

// --- expose ---

__.sortable=initSortable
__.dropzone=initDropZones

// init on load
initSortable()
initDropZones()

// re-init when DOM changes (new sortable items added)
let obs=new MutationObserver(()=>{initSortable();initDropZones()})
if(document.body)obs.observe(document.body,{childList:true,subtree:true})

})()
