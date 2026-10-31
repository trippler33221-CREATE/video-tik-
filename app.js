(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const STORAGE_KEY = "vtik_posts_v1";
  const LIKES_KEY = "vtik_likes_v1";
  const SAVES_KEY = "vtik_saves_v1";
  const COMMENTS_KEY = "vtik_comments_v1";
  const SESSION_KEY = "vtik_current_user";

  // DEMO VIDEOS
  const seedPosts = [
    {
      id: "demo-f1",
      username: "vtikcreator",
      displayName: "V-Tik creator",
      caption: "Formula One donut action 🏎️ #F1 #motorsport",
      src: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4",
      demo: true
    },
    {
      id: "demo-travel",
      username: "vtikcreator",
      displayName: "V-Tik creator",
      caption: "Watch this moment! ✨ #V-Tik",
      src: "https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_25fps.mp4",
      demo: true
    },
    {
      id: "demo-cinema",
      username: "vtikcreator",
      displayName: "V-Tik creator",
      caption: "Another video to explore 🎬 #shorts",
      src: "https://videos.pexels.com/video-files/854420/854420-hd_1920_1080_25fps.mp4",
      demo: true
    }
  ];

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

  let posts = loadPosts();
  let currentCommentPost = null;
  let pendingVideoUrl = null;
  let pendingVideoFile = null;

  function savePosts() {
    const permanentPosts = posts.filter(post => !post.localOnly);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(permanentPosts));
    } catch {
      toast("Browser storage is full.");
    }
  }

  function currentUser() {
    const username = localStorage.getItem(SESSION_KEY);

    return username
      ? { username, displayName: username }
      : { username: "vtikguest", displayName: "V-Tik viewer" };
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function avatarText(name) {
    return (name || "VT").trim().slice(0, 2).toUpperCase();
  }

  function toast(message) {
    const node = $("toast");
    if (!node) return;

    node.textContent = message;
    node.classList.remove("hidden");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      node.classList.add("hidden");
    }, 2600);
  }

  // VIDEO FEED
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
      feed.appendChild(makeCard(post));
    });

    $("emptyState")?.classList.toggle(
      "hidden",
      visible.length > 0
    );

    // Display an error if a video cannot load.
    feed.querySelectorAll("video").forEach(video => {
      video.addEventListener("error", () => {
        const stage = video.closest(".video-stage");

        if (stage && !stage.querySelector(".video-error")) {
          const error = document.createElement("div");
          error.className = "video-error";
          error.textContent =
            "This video could not load. Check your internet or try another video.";

          error.style.cssText =
            "position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:20px;color:#bbb;background:#09090d;font-size:13px";

          stage.appendChild(error);
        }
      }, { once: true });
    });
  }

  // CREATE ONE VIDEO BOX
  function makeCard(post) {
    const card = document.createElement("article");
    card.className = "video-card";

    const liked = read(LIKES_KEY, []).includes(post.id);
    const saved = read(SAVES_KEY, []).includes(post.id);

    const owner = currentUser().username === post.username;

    card.innerHTML = `
      <div class="video-main">

        <div class="video-stage">
          <video
            src="${safeText(post.src)}"
            playsinline
            controls
            preload="metadata"
            ${post.poster ? `poster="${safeText(post.poster)}"` : ""}
          ></video>

          <div class="video-overlay">
            <strong>@${safeText(post.username)}</strong>
            <p>${safeText(post.caption)}</p>
          </div>
        </div>

        <div class="video-author">
          <div class="mini-avatar">
            ${safeText(avatarText(post.displayName || post.username))}
          </div>

          <div>
            <div class="author-name">
              ${safeText(post.displayName || post.username)}
            </div>
            <div class="handle">@${safeText(post.username)}</div>
          </div>

          <button
            class="follow-chip"
            data-action="follow"
            data-id="${safeText(post.id)}"
          >＋ Follow</button>
        </div>

      </div>

      <div class="video-actions">

        <button
          class="action-btn ${liked ? "liked" : ""}"
          data-action="like"
          data-id="${safeText(post.id)}"
        >
          <span class="action-icon">${liked ? "♥" : "♡"}</span>
          <span>${liked ? "Liked" : "Like"}</span>
        </button>

        <button
          class="action-btn"
          data-action="comment"
          data-id="${safeText(post.id)}"
        >
          <span class="action-icon">☰</span>
          <span>Comment</span>
        </button>

        <button
          class="action-btn ${saved ? "liked" : ""}"
          data-action="save"
          data-id="${safeText(post.id)}"
        >
          <span class="action-icon">${saved ? "▣" : "▤"}</span>
          <span>${saved ? "Saved" : "Save"}</span>
        </button>

        <button
          class="action-btn"
          data-action="share"
          data-id="${safeText(post.id)}"
        >
          <span class="action-icon">↗</span>
          <span>Share</span>
        </button>

        ${owner && !post.demo ? `
          <button
            class="action-btn"
            data-action="delete"
            data-id="${safeText(post.id)}"
          >
            <span class="action-icon">⋯</span>
            <span>Delete</span>
          </button>
        ` : ""}

      </div>
    `;

    return card;
  }

  // LIKE AND SAVE
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

  // MODALS
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

  // COMMENTS
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

  // ALL VIDEO ACTIONS
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
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          toast("Video link copied");
        } else {
          toast("Sharing is not supported here.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          toast("Unable to share right now.");
        }
      }

    } else if (type === "follow") {
      toast("Online following requires user accounts and a backend.");

    } else if (type === "delete") {
      if (confirm("Delete this uploaded video?")) {
        posts = posts.filter(post => post.id !== id);
        savePosts();
        render();
        toast("Video removed");
      }
    }
  });

  // SEARCH
  $("searchInput")?.addEventListener("input", render);

  $("clearSearch")?.addEventListener("click", () => {
    $("searchInput").value = "";
    render();
    $("searchInput").focus();
  });

  // OPEN AND CLOSE CREATE PANEL
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

  // NAVIGATION
  ["discoverBtn", "mobileDiscover"].forEach(id => {
    $(id)?.addEventListener("click", () => {
      $("searchInput")?.focus();
      toast("Search videos or creator names");
    });
  });

  $("mobileHome")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("mobileInbox")?.addEventListener("click", () => {
    toast("Inbox will be available with online accounts.");
  });

  $("mobileProfile")?.addEventListener("click", () => {
    toast("Connect your account page to open your profile.");
  });

  $("headerAvatar")?.addEventListener("click", () => {
    toast("Profile page connection can be added next.");
  });

  // CLOSE MODALS
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal:not(.hidden)").forEach(modal => {
        closeModal(modal.id);
      });
    }
  });

  // SELECT VIDEO
  $("videoFile")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast("Please choose a video file.");
      event.target.value = "";
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      toast("Choose a video under 35 MB for this browser demo.");
      event.target.value = "";
      return;
    }

    if (pendingVideoUrl) {
      URL.revokeObjectURL(pendingVideoUrl);
    }

    pendingVideoFile = file;
    pendingVideoUrl = URL.createObjectURL(file);

    $("selectedFile").textContent =
      `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  });

  // POST VIDEO
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
      caption: $("videoCaption").value.trim() || "New video on V-Tik ✨",
      src: pendingVideoUrl,
      localOnly: true,
      demo: false,
      createdAt: Date.now()
    };

    posts.unshift(post);

    // Uploaded video is temporary in this browser session.
    render();

    $("videoFile").value = "";
    $("videoCaption").value = "";
    $("selectedFile").textContent = "No video selected";

    pendingVideoUrl = null;
    pendingVideoFile = null;

    closeModal("createModal");
    toast("Your video has been added!");

    document.querySelector(".main-content")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  // POST COMMENT
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

  // HEADER AVATAR
  if ($("headerAvatar")) {
    $("headerAvatar").textContent =
      avatarText(currentUser().username);
  }

  // START APPLICATION
  render();

})();
