import {app,BrowserWindow,ipcMain,session} from 'electron';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {allowRendererNavigation,assertIpcPayload,assertTrustedFrame,PRODUCTION_CSP,secureWebPreferences} from './security.js';
import {fetchHealth} from './control-plane-client.js';
import {createElectronOnboardingStore} from './infrastructure/electron-onboarding-store.js';
import {createOnboardingService} from './application/onboarding-service.js';
import {createElectronCredentialStore} from './infrastructure/electron-credential-store.js';
import {createDesktopSessionProvider} from './application/session-provider.js';
import {createControlPlaneChatTransport} from './infrastructure/control-plane-chat-transport.js';
import {createElectronChatHistory} from './infrastructure/electron-chat-history.js';
import {createChatService} from './application/chat-service.js';

const directory=fileURLToPath(new URL('.',import.meta.url));
const development=process.env.NODE_ENV==='development';
const rendererUrl=development?'http://127.0.0.1:5173/':new URL('../../renderer/index.html',import.meta.url).href;
const controlPlaneOrigin=process.env.DOMUS_CONTROL_PLANE_ORIGIN??'http://127.0.0.1:3000';

app.whenReady().then(async()=>{
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 session.defaultSession.webRequest.onHeadersReceived((details,callback)=>callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[PRODUCTION_CSP]}}));
 const window=new BrowserWindow({show:false,webPreferences:{...secureWebPreferences,preload:join(directory,'../preload/index.cjs')}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(!allowRendererNavigation(url,rendererUrl,development))event.preventDefault();});
 const trusted=(event:Electron.IpcMainInvokeEvent)=>{const frame=event.senderFrame;if(!frame)throw new Error('IPC_ORIGIN_DENIED');assertTrustedFrame({senderFrameUrl:frame.url,mainFrameUrl:window.webContents.mainFrame.url,isMainFrame:frame===window.webContents.mainFrame});};
 const clock={now:()=>new Date()};
 const onboarding=createOnboardingService(createElectronOnboardingStore(app.getPath('userData')),clock,{next:randomUUID});
 const sessionProvider=createDesktopSessionProvider(createElectronCredentialStore(app.getPath('userData')),clock);
 const history=createElectronChatHistory(app.getPath('userData'),sessionProvider);
 const chat=createChatService({transport:createControlPlaneChatTransport({origin:controlPlaneOrigin,session:sessionProvider}),ids:{next:randomUUID},history,clock});
 ipcMain.handle('domus:app:get-version',event=>{trusted(event);return {schema_version:'1.0.0',version:app.getVersion()};});
 ipcMain.handle('domus:control-plane:health',async event=>{trusted(event);return {schema_version:'1.0.0',request_id:randomUUID(),...(await fetchHealth(controlPlaneOrigin))};});
 ipcMain.handle('domus:onboarding:load',event=>{trusted(event);return onboarding.load();});
 ipcMain.handle('domus:onboarding:save',(event,value)=>{trusted(event);return onboarding.save(assertIpcPayload(value,['version','fields','currentStep','paused']) as never);});
 ipcMain.handle('domus:onboarding:complete',(event,value)=>{trusted(event);return onboarding.complete(assertIpcPayload(value,['version']) as never);});
 ipcMain.handle('domus:onboarding:delete',event=>{trusted(event);return onboarding.delete();});
 ipcMain.handle('domus:chat:start',async(event,value)=>{trusted(event);return chat.start(assertIpcPayload(value,['messages','maximumOutputTokens'],1_048_576) as never,streamEvent=>window.webContents.send('domus:chat:event',streamEvent));});
 ipcMain.handle('domus:chat:cancel',event=>{trusted(event);chat.cancel();return {state:'CANCELLED'};});
 ipcMain.handle('domus:chat:status',event=>{trusted(event);return chat.status();});
 ipcMain.handle('domus:chat:history:list',(event,value)=>{trusted(event);return history.list(assertIpcPayload(value,['from','to','limit']) as never);});
 ipcMain.handle('domus:chat:history:get',(event,value)=>{trusted(event);const input=assertIpcPayload(value,['itemId']);return history.get(String(input.itemId));});
 ipcMain.handle('domus:chat:history:delete',(event,value)=>{trusted(event);const input=assertIpcPayload(value,['itemId']);return history.delete(String(input.itemId));});
 await window.loadURL(rendererUrl);
 if(process.env.DOMUS_E2E_ISOLATION==='1'){const proof=await window.webContents.executeJavaScript('({requireType:typeof require,processType:typeof process,domusKeys:Object.keys(window.domus||{}).sort()})');if(proof.requireType!=='undefined'||proof.processType!=='undefined'||JSON.stringify(proof.domusKeys)!=='["app","chat","controlPlane","onboarding"]'){app.exit(1);return;}console.log('Electron renderer isolation proof passed');app.quit();return;}
 window.show();
});
app.on('window-all-closed',()=>app.quit());
