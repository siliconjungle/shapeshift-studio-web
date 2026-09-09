// Stable A* frontier. Equal scores retain the old insertion order, so route
// choice and the search budget are unchanged while extraction is logarithmic.
export class PathQueue {
 constructor(first){this.items=[];this.sequence=0;this.push(first);}
 get length(){return this.items.length;}
 before(a,b){return a.f<b.f||a.f===b.f&&a.order<b.order;}
 push(node){node.order=this.sequence++;const a=this.items;let i=a.length;a.push(node);while(i>0){const p=(i-1)>>1;if(!this.before(node,a[p]))break;a[i]=a[p];i=p;}a[i]=node;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&this.before(a[c+1],a[c]))c++;if(!this.before(a[c],last))break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
