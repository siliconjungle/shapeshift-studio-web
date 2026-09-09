import {VillageAttachments} from './ecs/community-data.js';
import {bindCommunity,communityBinding} from './ecs/community-entities.js';
import * as systems from './ecs/systems/attachments.js';
export {VillageAttachments} from './ecs/community-data.js';
export function createAttachments(e){const state=new VillageAttachments();state.economy=e;state.nextCheck=0;state.gardens=[];return bindCommunity(e,'PlaceAttachmentsState',state);}
export function attachmentsPlaces(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsPlaces(world,id,...args);}
export function attachmentsTree(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsTree(world,id,...args);}
export function attachmentsNotice(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsNotice(world,id,...args);}
export function attachmentsWorkBias(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsWorkBias(world,id,...args);}
export function attachmentsRest(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsRest(world,id,...args);}
export function attachmentsHandle(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsHandle(world,id,...args);}
export function attachmentsUpdate(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsUpdate(world,id,...args);}
export function attachmentsSnapshot(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'PlaceAttachmentsState');return systems.attachmentsSnapshot(world,id,...args);}
