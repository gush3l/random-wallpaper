// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const wallpaper = require('wallpaper');
const path = require('node:path');
const Store = require('./storage.js');
const UnsplashAPI = require('./unsplash.js');
const https = require('https');
const fs = require('fs');

let iconPath;

let mainWindow;

let apiUnsplash = null;

let isRunningInDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

let isWindowShowing = false;

const windowSize = {
    width: 400,
    height: 600
}

const config = new Store(isRunningInDev, {
    configName: 'user-settings',
    defaults: {
        initialSetupDone: false,
        unsplashAPIKey: 'NONE',
        lastWallpaper: 'NONE',
        isDarkMode: true,
        wallpaperHistory: []
    }
});

const createWindow = (screen) => {

    iconPath = findAppIcon();

    const primaryDisplay = screen.getPrimaryDisplay();

    const { width, height } = primaryDisplay.workAreaSize

    mainWindow = new BrowserWindow({
        width: windowSize.width,
        height: windowSize.height,
        x: width - windowSize.width,
        y: height - windowSize.height,
        resizable: false,
        transparent: false,
        frame: false,
        skipTaskbar: true,
        show: true,
        maximizable: false,
        minimizable: false,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            zoomFactor: 1.0,
            spellcheck: false,
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('index.html');

    app.commandLine.appendSwitch('disable-pinch');

    const WM_INITMENU = 0x0116;

    mainWindow.hookWindowMessage(WM_INITMENU, () => {
        mainWindow.setEnabled(false);
        mainWindow.setEnabled(true);
    });

    if (isRunningInDev) mainWindow.webContents.openDevTools();

    mainWindow.on('blur', () => {
        if (isRunningInDev) return;
        if (!isWindowShowing) return;
        mainWindow.hide()
        isWindowShowing = false;
    });

    ipcMain.on('minimize', () => {
        if (!isWindowShowing) return;
        mainWindow.hide();
        isWindowShowing = false;
    });

    ipcMain.on('unsplashAPIKey', (_, key) => {
        apiUnsplash = new UnsplashAPI(key);
        config.set("unsplashAPIKey", key);
        apiUnsplash.checkIfValidKey(key).then((response) => {
            mainWindow.webContents.send("api-key-response", response);
        })
    });

    ipcMain.on("setup-done", () => {
        config.set("unsplashAPIKey", apiUnsplash.getApiKey());
        config.set("initialSetupDone", true);
    });

    ipcMain.on("restore-wallpaper", () => {
        wallpaper.set(config.get("lastWallpaper"));
        console.log("Restore wallpaper:", config.get("lastWallpaper"));
    });

    ipcMain.on("is-setup-done-main", () => {
        let isConfigDone = config.get("initialSetupDone");
        mainWindow.webContents.send("is-setup-done", [isConfigDone, config.getStoragePath()]);
    });

    ipcMain.on("add-image-to-config", (_, imageID, fileName, author, thumbnailLink) => {
        saveWallpaperToConfig(imageID, fileName, author, thumbnailLink);
    });

    ipcMain.on("fetch-images", () => {
        if (apiUnsplash == null) {
            apiUnsplash = new UnsplashAPI(config.get("unsplashAPIKey"));
            apiUnsplash.checkIfValidKey(config.get("unsplashAPIKey")).then(() => {
                apiUnsplash.fetchRandomImages().then((response) => {
                    mainWindow.webContents.send("fetched-random-image", response);
                })
            })
        }
        else {
            apiUnsplash.fetchRandomImages().then((response) => {
                mainWindow.webContents.send("fetched-random-image", response);
            })
        }
    });

    ipcMain.on("set-wallpaper", (_, imageURL, imageName, isLocal) => {
        if (!isLocal) downloadImage(imageURL, imageName);
        else wallpaper.set(imageURL);
    });

    ipcMain.on("update-style", (_,isDarkMode) => {
        config.set("isDarkMode",isDarkMode);
    });

    ipcMain.on("retrieve-current-config", (_) => {
        mainWindow.webContents.send("get-current-config", config.data)
    });

    appIcon = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show the app', id: 'showButton', click: () => { mainWindow.show(); } },
        { type: 'separator' },
        { label: 'Exit', id: 'exitButton', click: () => { app.quit(); } },
    ]);

    appIcon.setToolTip('Random Wallpaper\n\nRight-Click to open the app.\nLeft-Click to open the context menu.')
    appIcon.setContextMenu(contextMenu)

    appIcon.on('click', () => {
        if (isWindowShowing) return;
        mainWindow.show();
        isWindowShowing = true;
    });

    isWindowShowing = true;
}

app.whenReady().then(() => {
    const { screen } = require('electron');

    console.log("Is running in development:", isRunningInDev);

    console.log("Icon Path: ", iconPath);

    console.log("Is initial setup done: ", config.get("initialSetupDone"));

    wallpaper.get().then((path) => {
        config.set("lastWallpaper", path);
    });

    createWindow(screen);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
})

const downloadImage = function (imageUrl, imageName) {
    console.log("Downloading image:", imageUrl, imageName);
    const imagePath = path.join(config.getStoragePath(), `${imageName}.jpeg`);
    const fileStream = fs.createWriteStream(imagePath);
    return new Promise((resolve, reject) => {
        https.get(imageUrl, response => {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Image downloaded as ${imageName}`);
                wallpaper.set(imagePath, { scale: 'center' });
                resolve();
            });
        }).on('error', err => {
            fs.unlink(imagePath, () => {
                console.error(`Error downloading image: ${err.message}`);
                reject(err);
            });
        });
    });
}

const saveWallpaperToConfig = function (imageID, fileName, author, thumbnailLink) {
    const wallpaperData = {
        id: `${imageID}`,
        thumbnailLink: `${thumbnailLink}`,
        author: `${author}`,
        fileName: `${fileName}`
    };
    const wallpaperHistory = config.get("wallpaperHistory");
    wallpaperHistory.push(wallpaperData);
    config.set("wallpaperHistory", wallpaperHistory);
    wallpaper.get().then((path) => {
        config.set("lastWallpaper", path);
    });
    return wallpaperData;
}

const findAppIcon = function () {
    const iconPath = isRunningInDev
        ? path.join(path.dirname(__dirname), 'random-wallpaper/assets/tray-icon.png')
        : path.join(path.dirname(__dirname), 'app.asar/assets/tray-icon.png');
    return iconPath;
}