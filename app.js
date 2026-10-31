(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const feed = $("videoFeed");
  const DB_NAME = "vtik-pro-media";
  const STORE = "videos";
  let videos = [];
  let activeCommentId = null;
  let currentPage = "Home";
  let toastTimer;

  const demo = {
    id: "demo-1",
    username: "flcreator",
    displayName: "V-Tik creator",
    caption: "Ranking the best F1 donuts! ðŸŽï¸ðŸ”¥ #F1 #Formula1 #Motorsport",
    topic: "Trending",
    likes: 1300,
    comments: [],
    views: "1.3K",
    following: false,
    liked: false,
    saved: false,
    src: "videos/demo.mp4",
    demo: true
  };

  function notify(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbAction(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  }

  const readAllUploads = () => dbAction("readonly", store => store.getAll());
  const saveUpload = record => dbAction("readwrite", store => store.put(record));
  const removeUpload = id => dbAction("readwrite", store => store.delete(id));

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formatLikes(number) {
    if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
    if (number >= 1000) return (number / 1000).toFixed(1) + "K";
    return String(number);
  }

  function visibleVideos() {
    const query = $("searchInput").value.trim().toLowerCase();
    let list = [...videos];

    if (currentPage === "Liked") list = list.filter(video => video.liked);
    if (currentPage === "Saved") list = list.filter(video => video.saved);
    if (currentPage === "Following") list = list.filter(video => video.following);
    if (["Trending", "Music", "Gaming"].includes(currentPage)) {
      list = list.filter(video => video.topic.toLowerCase() === currentPage.toLowerCase());
    }
    if (query) {
      list = list.filter(video =>
        `${video.username} ${video.displayName} ${video.caption} ${video.topic}`.toLowerCase().includes(query)
      );
    }
    return list;
  }

  function render() {
    const list = visibleVideos();
    feed.innerHTML = "";
    $("feedLabel").textContent = currentPage === "Home" ? "For You" : currentPage;
    $("emptyState").classList.toggle("hidden", list.length > 0);

    list.forEach(video => {
      const card = document.createElement("article");
      card.className = "video-card";
      card.dataset.id = video.id;

      const source = video.objectUrl || video.src;
      card.innerHTML = `
        <div class="video-main">
          <div class="video-stage paused">
            <video src="${escapeHTML(source)}" playsinline preload="metadata"></video>
            <div class="video-overlay-play"><span>â–¶</span></div>
          </div>
          <div class="video-meta">
            <div class="creator-avatar">${escapeHTML((video.username || "V").slice(0,2).toUpperCase())}</div>
            <div class="creator-text">
              <p class="creator-name">@${escapeHTML(video.username)}</p>
              <span class="creator-handle">${escapeHTML(video.displayName || "V-Tik creator")}</span>
            </div>
            <button class="follow-button ${video.following ? "following" : ""}" data-action="follow">${video.following ? "Following" : "Follow"}</button>
          </div>
          <p class="video-caption">${escapeHTML(video.caption)}</p>
        </div>
        <div class="video-actions">
          <div class="action-wrap">
            <button class="action-button ${video.liked ? "active" : ""}" data-action="like" aria-label="Like video">${video.liked ? "â™¥" : "â™¡"}</button>
            <span class="action-count">${formatLikes(video.likes)}</span>
          </div>
          <div class="action-wrap">
            <button class="action-button" data-action="comment" aria-label="Comments">â˜°</button>
            <span class="action-count">${video.comments.length}</span>
          </div>
          <div class="action-wrap">
            <button class="action-button ${video.saved ? "active" : ""}" data-action="save" aria-label="Save video">â–¤</button>
            <span class="action-count">${video.saved ? "Saved" : "Save"}</span>
          </div>
          <div class="action-wrap">
            <button class="action-button" data-action="share" aria-label="Share video">â†—</button>
            <span class="action-count">Share</span>
          </div>
          ${video.demo ? "" : `<div class="action-wrap"><button class="action-button" data-action="delete" aria-label="Delete video">â‹¯</button><span class="action-count">More</span></div>`}
        </div>`;
      feed.appendChild(card);
    });
    setupVideoPlayback();
  }

  function setupVideoPlayback() {
    document.querySelectorAll(".video-stage video").forEach(video => {
      video.addEventListener("click", () => {
        const stage = video.closest(".video-stage");
        if (video.paused) {
          document.querySelectorAll(".video-stage video").forEach(other => {
            if (other !== video) {
              other.pause();
              other.closest(".video-stage")?.classList.add("paused");
            }
          });
          video.play().then(() => stage.classList.remove("paused")).catch(() => notify("Could not play this video."));
        } else {
          video.pause();
          stage.classList.add("paused");
        }
      });
      video.addEventListener("ended", () => video.closest(".video-stage")?.classList.add("paused"));
    });
  }

  function updateVideo(id, changes) {
    const video = videos.find(item => item.id === id);
    if (!video) return;
    Object.assign(video, changes);
    render();
  }

  feed.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest(".video-card");
    const video = videos.find(item => item.id === card?.dataset.id);
    if (!video) return;

    switch (button.dataset.action) {
      case "like":
        video.liked = !video.liked;
        video.likes = Math.max(0, video.likes + (video.liked ? 1 : -1));
        render();
        break;
      case "follow":
        video.following = !video.following;
        render();
        notify(video.following ? "Following creator" : "Unfollowed creator");
        break;
      case "save":
        video.saved = !video.saved;
        render();
        notify(video.saved ? "Video saved" : "Removed from saved");
        break;
      case "comment":
        activeCommentId = video.id;
        renderComments(video);
        $("commentsModal").classList.remove("hidden");
        break;
      case "share":
        try {
          if (navigator.share) await navigator.share({ title: "V-Tik video", text: video.caption, url: location.href });
          else if (navigator.clipboard) {
            await navigator.clipboard.writeText(location.href);
            notify("Link copied");
          } else notify("Sharing is not available in this browser.");
        } catch (error) {
          if (error.name !== "AbortError") notify("Could not share this video.");
        }
        break;
      case "delete":
        if (confirm("Delete this video from this browser?")) {
          if (video.objectUrl) URL.revokeObjectURL(video.objectUrl);
          videos = videos.filter(item => item.id !== video.id);
          if (!video.demo) await removeUpload(video.id).catch(() => {});
          render();
          notify("Video deleted");
        }
        break;
    }
  });

  function renderComments(video) {
    $("commentList").innerHTML = video.comments.length
      ? video.comments.map(comment => `<div class="comment-item"><b>@${escapeHTML(comment.username)}</b>${escapeHTML(comment.text)}</div>`).join("")
      : '<p class="creator-handle">Be the first to comment.</p>';
  }

  $("commentForm").addEventListener("submit", event => {
    event.preventDefault();
    const text = $("commentInput").value.trim();
    const video = videos.find(item => item.id === activeCommentId);
    if (!text || !video) return;
    video.comments.push({ username: "trippler", text });
    $("commentInput").value = "";
    renderComments(video);
    render();
  });

  function showModal(id) { $(id).classList.remove("hidden"); }
  function hideModal(id) { $(id).classList.add("hidden"); }

  $("openUpload").addEventListener("click", () => showModal("uploadModal"));
  $("mobileUpload").addEventListener("click", () => showModal("uploadModal"));
  $("emptyUpload").addEventListener("click", () => showModal("uploadModal"));
  $("topAvatar").addEventListener("click", () => notify("Profile section is ready to connect to your account system."));

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => hideModal(button.dataset.close));
  });
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) hideModal(modal.id);
    });
  });

  $("videoFile").addEventListener("change", () => {
    const file = $("videoFile").files[0];
    $("selectedFile").textContent = file ? file.name : "No video selected";
  });

  $("publishVideo").addEventListener("click", async () => {
    const file = $("videoFile").files[0];
    if (!file) return notify("Choose a video first.");
    if (!file.type.startsWith("video/")) return notify("Please choose a valid video file.");

    const record = {
      id: "upload-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      username: "trippler",
      displayName: "V-Tik creator",
      caption: $("videoCaption").value.trim() || "New video on V-Tik",
      topic: $("videoTopic").value,
      likes: 0,
      comments: [],
      views: "0",
      following: false,
      liked: false,
      saved: false,
      blob: file
    };

    try {
      await saveUpload(record);
      await loadVideos();
      $("videoFile").value = "";
      $("videoCaption").value = "";
      $("selectedFile").textContent = "No video selected";
      hideModal("uploadModal");
      notify("Your video was published on this browser.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      notify("Could not save this video. Try a smaller file or another browser.");
    }
  });

  $("searchInput").addEventListener("input", render);
  $("clearSearch").addEventListener("click", () => {
    $("searchInput").value = "";
    render();
    $("searchInput").focus();
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.page;
      document.querySelectorAll("[data-page]").forEach(item => item.classList.toggle("active", item === button));
      document.querySelectorAll(".mobile-nav button").forEach(item => item.classList.toggle("mobile-active", item === button));
      if (currentPage === "Profile") {
        currentPage = "Home";
        notify("Your profile can be connected to your account page.");
      }
      render();
    });
  });

  document.querySelectorAll("[data-topic]").forEach(button => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.topic;
      render();
    });
  });

  $("scrollUp").addEventListener("click", () => window.scrollBy({ top: -window.innerHeight * 0.85, behavior: "smooth" }));
  $("scrollDown").addEventListener("click", () => window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" }));

  async function loadVideos() {
    videos.forEach(video => { if (video.objectUrl) URL.revokeObjectURL(video.objectUrl); });
    const uploads = await readAllUploads().catch(() => []);
    videos = uploads.map(item => ({
      ...item,
      objectUrl: URL.createObjectURL(item.blob),
      comments: item.comments || []
    }));
    // Demo card is shown until the owner adds their own videos.
    if (!videos.length) videos.push({ ...demo, comments: [] });
    render();
  }

  loadVideos();
})();
