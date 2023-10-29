//preload.js

// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const {ipcRenderer, contextBridge} = require('electron');

let ipcRendererListener = {
    apiKeyResponse: (callback) => ipcRenderer.on("api-key-response", (callback)),
    isSetupDone: (callback) => ipcRenderer.on("is-setup-done", (callback)),
    fetchedRandomImage: (callback) => ipcRenderer.on("fetched-random-image", (callback)),
    getCurrentConfig: (callback) => ipcRenderer.on("get-current-config", (callback))
};

contextBridge.exposeInMainWorld("ipcRenderer",ipcRenderer);

contextBridge.exposeInMainWorld("ipcRendererListener", ipcRendererListener);