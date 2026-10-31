
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const feed = $("videoFeed");

    if (!feed) {
        console.error("V-Tik: videoFeed element not found.");
        return;
    }

    /* =================================
       USER AUTHENTICATION
    ================================= */

    let currentUser = null;

    try {
        currentUser = JSON.parse(
            localStorage.getItem("loggedInUser") || "null"
        );
    } catch (error) {
        currentUser = null;
    }

    if (!currentUser || !currentUser.id || !currentUser.username) {
        window.location.href = "login.html";
        return;
    }

    const DB_NAME = "vtik-pro-media";
    const STORE = "videos";

    // Each account has separate interactions.
    const INTERACTION_KEY =
        "vtik-video-interactions-" + currentUser.id;

    let videos = [];
    let activeCommentId = null;
    let currentPage = "Home";
    let toastTimer;
    let videoObserver = null;
    let userHasInteracted = false;
    let scrollTimer = null;

    /* =================================
       CURRENT USER
    ================================= */

    function getUsername() {
        return currentUser.username;
    }

    function getDisplayName() {
        return currentUser.displayName || currentUser.username;
    }

    function logout() {
        if (!confirm("Are you sure you want to log out?")) {
            return;
        }

        localStorage.removeItem("loggedInUser");

        window.location.href = "login.html";
    }

    // Support different possible logout button IDs.
    ["logoutButton", "logoutBtn", "topLogout"].forEach(id => {
        $(id)?.addEventListener("click", logout);
    });

    // Clicking the avatar opens the account page.
    $("topAvatar")?.addEventListener("click", () => {
        window.location.href = "accounts.html";
    });

    /* =================================
       DEMO VIDEOS
    ================================= */

    const demoVideos = [
        {
            id: "demo-2",
            username: "musicstar",
            displayName: "Music lover",
            caption: "Enjoy the latest music vibes! 🎵🔥 #Music #Vibes",
            topic: "Music",
            likes: 2500,
            comments: [],
            views: "2.5K",
            following: false,
            liked: false,
            saved: false,
            src: "fik logogo (1).mp4",
            demo: true
        },
        {
            id: "demo-3",
            username: "gamerpro",
            displayName: "Gaming creator",
            caption: "Watch this amazing gaming moment! 🎮🔥 #Gaming",
            topic: "Gaming",
            likes: 980,
            comments: [],
            views: "980",
            following: false,
            liked: false,
            saved: false,
            src: "fik logogo (1).mp4",
            demo: true
        },
        {
            id: "demo-4",
            username: "trendking",
            displayName: "Trending creator",
            caption: "You won't believe what happens next! 😂🔥 #Trending",
            topic: "Trending",
            likes: 5400,
            comments: [],
            views: "5.4K",
            following: false,
            liked: false,
            saved: false,
            src: "fik logogo (1).mp4",
            demo: true
        },
        {
            id: "demo-5",
            username: "sportszone",
            displayName: "Sports creator",
            caption: "Unbelievable football skills! ⚽🔥 #Football #Sports",
            topic: "Trending",
            likes: 3200,
            comments: [],
            views: "3.2K",
            following: false,
            liked: false,
            saved: false,
            src: "fik logogo (1).mp4",
            demo: true
        }
    ];

    /* =================================
       NOTIFICATIONS
    ================================= */

    function notify(message) {
        const el = $("toast");

        if (!el) {
            console.log(message);
            return;
        }

        el.textContent = message;
        el.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            el.classList.remove("show");
        }, 2400);
    }

    /* =================================
       INTERACTION STORAGE
    ================================= */

    function getInteractions() {
        try {
            return JSON.parse(
                localStorage.getItem(INTERACTION_KEY) || "{}"
            );
        } catch {
            return {};
        }
    }

    function saveInteractions() {
        const data = {};

        videos.forEach(video => {
            data[video.id] = {
                liked: video.liked,
                saved: video.saved,
                following: video.following,
                likes: video.likes,
                comments: video.comments
            };
        });

        try {
            localStorage.setItem(
                INTERACTION_KEY,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error(error);
            notify("Storage is full. Changes may not be saved.");
        }
    }

    function restoreInteractions() {
        const data = getInteractions();

        videos.forEach(video => {
            const saved = data[video.id];

            if (saved) {
                video.liked = saved.liked ?? false;
                video.saved = saved.saved ?? false;
                video.following = saved.following ?? false;
                video.likes = saved.likes ?? video.likes;
                video.comments = saved.comments ?? video.comments;
            }
        });
    }

    /* =================================
       INDEXEDDB
    ================================= */

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB unavailable"));
                return;
            }

            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async function dbAction(mode, action) {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const store = tx.objectStore(STORE);
            const request = action(store);

            let result;

            request.onsuccess = () => {
                result = request.result;
            };

            request.onerror = () => {
                db.close();
                reject(request.error);
            };

            tx.oncomplete = () => {
                db.close();
                resolve(result);
            };

            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };

            tx.onabort = () => {
                db.close();
                reject(tx.error || new Error("Transaction aborted"));
            };
        });
    }

    const readAllUploads = () =>
        dbAction("readonly", store => store.getAll());

    const saveUpload = record =>
        dbAction("readwrite", store => store.put(record));

    const removeUpload = id =>
        dbAction("readwrite", store => store.delete(id));

    /* =================================
       FORMATTING
    ================================= */

    function escapeHTML(value = "") {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function formatLikes(number) {
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + "M";
        }

        if (number >= 1000) {
            return (number / 1000).toFixed(1) + "K";
        }

        return String(number);
    }

    /* =================================
       FILTER VIDEOS
    ================================= */

    function visibleVideos() {
        const query =
            $("searchInput")?.value.trim().toLowerCase() || "";

        let list = [...videos];

        if (currentPage === "Liked") {
            list = list.filter(video => video.liked);
        }

        if (currentPage === "Saved") {
            list = list.filter(video => video.saved);
        }

        if (currentPage === "Following") {
            list = list.filter(video => video.following);
        }

        if (currentPage === "My Videos") {
            list = list.filter(video =>
                video.ownerId === currentUser.id
            );
        }

        if (["Trending", "Music", "Gaming"].includes(currentPage)) {
            list = list.filter(video =>
                video.topic.toLowerCase() === currentPage.toLowerCase()
            );
        }

        if (query) {
            list = list.filter(video =>
                `${video.username} ${video.displayName} ${video.caption} ${video.topic}`
                    .toLowerCase()
                    .includes(query)
            );
        }

        return list;
    }

    /* =================================
       STOP ALL VIDEOS
    ================================= */

    function stopAllVideos() {
        document.querySelectorAll(".video-stage video").forEach(video => {
            video.pause();

            video.closest(".video-stage")?.classList.add("paused");
        });
    }

    function stopOtherVideos(currentVideo) {
        document.querySelectorAll(".video-stage video").forEach(other => {
            if (other !== currentVideo) {
                other.pause();

                other.closest(".video-stage")
                    ?.classList.add("paused");
            }
        });
    }

    /* =================================
       VIDEO PLAYBACK
    ================================= */

    async function playVideo(video) {
        if (!video) return;

        const stage = video.closest(".video-stage");

        stopOtherVideos(video);

        video.muted = !userHasInteracted;
        video.volume = 1;

        try {
            await video.play();

            stage?.classList.remove("paused");
        } catch (error) {
            stage?.classList.add("paused");

            console.log("Playback waiting for interaction:", error);
        }
    }

    function setupVideoPlayback() {
        if (videoObserver) {
            videoObserver.disconnect();
        }

        if (!("IntersectionObserver" in window)) {
            return;
        }

        videoObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;

                if (
                    entry.isIntersecting &&
                    entry.intersectionRatio >= 0.75
                ) {
                    playVideo(video);
                } else {
                    video.pause();

                    video.closest(".video-stage")
                        ?.classList.add("paused");
                }
            });
        }, {
            threshold: [0, 0.25, 0.5, 0.75, 1]
        });

        document.querySelectorAll(".video-stage video").forEach(video => {
            video.playsInline = true;
            video.loop = true;

            videoObserver.observe(video);

            video.addEventListener("click", async () => {
                userHasInteracted = true;

                if (video.paused) {
                    video.muted = false;
                    await playVideo(video);
                } else {
                    video.pause();

                    video.closest(".video-stage")
                        ?.classList.add("paused");
                }
            });

            video.addEventListener("error", () => {
                console.error("Video could not load:", video.src);
            });
        });
    }

    /* =================================
       RENDER VIDEO FEED
    ================================= */

    function render() {
        const list = visibleVideos();

        stopAllVideos();

        feed.innerHTML = "";

        if ($("feedLabel")) {
            $("feedLabel").textContent =
                currentPage === "Home" ? "For You" : currentPage;
        }

        if ($("emptyState")) {
            $("emptyState").classList.toggle(
                "hidden",
                list.length > 0
            );
        }

        list.forEach(video => {
            const card = document.createElement("article");

            card.className = "video-card";
            card.dataset.id = video.id;

            const source = video.objectUrl || video.src;

            const canDelete =
                !video.demo && video.ownerId === currentUser.id;

            card.innerHTML = `
                <div class="video-main">

                    <div class="video-stage paused">

                        <video
                            src="${escapeHTML(source)}"
                            playsinline
                            webkit-playsinline
                            preload="metadata"
                            loop
                            disablepictureinpicture>
                        </video>

                        <div class="video-overlay-play">
                            <span>▶</span>
                        </div>

                    </div>

                    <div class="video-meta">

                        <div class="creator-avatar">
                            ${escapeHTML(
                                (video.username || "V")
                                    .slice(0, 2)
                                    .toUpperCase()
                            )}
                        </div>

                        <div class="creator-text">

                            <p class="creator-name">
                                @${escapeHTML(video.username)}
                            </p>

                            <span class="creator-handle">
                                ${escapeHTML(video.displayName || "V-Tik creator")}
                            </span>

                        </div>

                        <button
                            class="follow-button ${video.following ? "following" : ""}"
                            data-action="follow">
                            ${video.following ? "Following" : "Follow"}
                        </button>

                    </div>

                    <p class="video-caption">
                        ${escapeHTML(video.caption)}
                    </p>

                </div>

                <div class="video-actions">

                    <div class="action-wrap">
                        <button
                            class="action-button like-button ${video.liked ? "active" : ""}"
                            data-action="like"
                            aria-label="Like video">
                            ${video.liked ? "♥" : "♡"}
                        </button>

                        <span class="action-count">
                            ${formatLikes(video.likes)}
                        </span>
                    </div>

                    <div class="action-wrap">
                        <button
                            class="action-button"
                            data-action="comment">
                            💬
                        </button>

                        <span class="action-count">
                            ${video.comments.length}
                        </span>
                    </div>

                    <div class="action-wrap">
                        <button
                            class="action-button save-button ${video.saved ? "active" : ""}"
                            data-action="save">
                            ${video.saved ? "🔖" : "♧"}
                        </button>

                        <span class="action-count">
                            ${video.saved ? "Saved" : "Save"}
                        </span>
                    </div>

                    <div class="action-wrap">
                        <button
                            class="action-button"
                            data-action="share">
                            ↗
                        </button>

                        <span class="action-count">Share</span>
                    </div>

                    ${canDelete ? `
                        <div class="action-wrap">
                            <button
                                class="action-button"
                                data-action="delete">
                                ⋯
                            </button>

                            <span class="action-count">More</span>
                        </div>
                    ` : ""}

                </div>
            `;

            feed.appendChild(card);
        });

        setupVideoPlayback();
    }

    /* =================================
       SCROLLING ONE VIDEO AT A TIME
    ================================= */

    function getNearestCardIndex() {
        const cards = [...feed.querySelectorAll(".video-card")];

        if (!cards.length) return -1;

        const feedTop = feed.getBoundingClientRect().top;

        let nearestIndex = 0;
        let smallestDistance = Infinity;

        cards.forEach((card, index) => {
            const distance = Math.abs(
                card.getBoundingClientRect().top - feedTop
            );

            if (distance < smallestDistance) {
                smallestDistance = distance;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }

    function scrollVideo(direction) {
        const cards = [...feed.querySelectorAll(".video-card")];

        if (!cards.length) {
            notify("No videos available.");
            return;
        }

        const currentIndex = getNearestCardIndex();

        const nextIndex = Math.max(
            0,
            Math.min(cards.length - 1, currentIndex + direction)
        );

        const feedTop = feed.getBoundingClientRect().top;

        const targetPosition =
            feed.scrollTop +
            cards[nextIndex].getBoundingClientRect().top -
            feedTop;

        feed.scrollTo({
            top: targetPosition,
            behavior: "smooth"
        });
    }

    $("scrollUp")?.addEventListener("click", () => {
        scrollVideo(-1);
    });

    $("scrollDown")?.addEventListener("click", () => {
        scrollVideo(1);
    });

    document.querySelectorAll(".scroll-up").forEach(button => {
        button.addEventListener("click", () => scrollVideo(-1));
    });

    document.querySelectorAll(".scroll-down").forEach(button => {
        button.addEventListener("click", () => scrollVideo(1));
    });

    function enableOneVideoScrolling() {
        feed.style.scrollSnapType = "y mandatory";

        feed.addEventListener("scroll", () => {
            clearTimeout(scrollTimer);

            stopAllVideos();

            scrollTimer = setTimeout(() => {
                const cards = [
                    ...feed.querySelectorAll(".video-card")
                ];

                let bestCard = null;
                let bestVisibility = 0;

                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();

                    const feedRect = feed.getBoundingClientRect();

                    const visibleTop = Math.max(rect.top, feedRect.top);
                    const visibleBottom = Math.min(rect.bottom, feedRect.bottom);

                    const visibleHeight = Math.max(
                        0,
                        visibleBottom - visibleTop
                    );

                    if (visibleHeight > bestVisibility) {
                        bestVisibility = visibleHeight;
                        bestCard = card;
                    }
                });

                if (bestCard) {
                    const video = bestCard.querySelector("video");

                    if (video && bestVisibility > 0) {
                        playVideo(video);
                    }
                }
            }, 180);

        }, { passive: true });
    }

    /* =================================
       SOUND UNLOCK
    ================================= */

    function unlockVideoSound() {
        userHasInteracted = true;

        const visibleVideo = [
            ...document.querySelectorAll(".video-stage video")
        ].find(video => {
            const rect = video.getBoundingClientRect();

            const visibleHeight =
                Math.min(rect.bottom, window.innerHeight) -
                Math.max(rect.top, 0);

            return visibleHeight >= rect.height * 0.6;
        });

        if (visibleVideo) {
            visibleVideo.muted = false;

            if (visibleVideo.paused) {
                playVideo(visibleVideo);
            }
        }
    }

    document.addEventListener("pointerdown", unlockVideoSound, {
        once: true,
        capture: true
    });

    document.addEventListener("keydown", unlockVideoSound, {
        once: true
    });

    /* =================================
       LIKE
    ================================= */

    function toggleLike(video) {
        video.liked = !video.liked;

        video.likes = Math.max(
            0,
            video.likes + (video.liked ? 1 : -1)
        );

        saveInteractions();
        render();

        notify(video.liked ? "❤️ Video liked!" : "Like removed");
    }

    /* =================================
       SAVE VIDEO
    ================================= */

    function toggleSave(video) {
        video.saved = !video.saved;

        saveInteractions();
        render();

        notify(
            video.saved
                ? "🔖 Video added to Saved!"
                : "Video removed from Saved"
        );
    }

    /* =================================
       COMMENTS
    ================================= */

    function openComments(video) {
        activeCommentId = video.id;

        if ($("commentsTitle")) {
            $("commentsTitle").textContent =
                `Comments (${video.comments.length})`;
        }

        renderComments(video);

        $("commentsModal")?.classList.remove("hidden");
        $("commentInput")?.focus();
    }

    function renderComments(video) {
        const commentList = $("commentList");

        if (!commentList) return;

        if ($("commentsTitle")) {
            $("commentsTitle").textContent =
                `Comments (${video.comments.length})`;
        }

        if (!video.comments.length) {
            commentList.innerHTML = `
                <p class="creator-handle">
                    No comments yet. Be the first to comment!
                </p>
            `;
            return;
        }

        commentList.innerHTML = video.comments.map(comment => `
            <div class="comment-item">
                <b>@${escapeHTML(comment.username)}</b>
                ${escapeHTML(comment.text)}
            </div>
        `).join("");
    }

    $("commentForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const text = $("commentInput")?.value.trim();

        const video = videos.find(
            item => item.id === activeCommentId
        );

        if (!text || !video) return;

        video.comments.push({
            username: getUsername(),
            text,
            date: new Date().toISOString()
        });

        $("commentInput").value = "";

        saveInteractions();
        renderComments(video);

        notify("Comment posted!");
    });

    /* =================================
       SHARE
    ================================= */

    async function shareVideo(video) {
        const shareURL = new URL(window.location.href);

        shareURL.hash =
            "video-" + encodeURIComponent(video.id);

        const shareData = {
            title: "Watch on V-Tik",
            text: video.caption,
            url: shareURL.href
        };

        try {
            if (
                navigator.share &&
                navigator.canShare?.(shareData)
            ) {
                await navigator.share(shareData);
                notify("Share menu opened!");
            } else if (
                navigator.clipboard &&
                window.isSecureContext
            ) {
                await navigator.clipboard.writeText(shareURL.href);
                notify("Video link copied!");
            } else {
                const input = document.createElement("textarea");

                input.value = shareURL.href;
                document.body.appendChild(input);
                input.select();

                const copied = document.execCommand("copy");

                input.remove();

                notify(
                    copied
                        ? "Video link copied!"
                        : "Could not copy link."
                );
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                notify("Could not share this video.");
            }
        }
    }

    /* =================================
       FOLLOW
    ================================= */

    function toggleFollow(video) {
        video.following = !video.following;

        saveInteractions();
        render();

        notify(
            video.following
                ? "Following creator!"
                : "Unfollowed creator"
        );
    }

    /* =================================
       DELETE VIDEO
    ================================= */

    async function deleteVideo(video) {
        // Users can only delete videos they own.
        if (video.ownerId !== currentUser.id) {
            notify("You can only delete your own videos.");
            return;
        }

        if (!confirm("Are you sure you want to delete this video?")) {
            return;
        }

        if (video.objectUrl) {
            URL.revokeObjectURL(video.objectUrl);
        }

        videos = videos.filter(item => item.id !== video.id);

        await removeUpload(video.id).catch(error => {
            console.error(error);
        });

        saveInteractions();
        render();

        notify("Video deleted successfully!");
    }

    /* =================================
       VIDEO BUTTON EVENTS
    ================================= */

    feed.addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const card = button.closest(".video-card");

        const video = videos.find(
            item => item.id === card?.dataset.id
        );

        if (!video) return;

        switch (button.dataset.action) {
            case "like":
                toggleLike(video);
                break;

            case "comment":
                openComments(video);
                break;

            case "save":
                toggleSave(video);
                break;

            case "share":
                await shareVideo(video);
                break;

            case "follow":
                toggleFollow(video);
                break;

            case "delete":
                await deleteVideo(video);
                break;
        }
    });

    /* =================================
       MODALS
    ================================= */

    function showModal(id) {
        $(id)?.classList.remove("hidden");
    }

    function hideModal(id) {
        $(id)?.classList.add("hidden");
    }

    $("openUpload")?.addEventListener("click", () => {
        showModal("uploadModal");
    });

    $("mobileUpload")?.addEventListener("click", () => {
        showModal("uploadModal");
    });

    $("emptyUpload")?.addEventListener("click", () => {
        showModal("uploadModal");
    });

    document.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => {
            hideModal(button.dataset.close);
        });
    });

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                hideModal(modal.id);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideModal("uploadModal");
            hideModal("commentsModal");
        }
    });

    /* =================================
       UPLOAD VIDEO
    ================================= */

    $("videoFile")?.addEventListener("change", () => {
        const file = $("videoFile").files[0];

        if ($("selectedFile")) {
            $("selectedFile").textContent =
                file ? file.name : "No video selected";
        }
    });

    $("publishVideo")?.addEventListener("click", async () => {
        const file = $("videoFile")?.files[0];

        if (!file) {
            return notify("Choose a video first.");
        }

        if (!file.type.startsWith("video/")) {
            return notify("Please choose a valid video file.");
        }

        const record = {
            id: "upload-" + Date.now() + "-" +
                Math.random().toString(16).slice(2),

            username: getUsername(),
            displayName: getDisplayName(),

            // Ownership connects the video to its creator.
            ownerId: currentUser.id,

            caption: $("videoCaption")?.value.trim() ||
                "New video on V-Tik",

            topic: $("videoTopic")?.value || "Trending",

            likes: 0,
            comments: [],
            views: "0",

            following: false,
            liked: false,
            saved: false,

            blob: file,
            createdAt: new Date().toISOString()
        };

        try {
            await saveUpload(record);

            await loadVideos();

            $("videoFile").value = "";

            if ($("videoCaption")) {
                $("videoCaption").value = "";
            }

            if ($("selectedFile")) {
                $("selectedFile").textContent = "No video selected";
            }

            hideModal("uploadModal");

            notify("Your video was published!");

            feed.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {
            console.error(error);

            notify("Could not save this video. Try a smaller file.");
        }
    });

    /* =================================
       SEARCH
    ================================= */

    $("searchInput")?.addEventListener("input", render);

    $("clearSearch")?.addEventListener("click", () => {
        $("searchInput").value = "";

        render();

        $("searchInput").focus();
    });

    /* =================================
       NAVIGATION
    ================================= */

    document.querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", () => {
            currentPage = button.dataset.page;

            if (currentPage === "Profile") {
                window.location.href = "accounts.html";
                return;
            }

            if (currentPage === "My Videos") {
                currentPage = "My Videos";
            }

            document.querySelectorAll("[data-page]").forEach(item => {
                const active = item.dataset.page === currentPage;

                item.classList.toggle("active", active);
                item.classList.toggle("mobile-active", active);
            });

            render();

            feed.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });

    document.querySelectorAll("[data-topic]").forEach(button => {
        button.addEventListener("click", () => {
            currentPage = button.dataset.topic;

            render();

            feed.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });

    /* =================================
       LOAD USER VIDEOS
    ================================= */

    async function loadVideos() {
        stopAllVideos();

        videos.forEach(video => {
            if (video.objectUrl) {
                URL.revokeObjectURL(video.objectUrl);
            }
        });

        const uploads = await readAllUploads().catch(error => {
            console.error("Could not load videos:", error);
            return [];
        });

        // Only show videos belonging to this account.
        const myUploads = uploads.filter(item =>
            item.ownerId === currentUser.id && item.blob
        );

        const uploadedVideos = myUploads.map(item => ({
            ...item,
            objectUrl: URL.createObjectURL(item.blob),
            comments: item.comments || []
        }));

        videos = [
            ...uploadedVideos,
            ...demoVideos.map(video => ({
                ...video,
                comments: [...video.comments]
            }))
        ];

        restoreInteractions();

        render();
    }

    /* =================================
       START V-TIK
    ================================= */

    enableOneVideoScrolling();

    loadVideos().catch(error => {
        console.error("V-Tik could not start:", error);
        notify("Could not load V-Tik videos.");
    });

})();
