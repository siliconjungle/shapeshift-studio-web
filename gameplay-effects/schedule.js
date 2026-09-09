// The heap is serializable runtime state; no timers run while the game is paused.
const earlier=(a,b)=>a.at<b.at||(a.at===b.at&&a.order<b.order);
export function schedule(state,job){
 const heap=state.jobs;job.order=state.nextJob++;heap.push(job);let i=heap.length-1;
 while(i>0){const p=(i-1)>>1;if(!earlier(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p}return job;
}
export function takeDue(state,time){
 const heap=state.jobs;if(!heap.length||heap[0].at>time+1e-9)return null;
 const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let n=i,l=i*2+1,r=l+1;if(l<heap.length&&earlier(heap[l],heap[n]))n=l;if(r<heap.length&&earlier(heap[r],heap[n]))n=r;if(n===i)break;[heap[i],heap[n]]=[heap[n],heap[i]];i=n}}
 return first;
}
