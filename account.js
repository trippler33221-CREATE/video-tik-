
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const DB_NAME = "vtik-pro-media";
    const STORE = "videos";

    let currentUser = null;
    let objectUrls = [];

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem("users")) || [];
        } catch {
            return [];
        }
    }

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem("loggedInUser"));
        } catch {
            return null;
        }
    }

    function notify(message, success = false) {
        const element = $("authMessage");

        if (!element) return;

        element.textContent = message;
        element.style.color = success ? "#35d07f" : "#ff6b80";
    }

    function logout() {
        if (!confirm("Are you sure you want to log out?")) return;

        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
    }

    $("logoutBtn")?.addEventListener("click", logout);

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE)) {
                    request.result.createObjectStore(STORE, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getUploads() {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const request = tx.objectStore(STORE).getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
                db.close();
            };

            request.onerror = () => {
                reject(request.error);
                db.close();
            };
        });
    }

    function displayProfile() {
        currentUser = getCurrentUser();

        if (!currentUser) {
            $("profileName").textContent = "Guest account";
            $("profileHandle").textContent = "@vtikguest";

            if ($("profileAvatar")) {
                $("profileAvatar").textContent = "VT";
            }

            return;
        }

        const username = currentUser.username || "Guest";

        $("profileName").textContent =
            currentUser.displayName || username;

        $("profileHandle").textContent = "@" + username;

        $("profileAvatar").textContent =
            username.substring(0, 2).toUpperCase();
    }

    async function displayVideos() {
        if (!currentUser) return;

        const container = $("profileVideos");
        const empty = $("noProfileVideos");

        try {
            const uploads = await getUploads();

            const myVideos = uploads.filter(video =>
                video.ownerId === currentUser.id && video.blob
            );

            $("videoCount").textContent = myVideos.length;

            const interactionKey =
                "vtik-video-interactions-" + currentUser.id;

            let interactions = {};

            try {
                interactions = JSON.parse(
                    localStorage.getItem(interactionKey) || "{}"
                );
            } catch {}

            $("savedCount").textContent = Object.values(interactions)
                .filter(item => item.saved).length;

            container.innerHTML = "";

            if (!myVideos.length) {
                empty.classList.remove("hidden");
                return;
            }

            empty.classList.add("hidden");

            myVideos.forEach(video => {
                const url = URL.createObjectURL(video.blob);
                objectUrls.push(url);

                const card = document.createElement("article");
                card.className = "profile-video-card";

                const player = document.createElement("video");
                player.src = url;
                player.controls = true;
                player.playsInline = true;
                player.preload = "metadata";

                const caption = document.createElement("p");
                caption.textContent = video.caption || "My video";

                card.append(player, caption);
                container.appendChild(card);
            });

        } catch (error) {
            console.error(error);
            notify("Could not load your videos.");
        }
    }

    $("accountForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const username = $("username").value.trim();
        const password = $("password").value;

        if (username.length < 3 || password.length < 4) {
            notify("Enter a valid username and password.");
            return;
        }

        const users = getUsers();

        const account = users.find(user =>
            user.username === username
        );

        if (account) {
            if (account.password !== password) {
                notify("Incorrect password.");
                return;
            }

            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(account)
            );

            notify("Welcome back!", true);

        } else {
            const newUser = {
                id: Date.now().toString(),
                username,
                email: username + "@vtik.local",
                password,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);

            localStorage.setItem("users", JSON.stringify(users));

            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(newUser)
            );

            notify("Account created successfully!", true);
        }

        setTimeout(() => {
            window.location.reload();
        }, 700);
    });

    $("profileInbox")?.addEventListener("click", () => {
        alert("Your V-Tik inbox is coming soon!");
    });

    displayProfile();

    if (currentUser) {
        displayVideos();
    }

    window.addEventListener("beforeunload", () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    });

})();
