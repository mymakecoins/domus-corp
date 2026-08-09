const {contextBridge,ipcRenderer}=require('electron');
const api=Object.freeze({
  app:Object.freeze({getVersion:()=>ipcRenderer.invoke('domus:app:get-version')}),
  controlPlane:Object.freeze({health:()=>ipcRenderer.invoke('domus:control-plane:health')}),
  onboarding:Object.freeze({load:()=>ipcRenderer.invoke('domus:onboarding:load'),save:value=>ipcRenderer.invoke('domus:onboarding:save',value),complete:value=>ipcRenderer.invoke('domus:onboarding:complete',value),delete:()=>ipcRenderer.invoke('domus:onboarding:delete')}),
  chat:Object.freeze({
    start:value=>ipcRenderer.invoke('domus:chat:start',value),
    cancel:()=>ipcRenderer.invoke('domus:chat:cancel'),
    status:()=>ipcRenderer.invoke('domus:chat:status'),
    history:Object.freeze({list:value=>ipcRenderer.invoke('domus:chat:history:list',value),get:itemId=>ipcRenderer.invoke('domus:chat:history:get',{itemId}),delete:itemId=>ipcRenderer.invoke('domus:chat:history:delete',{itemId})}),
    onEvent:listener=>{const handler=(_event,value)=>listener(value);ipcRenderer.on('domus:chat:event',handler);return()=>ipcRenderer.removeListener('domus:chat:event',handler);},
  }),
});
contextBridge.exposeInMainWorld('domus',api);
