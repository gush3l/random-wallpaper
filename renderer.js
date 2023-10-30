let styles = {

    // Dark Mode
    "dark--background-level-0": "#121212",
    "dark--background-level-1": "#1E1E1E",
    "dark--background-level-2": "#242424",
    "dark--background-level-3": "#222222",
    "dark--background-level-4": "#2C2C2C",
    "dark--background-level-5": "#323232",
    "dark--text": "rgba(255,255,255,0.87)",
    "dark--subtext": "rgba(255,255,255,0.60)",
    "dark--sub-subtext": "rgba(255,255,255,0.38)",
    "dark--panel": "#222222",
    "dark--border": "rgba(255,255,255,0.09)",
    "dark--primary": "#2673DD",
    "dark--primary-sub": "rgba(38,115,221,0.3)",
    "dark--primary-sub-2": "rgba(38,115,221,0.14)",
    "dark--warning": "#B2B400",
    "dark--error": "#AB2B30",
    "dark--success": "#309D53",

    // Light Mode
    "light--background-level-0": "#F0F2F5",
    "light--background-level-1": "#F0F2F5",
    "light--background-level-2": "#F0F2F5",
    "light--background-level-3": "#F0F2F5",
    "light--background-level-4": "#F0F2F5",
    "light--background-level-5": "#F0F2F5",
    "light--text": "rgba(0,0,0,0.87)",
    "light--subtext": "rgba(0,0,0,0.60)",
    "light--sub-subtext": "rgba(0,0,0,0.38)",
    "light--panel": "#FAFAFA",
    "light--border": "#E8E8E8",
    "light--primary": "#2673DD",
    "light--primary-sub": "rgba(38,115,221,0.2)",
    "light--primary-sub-2": "rgba(38,115,221,0.05)",
    "light--warning": "#FFB800",
    "light--error": "#EE2C4A",
    "light--success": "#44DC77",

    // Mode Tracking
    isDarkMode: true, // Set to true for dark mode, false for light mode
};

let showingError = false;

let configData = null;

let storagePath = null;

function updateStyles() {
    const root = document.documentElement;

    for (const property in styles) {
        if (property.startsWith(styles.isDarkMode ? 'light' : 'dark')) {
            root.style.setProperty(`${property.replace(styles.isDarkMode ? "light" : "dark", "")}`, styles[property]);
        }
    }
    styles.isDarkMode = !styles.isDarkMode;
}

document.onreadystatechange = (_) => {
    if (document.readyState == "complete") {
        handleWindowControls();
    }
};

window.onbeforeunload = (_) => {
    remoteWindow.removeAllListeners();
}

function handleWindowControls() {
    document.getElementById('min-button').addEventListener("click", _ => {
        ipcRenderer.send('minimize');
    });

    document.getElementById('setup-check-api-key').addEventListener("click", _ => {
        let apiKeyInput = document.getElementById('accessKeyInput').value;
        sendUnsplashAPIKey(apiKeyInput);
        document.getElementById('setup-check-api-key').textContent = "Loading"
    });
}

function sendUnsplashAPIKey(key) {
    console.log(`Changed API key: ${key}`)
    ipcRenderer.send('unsplashAPIKey', key);
}

window.ipcRendererListener.apiKeyResponse((_, response) => {
    if (response) {
        document.getElementById('setup-check-api-key').textContent = "Valid!";
        document.getElementById('setup-check-api-key').style.background = "var(--success)";
        document.getElementById('accessKeyInput').style.border = "3px solid var(--success)";
        setTimeout(() => {
            document.querySelector('setup').style.opacity = "0%";
            document.querySelector('setup').style.pointerEvents = "none";
            ipcRenderer.send('setup-done');
        }, 1000)
    }
    else {
        document.getElementById('setup-check-api-key').textContent = "Done!";
        document.getElementById('accessKeyInput').style.border = "3px solid var(--error)";
    }
})

window.ipcRendererListener.isSetupDone((_, response) => {
    if (response[0]) {
        document.querySelector('setup').style.transition = "none";
        document.querySelector('setup').style.opacity = "0%";
        document.querySelector('setup').style.pointerEvents = "none";
        document.querySelector('nav-bar').setAttribute("currentTab", "home");
        ipcRenderer.send("retrieve-current-config");
        setTimeout(() => {
            document.getElementById("random-fetched-image").src = configData.lastWallpaper;
            document.getElementById("random-fetched-image-author").innerHTML = `Currently set wallpaper`;
            document.getElementById("random-fetched-image-link").setAttribute('link', configData.lastWallpaper);
        }, 50);
    }

    storagePath = response[1];
})

window.ipcRendererListener.fetchedRandomImage((_, response) => {
    if (response == "Rate-Limited") {
        console.log("Rate-Limited!");
        showThumbnailError("Rate-limited, try again later!");
        return;
    }
    if (response == false) {
        console.log("Invalid API key!");
        showThumbnailError("Invalid API key, check your settings!");
        return;
    }
    document.getElementById("random-fetched-image").src = response["urls"]["small_s3"];
    document.getElementById("random-fetched-image-author").innerHTML = `<i class="fa-solid fa-at"></i> ${response["user"]["name"]} (${response["user"]["username"]})`;
    document.getElementById("random-fetched-image-link").setAttribute('link', response["links"]["html"]);
    setWallpaper(response["urls"]["full"], response["id"], false);
    saveImageToConfig(response["id"], "./data/wallpapers/" + response["id"] + ".jpeg", `${response["user"]["name"]} (${response["user"]["username"]})`, response["urls"]["small_s3"]);
})

