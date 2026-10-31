
(() => {
  "use strict";

  // =====================================
  // V-TIK PRO - MAIN APPLICATION
  // =====================================

  const $ = id => document.getElementById(id);

  const STORAGE_KEY = "vtik_posts_v1";
  const LIKES_KEY = "vtik_likes_v1";
  const SAVES_KEY = "vtik_saves_v1";
  const COMMENTS_KEY = "vtik_comments_v1";
  const SESSION_KEY = "vtik_current_user";

  let posts = [];
  let currentCommentPost = null;
  let pendingVideoUrl = null;
  let pendingVideoFile = null;

  // =====================================
  // DEMO VIDEOS
  // =====================================

  const seedPosts = [
    {
      id: "demo-1",
      username: "vtikcreator",
      displayName: "V-Tik Creator",
      caption: "Welcome to V-Tik! Discover amazing videos. 🎬",
      src: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4",
      demo: true
    },
    {
      id: "demo-2",
      username: "travelworld",
      displayName: "Travel World",
      caption: "Explore beautiful moments around the world! 🌍",
      src: "https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_25fps.mp4",
      demo: true
    },
    {
      id: "demo-3",
      username: "moviezone",
      displayName: "Movie Zone",
      caption: "Enjoy another amazing video! ✨",
      src: "https://videos.pexels.com/video-files/854420/854420-hd_1920_1080_25fps.mp4",
      demo: true
    }
  ];

  // =====================================
  // STORAGE
  // =====================================

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadPosts() {
    const saved = read(STORAGE_KEY, []);
    const valid = Array.isArray(saved) ? saved : [];

    return [
      ...valid.filter(post => !post.localOnly),
      ...seedPosts.filter(seed =>
        !valid.some(post => post.id === seed.id)
      )
    ];
  }

  function savePosts() {
    const permanent = posts.filter(post => !post.localOnly);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(permanent));
    } catch {
      toast("Browser storage is full.");
    }
  }

  // =====================================
  // USER
  // =====================================

  function currentUser() {
    const username = localStorage.getItem(SESSION_KEY);

    return username
      ? { username, displayName: username }
      : { username: "vtikguest", displayName: "V-Tik Viewer" };
  }

  function avatarText(name) {
    return String(name || "VT").trim().slice(0, 2).toUpperCase();
  }

  // =====================================
  // SECURITY / HELPERS
  // =====================================

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function toast(message) {
    const node = $("toast");

    if (!node) {
      console.log(message);
      return;
    }

    node.textContent = message;
    node.classList.remove("hidden");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      node.classList.add("hidden");
    }, 2600);
  }

  // =====================================
  // VIDEO FEED
  // =====================================

  function render() {
    const feed = $("videoFeed");
    if (!feed) return;

    const query = ($("searchInput")?.value || "")
      .trim()
      .toLowerCase();

    const visible = posts.filter(post =>
      `${post.caption} ${post.username} ${post.displayName || ""}`
        .toLowerCase()
        .includes(query)
    );

    feed.innerHTML = "";

    visible.forEach(post => {
      const card = makeCard(post);
      feed.appendChild(card);
    });

    $("emptyState")?.classList.toggle(
      "hidden",
      visible.length > 0
    );

    // Show video loading errors
    feed.querySelectorAll("video").forEach(video => {
      video.addEventListener("error", () => {
        const stage = video.closest(".video-stage");

        if (stage && !stage.querySelector(".video-error")) {
          const error = document.createElement("div");

          error.className = "video-error";
          error.textContent = "Video could not load. Check your internet connection.";

          stage.appendChild(error);
        }
      }, { once: true });
    });
  }

  // =====================================
  // CREATE ONE VIDEO CARD
  // =====================================

  function makeCard(post) {
    const card = document.createElement("article");

    card.className = "video-card";

    const liked = read(LIKES_KEY, []).includes(post.id);
    const saved = read(SAVES_KEY, []).includes(post.id);

    const owner = currentUser().username === post.username;

    card.innerHTML = `
      <div class="video-card-header">

        <div class="mini-avatar">
          ${safeText(avatarText(post.displayName || post.username))}
        </div>

        <div class="video-user-info">
          <strong>${safeText(post.displayName || post.username)}</strong>
          <span>@${safeText(post.username)}</span>
        </div>

        <button
          class="follow-chip"
          data-action="follow"
          data-id="${safeText(post.id)}">
          + Follow
        </button>

      </div>

      <div class="video-stage">

        <video
          src="${safeText(post.src)}"
          playsinline
          controls
          preload="metadata"
          ${post.poster ? `poster="${safeText(post.poster)}"` : ""}
        ></video>

      </div>

      <div class="video-caption">
        ${safeText(post.caption)}
      </div>

      <div class="video-actions">

        <button
          class="action-btn ${liked ? "liked" : ""}"
          data-action="like"
          data-id="${safeText(post.id)}">

          <span class="action-icon">${liked ? "♥" : "♡"}</span>
          <span>${liked ? "Liked" : "Like"}</span>

        </button>

        <button
          class="action-btn"
          data-action="comment"
          data-id="${safeText(post.id)}">

          <span class="action-icon">☰</span>
          <span>Comment</span>

        </button>

        <button
          class="action-btn ${saved ? "liked" : ""}"
          data-action="save"
          data-id="${safeText(post.id)}">

          <span class="action-icon">${saved ? "▣" : "▤"}</span>
          <span>${saved ? "Saved" : "Save"}</span>

        </button>

        <button
          class="action-btn"
          data-action="share"
          data-id="${safeText(post.id)}">

          <span class="action-icon">↗</span>
          <span>Share</span>

        </button>

        ${owner && !post.demo ? `
          <button
            class="action-btn"
            data-action="delete"
            data-id="${safeText(post.id)}">

            <span class="action-icon">⋯</span>
            <span>Delete</span>

          </button>
        ` : ""}

      </div>
    `;

    return card;
  }

  // =====================================
  // LIKE AND SAVE
  // =====================================

  function toggleId(key, id) {
    const ids = read(key, []);
    const index = ids.indexOf(id);

    if (index >= 0) {
      ids.splice(index, 1);
    } else {
      ids.push(id);
    }

    localStorage.setItem(key, JSON.stringify(ids));

    return index < 0;
  }

  // =====================================
  // MODALS
  // =====================================

  function openModal(id) {
    $(id)?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    $(id)?.classList.add("hidden");

    if (!document.querySelector(".modal:not(.hidden)")) {
      document.body.style.overflow = "";
    }
  }

  function openCreate() {
    openModal("createModal");
  }

  // =====================================
  // COMMENTS
  // =====================================

  function showComments(id) {
    currentCommentPost = id;

    const comments = read(COMMENTS_KEY, {});
    const list = $("commentList");

    if (!list) return;

    list.innerHTML = "";

    (comments[id] || []).forEach(comment => {
      const item = document.createElement("div");
      item.className = "comment-item";

      const username = document.createElement("strong");
      username.textContent = "@" + comment.username;

      const text = document.createElement("p");
      text.textContent = comment.text;

      item.append(username, text);
      list.appendChild(item);
    });

    if (!list.children.length) {
      list.innerHTML =
        '<p class="muted">No comments yet. Be the first to comment.</p>';
    }

    openModal("commentModal");
  }

  // =====================================
  // VIDEO BUTTON ACTIONS
  // =====================================

  document.addEventListener("click", async event => {
    const action = event.target.closest("[data-action]");
    if (!action) return;

    const { action: type, id } = action.dataset;

    if (type === "like") {
      const on = toggleId(LIKES_KEY, id);

      action.classList.toggle("liked", on);
      action.querySelector(".action-icon").textContent = on ? "♥" : "♡";
      action.lastElementChild.textContent = on ? "Liked" : "Like";

    } else if (type === "save") {
      const on = toggleId(SAVES_KEY, id);

      action.classList.toggle("liked", on);
      action.querySelector(".action-icon").textContent = on ? "▣" : "▤";
      action.lastElementChild.textContent = on ? "Saved" : "Save";

      toast(on ? "Video saved" : "Video removed from saved videos");

    } else if (type === "comment") {
      showComments(id);

    } else if (type === "share") {
      const url =
        `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: "V-Tik video",
            text: "Watch this video on V-Tik",
            url
          });
        } else {
          await navigator.clipboard.writeText(url);
          toast("Video link copied");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          toast("Unable to share right now.");
        }
      }

    } else if (type === "follow") {
      toast("Following will be available with online accounts.");

    } else if (type === "delete") {
      if (confirm("Delete this uploaded video?")) {
        posts = posts.filter(post => post.id !== id);
        savePosts();
        render();
        toast("Video deleted.");
      }
    }
  });

  // =====================================
  // SEARCH
  // =====================================

  $("searchInput")?.addEventListener("input", render);

  $("clearSearch")?.addEventListener("click", () => {
    if ($("searchInput")) {
      $("searchInput").value = "";
      render();
      $("searchInput").focus();
    }
  });

  // =====================================
  // CREATE VIDEO PANEL
  // =====================================

  ["createTop", "openCreate", "mobileCreate", "emptyCreate"]
    .forEach(id => {
      $(id)?.addEventListener("click", openCreate);
    });

  $("closeCreate")?.addEventListener("click", () => {
    closeModal("createModal");
  });

  $("closeComments")?.addEventListener("click", () => {
    closeModal("commentModal");
  });

  // =====================================
  // NAVIGATION
  // =====================================

  ["discoverBtn", "mobileDiscover"].forEach(id => {
    $(id)?.addEventListener("click", () => {
      $("searchInput")?.focus();
      toast("Search videos or creator names.");
    });
  });

  $("mobileHome")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("mobileInbox")?.addEventListener("click", () => {
    toast("Inbox will be available with online accounts.");
  });

  $("mobileProfile")?.addEventListener("click", () => {
    toast("Connect your profile page to open your account.");
  });

  $("headerAvatar")?.addEventListener("click", () => {
    toast("Connect your account page to open your profile.");
  });

  // =====================================
  // CLOSE MODALS
  // =====================================

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal:not(.hidden)")
        .forEach(modal => closeModal(modal.id));
    }
  });

  // =====================================
  // SELECT VIDEO
  // =====================================

  $("videoFile")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast("Please select a video file.");
      event.target.value = "";
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      toast("Choose a video under 35 MB.");
      event.target.value = "";
      return;
    }

    if (pendingVideoUrl) {
      URL.revokeObjectURL(pendingVideoUrl);
    }

    pendingVideoFile = file;
    pendingVideoUrl = URL.createObjectURL(file);

    if ($("selectedFile")) {
      $("selectedFile").textContent =
        `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    }
  });

  // =====================================
  // POST VIDEO
  // =====================================

  $("postVideo")?.addEventListener("click", () => {
    if (!pendingVideoFile || !pendingVideoUrl) {
      toast("Select a video first.");
      return;
    }

    const user = currentUser();

    const post = {
      id: "local-" + Date.now(),
      username: user.username,
      displayName: user.displayName,
      caption: $("videoCaption")?.value.trim() || "New video on V-Tik ✨",
      src: pendingVideoUrl,
      localOnly: true,
      demo: false,
      createdAt: Date.now()
    };

    posts.unshift(post);

    // Temporary browser upload
    render();

    $("videoFile").value = "";
    $("videoCaption").value = "";

    if ($("selectedFile")) {
      $("selectedFile").textContent = "No video selected";
    }

    pendingVideoUrl = null;
    pendingVideoFile = null;

    closeModal("createModal");
    toast("Your video has been added!");

    document.querySelector(".main-content")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  // =====================================
  // POST COMMENT
  // =====================================

  $("commentForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const text = $("commentInput")?.value.trim();

    if (!text || !currentCommentPost) return;

    const comments = read(COMMENTS_KEY, {});
    comments[currentCommentPost] ||= [];

    comments[currentCommentPost].push({
      username: currentUser().username,
      text,
      createdAt: Date.now()
    });

    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));

    $("commentInput").value = "";
    showComments(currentCommentPost);
  });

  // =====================================
  // PROFILE AVATAR
  // =====================================

  if ($("headerAvatar")) {
    $("headerAvatar").textContent =
      avatarText(currentUser().username);
  }

  // =====================================
  // START V-TIK
  // =====================================

  posts = loadPosts();
  render();

})();

.video-card {
  width: 100%;
  max-width: 600px;
  margin: 24px auto;
  background: #15151d;
  border: 1px solid #292936;
  border-radius: 16px;
  overflow: hidden;
  color: #fff;
}

.video-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
}

.video-user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-user-info span {
  color: #aaa;
  font-size: 12px;
}

.video-stage {
  width: 100%;
  background: #000;
  overflow: hidden;
}

.video-stage video {
  display: block;
  width: 100%;
  max-height: 650px;
  object-fit: contain;
  background: #000;
}

.video-caption {
  padding: 14px 16px;
  line-height: 1.5;
  color: #eee;
}

.video-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #292936;
}

.video-actions .action-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 8px;
}

.video-actions .action-btn:hover,
.video-actions .action-btn.liked {
  color: #ff3b75;
}

.video-error {
  padding: 30px;
  text-align: center;
  color: #fff;
  background: #09090d;
}
