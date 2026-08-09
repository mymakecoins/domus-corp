import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./test/browser',use:{baseURL:'http://127.0.0.1:5173'},webServer:{command:'pnpm dev --host 127.0.0.1',port:5173,reuseExistingServer:true},projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}}]});