window.ipcRendererListener.getCurrentConfig((_, response) => {
    configData = response;
    styles.isDarkMode = !configData.isDarkMode;
    document.getElementById('theme-select').value = configData.isDarkMode ? 'dark' : 'light'; 
    updateStyles();
    document.getElementById('accessKeyInputSettings').value = configData.unsplashAPIKey;
    updateWallpaperGrid();
});

function showThumbnailError(errorMessage) {
    if (showingError) return;
    document.getElementById("random-fetched-image-overlay-message").innerHTML = `<i class="fa-solid fa-ban"></i> ${errorMessage}`
    document.getElementById("random-fetched-image-overlay-message").style.color = 'var(--error)'
    showingError = true
    setTimeout(() => {
        document.getElementById("random-fetched-image-overlay-message").innerHTML = '<i class="fa-solid fa-image"></i> Click to get a random wallpaper!'
        document.getElementById("random-fetched-image-overlay-message").style.color = 'var(--text)'
        showingError = false;
    }, 1500)
}

function checkIfSetupIsDone() {
    ipcRenderer.send('is-setup-done-main');
}

checkIfSetupIsDone();

function fetchImages() {
    ipcRenderer.send('fetch-images');
}

function setWallpaper(imageURL, imageName, isLocal) {
    ipcRenderer.send("set-wallpaper", imageURL, imageName, isLocal)
}

function setWallpaperFromGrid(element) {
    let imageID = element.getAttribute("image-id");
    for (let i = 0; i < configData.wallpaperHistory.length; i++) {
        if (configData.wallpaperHistory[i].id == imageID) {
            console.log(`Found the image with id ${configData.wallpaperHistory[i].id}`);
            setWallpaper(storagePath.concat(`\\${imageID}.jpeg`), imageID, true);
            configData.lastWallpaper = storagePath.concat(`\\${imageID}.jpeg`);
            document.getElementById("random-fetched-image").src = configData.lastWallpaper;
            document.getElementById("random-fetched-image-author").innerHTML = `<i class="fa-solid fa-at"></i> ${configData.wallpaperHistory[i].author}`;
            document.getElementById("random-fetched-image-link").setAttribute('link', configData.lastWallpaper);
            return;
        }
    }
}

function saveImageToConfig(imageID, fileName, author, thumbnailLink) {
    const wallpaperData = {
        id: `${imageID}`,
        thumbnailLink: `${thumbnailLink}`,
        author: `${author}`,
        fileName: `${fileName}`
    };
    configData.wallpaperHistory.push(wallpaperData);
    ipcRenderer.send("add-image-to-config", imageID, fileName, author, thumbnailLink);
    updateWallpaperGrid();
}

function copyLinkToClipboard() {
    let button = document.getElementById('random-fetched-image-link');
    navigator.clipboard.writeText(button.getAttribute('link'));
    button.style.background = 'var(--success)'
    button.innerHTML = '<i class="fa-solid fa-check"></i> Copied to the clipboard!';
    setTimeout(() => {
        button.innerHTML = '<i class="fa-solid fa-clipboard"></i> Image Link';
        button.style.background = ''
    }, 1000);
}

function restoreWallpaper() {
    ipcRenderer.send("restore-wallpaper");
    ipcRenderer.send("retrieve-current-config");
    setTimeout(() => {
        console.log("Restore wallpaper client!");
        document.getElementById("random-fetched-image").src = configData.lastWallpaper;
        document.getElementById("random-fetched-image-author").innerHTML = `Restored to the last set Wallpaper`;
        document.getElementById("random-fetched-image-link").setAttribute('link', configData.lastWallpaper);
    }, 50);
}

function handleNavBar(tab) {
    document.querySelector('nav-bar').setAttribute("currentTab", tab);
    if (tab == "settings") {
        document.querySelector('settings').style.opacity = '100%';
        document.querySelector('settings').style.pointerEvents = 'auto';
    }
    else if (tab == "home") {
        document.querySelector('settings').style.opacity = '0%';
        document.querySelector('settings').style.pointerEvents = 'none';
    }
}

function saveSettings() {
    sendUnsplashAPIKey(document.getElementById('accessKeyInputSettings').value);
    ipcRenderer.send("update-style",styles.isDarkMode);
}

function updateWallpaperGrid() {
    console.log("Update Wallpaper Grid")
    document.getElementById('wallpaper-grid').innerHTML = '';
    for (let counter = 0;counter < configData.wallpaperHistory.length; counter++) {
        let imageHistoryEl = `<div class='wallpaper-history' id='wallpaper-history-${counter}' image-id='${configData.wallpaperHistory[counter].id}' onclick='setWallpaperFromGrid(document.getElementById("wallpaper-history-${counter}"))'><span id='wallpaper-history-image-overlay-message' class='wallpaper-history-image-overlay-message'><i class='fa-solid fa-image'></i> Click to set!</span><div class='wallpaper-history-overlay'></div><img class='wallpaper-history-image' src='${configData.wallpaperHistory[counter].thumbnailLink}'></div>`
        document.getElementById('wallpaper-grid').innerHTML += imageHistoryEl;
    }
}