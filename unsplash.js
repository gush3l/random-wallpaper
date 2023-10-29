class UnsplashAPI {
    constructor(key) {
        this.validKey = false;
        this.key = key;
    }

    checkIfValidKey(key) {
        return new Promise((resolve, reject) => {
            fetch("https://api.unsplash.com/photos", {
                headers: {
                    'Authorization': `Client-ID ${key}`
                }
            })
            .then((response) => response.json())
            .then((json) => {
                if (json.errors != null) {
                    this.validKey = false;
                    resolve(false);
                }
                else {
                    this.validKey = true;
                    resolve(true);
                };
            });
        })
    }

    hasValidKey() {
        return this.validKey;
    }

    getApiKey() {
        return this.key;
    }

    fetchRandomImages() {
        return new Promise((resolve, reject) => {
            if (!this.validKey) resolve(false);
            fetch("https://api.unsplash.com/photos/random?query=wallpaper,gaming?orientation=landscape", {
                headers: {
                    'Authorization': `Client-ID ${this.key}`
                }
            })
            .then((response) => {
                if (response.status == 403) resolve("Rate-Limited")
                else response.json().then((json) => {
                    if (json.errors != null) {
                        this.validKey = false;
                        resolve(false);
                    }
                    else {
                        resolve(json);
                    };
                });
            });
        })
    }
}

module.exports = UnsplashAPI;