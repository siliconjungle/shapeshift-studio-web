const card=(name,colour,hint,id)=>({name,colour,hint,beastOnly:true,art:`assets/vector/wishes/cards/${id}.svg`});
export const BEAST_MIRACLES={
 praise:card('Praise','#f6da88','Praise your beast at any time. It learns from recent actions, or guesses what nearby person or place you mean.','praise'),
 scold:card('Scold','#e5b38c','Scold your beast at any time. It associates this with recent actions or its surroundings; repeated scolding makes it fearful.','scold'),
 'beast-feast':card('Beast Feast','#efb974','Give your beast a huge magical meal: full belly, affection and a calmer mood. Does not use the village’s food.','beast-feast'),
 guard:card('Guard','#a9dbce','Choose a villager or structure for your beast to guard for 60 seconds.','guard'),
 play:card('Play','#f4d58c','Choose a villager outdoors. Your beast approaches and plays with them, building their bond and calming down.','play'),
 rampage:card('Rampage','#f29972','Double your beast’s attack damage for 20 seconds. An untrained beast may lash out at its own villagers.','rampage'),
 lullaby:card('Lullaby','#c7bdf4','Put your beast into deep restorative sleep for 20 seconds. It will not defend the village while asleep.','lullaby'),
};
