import {defineGameData} from './game-data.js';
export const RESOURCE_WISH_AMOUNTS=defineGameData('resource-wish.RESOURCE_WISH_AMOUNTS',Object.freeze({food:8,wood:10,stone:8}));
export function grantWishSupplies(e,kind){
 const amount=RESOURCE_WISH_AMOUNTS[kind];if(!amount)throw Error('Unknown resource wish');
 e.stock[kind]=(e.stock[kind]??0)+amount;
 e.emit('wish-supplies',null,null,{kind,amount});
}
