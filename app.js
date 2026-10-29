(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "vtik_posts_v1";
  const LIKES_KEY = "vtik_likes_v1";
  const SAVES_KEY = "vtik_saves_v1";
  const COMMENTS_KEY = "vtik_comments_v1";
  const SESSION_KEY = "vtik_current_user";
  const seedPosts = [
    {id:"demo-f1", username:"vtikcreator", displayName:"V-Tik creator", caption:"Formula One donut action 🏎️ #F1 #motorsport", src:"https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4", demo:true},
    {id:"demo-travel", username:"vtikcreator", displayName:"V-Tik creator", caption:"Watch this moment! ✨ #V-Tik", src:"https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_25fps.mp4", demo:true},
    {id:"demo-cinema", username:"vtikcreator", displayName:"V-Tik creator", caption:"Another video to explore 🎬 #shorts", src:"https://videos.pexels.com/video-files/854420/854420-hd_1920_1080_25fps.mp4", demo:true}
  ];
  let posts = loadPosts();
  let currentCommentPost = null;
  let pendingVideoUrl = null;

  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  }
  function loadPosts() {
    const saved = read(STORAGE_KEY, null);
    return Array.isArray(saved) ? [...saved, ...seedPosts.filter(s => !saved.some(p => p.id === s.id))] : [...seedPosts];
  }
  function savePosts() {
    // Store only metadata for demo posts; local uploaded blobs are browser-local.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
    catch { toast("Browser storage is full. Try a smaller video."); }
  }
  function currentUser() {
    const name = localStorage.getItem(SESSION_KEY);
    return name ? { username: name, displayName: name } : { username: "vtikguest", displayName: "V-Tik viewer" };
  }
  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function toast(message) {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add("hidden"), 2600);
  }
  function avatarText(name) { return (name || "VT").trim().slice(0,2).toUpperCase(); }
  function render() {
    const feed = $("videoFeed");
    if (!feed) return;
    const query = ($("searchInput")?.value || "").trim().toLowerCase();
    const visible = posts.filter(p => `${p.caption} ${p.username} ${p.displayName || ""}`.toLowerCase().includes(query));
    feed.innerHTML = "";
    visible.forEach(post => feed.appendChild(makeCard(post)));
    $("emptyState")?.classList.toggle("hidden", visible.length > 0);
    if (!visible.length) $("emptyState").textContent = "No videos found. Try another search or upload your first video.";
    document.querySelectorAll("video").forEach(v => {
      v.addEventListener("error", () => {
        const stage = v.closest(".video-stage");
        if (stage && !stage.querySelector(".video-error")) {
          const error = document.createElement("div");
          error.className = "video-error";
          error.style.cssText = "position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:25px;color:#bbb;font-size:13px;background:#09090d";
          error.textContent = "This video could not load. Check your connection or upload a playable MP4/WebM file.";
          stage.appendChild(error);
        }
      }, { once: true });
    });
  }
  function makeCard(post) {
    const card = document.createElement("article");
    card.className = "video-card";
    const liked = read(LIKES_KEY, []).includes(post.id);
    const saved = read(SAVES_KEY, []).includes(post.id);
    const owner = currentUser().username === post.username;
    card.innerHTML = `
      <div class="video-main">
        <div class="video-stage">
          <video src="${safeText(post.src)}" playsinline controls preload="metadata" ${post.poster ? `poster="${safeText(post.poster)}"` : ""}></video>
          <div class="video-overlay"><strong>@${safeText(post.username)}</strong><p>${safeText(post.caption)}</p></div>
        </div>
        <div class="video-author"><div class="mini-avatar">${safeText(avatarText(post.displayName || post.username))}</div><div><div class="author-name">${safeText(post.displayName || post.username)}</div><div class="handle">@${safeText(post.username)}</div></div><button class="follow-chip" data-action="follow" data-id="${safeText(post.id)}">＋ Follow</button></div>
      </div>
      <div class="video-actions">
        <button class="action-btn ${liked ? "liked" : ""}" data-action="like" data-id="${safeText(post.id)}"><span class="action-icon">${liked ? "♥" : "♡"}</span><span>${liked ? "Liked" : "Like"}</span></button>
        <button class="action-btn" data-action="comment" data-id="${safeText(post.id)}"><span class="action-icon">☰</span><span>Comment</span></button>
        <button class="action-btn ${saved ? "liked" : ""}" data-action="save" data-id="${safeText(post.id)}"><span class="action-icon">${saved ? "▣" : "▤"}</span><span>${saved ? "Saved" : "Save"}</span></button>
        <button class="action-btn" data-action="share" data-id="${safeText(post.id)}"><span class="action-icon">↗</span><span>Share</span></button>
        ${owner && !post.demo ? `<button class="action-btn" data-action="delete" data-id="${safeText(post.id)}"><span class="action-icon">⋯</span><span>Delete</span></button>` : ""}
      </div>`;
    return card;
  }
  function toggleId(key, id) {
    const ids = read(key, []);
    const index = ids.indexOf(id);
    if (index >= 0) ids.splice(index, 1); else ids.push(id);
    localStorage.setItem(key, JSON.stringify(ids));
    return index < 0;
  }
  function openModal(id) { $(id)?.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function closeModal(id) { $(id)?.classList.add("hidden"); if (!document.querySelector(".modal:not(.hidden)")) document.body.style.overflow = ""; }
  function openCreate() { openModal("createModal"); }
  function showComments(id) {
    currentCommentPost = id;
    const comments = read(COMMENTS_KEY, {});
    const list = $("commentList");
    list.innerHTML = "";
    (comments[id] || []).forEach(c => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `<strong>@${safeText(c.username)}</strong><p>${safeText(c.text)}</p>`;
      list.appendChild(item);
    });
    if (!list.children.length) list.innerHTML = '<p class="muted">No comments yet. Be the first to comment.</p>';
    openModal("commentModal");
  }
  document.addEventListener("click", async event => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const { action: type, id } = action.dataset;
    if (type === "like") {
      const on = toggleId(LIKES_KEY, id); action.classList.toggle("liked", on);
      action.querySelector(".action-icon").textContent = on ? "♥" : "♡";
      action.lastElementChild.textContent = on ? "Liked" : "Like";
    } else if (type === "save") {
      const on = toggleId(SAVES_KEY, id); action.classList.toggle("liked", on);
      action.querySelector(".action-icon").textContent = on ? "▣" : "▤";
      action.lastElementChild.textContent = on ? "Saved" : "Save";
      toast(on ? "Saved in this browser" : "Removed from saved videos");
    } else if (type === "comment") showComments(id);
    else if (type === "share") {
      const url = `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;
      try { if (navigator.share) await navigator.share({title:"V-Tik video", text:"Watch this on V-Tik", url}); else { await navigator.clipboard.writeText(url); toast("Video link copied"); } }
      catch { toast("Sharing was cancelled."); }
    } else if (type === "follow") toast("Sign in and connect a backend to follow creators across devices.");
    else if (type === "delete") {
      if (confirm("Delete this uploaded video from this browser?")) {
        posts = posts.filter(p => p.id !== id); savePosts(); render(); toast("Video removed");
      }
    }
  });
  $("searchInput")?.addEventListener("input", render);
  ["createTop","openCreate","mobileCreate"].forEach(id => $(id)?.addEventListener("click", openCreate));
  ["closeCreate"].forEach(id => $(id)?.addEventListener("click", () => closeModal("createModal")));
  $("closeComments")?.addEventListener("click", () => closeModal("commentModal"));
  ["discoverBtn","mobileDiscover"].forEach(id => $(id)?.addEventListener("click", () => { $("searchInput")?.focus(); toast("Search videos or creator names"); }));
  $("mobileInbox")?.addEventListener("click", () => toast("Inbox needs a server and user accounts to work online."));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModal(m.id); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal:not(.hidden)").forEach(m => closeModal(m.id)); });

  $("videoFile")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast("Please choose a video file."); event.target.value = ""; return; }
    if (file.size > 35 * 1024 * 1024) { toast("For this browser-only demo, choose a video under 35 MB."); event.target.value = ""; return; }
    if (pendingVideoUrl) URL.revokeObjectURL(pendingVideoUrl);
    pendingVideoUrl = URL.createObjectURL(file);
    $("selectedFile").textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  });
  $("postVideo")?.addEventListener("click", () => {
    const file = $("videoFile")?.files?.[0];
    if (!file || !pendingVideoUrl) { toast("Select a video first."); return; }
    const user = currentUser();
    const post = { id: "local-" + Date.now(), username: user.username, displayName: user.displayName, caption: $("videoCaption").value.trim() || "New video on V-Tik ✨", src: pendingVideoUrl, localOnly: true, createdAt: Date.now() };
    posts.unshift(post);
    try {
      // Keep a marker only; object URLs do not survive a browser restart.
      localStorage.setItem("vtik_local_video_note", "Local uploads are temporary and may disappear after refresh.");
      savePosts();
    } catch {}
    render(); $("videoFile").value = ""; $("videoCaption").value = ""; $("selectedFile").textContent = "No video selected";
    closeModal("createModal"); toast("Video added for this browser session.");
    document.querySelector(".main-content")?.scrollIntoView({behavior:"smooth"});
  });
  $("commentForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const text = $("commentInput").value.trim();
    if (!text || !currentCommentPost) return;
    const all = read(COMMENTS_KEY, {});
    all[currentCommentPost] ||= [];
    all[currentCommentPost].push({username: currentUser().username, text, createdAt: Date.now()});
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    $("commentInput").value = ""; showComments(currentCommentPost);
  });
  const headerAvatar = $("headerAvatar");
  if (headerAvatar) headerAvatar.textContent = avatarText(currentUser().username);
  render();
})();
