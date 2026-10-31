
(() => {
  "use strict";

  const POSTS_KEY = "vtik_pro_posts";
  const USER_KEY = "vtik_pro_user";
  const USERS_KEY = "vtik_pro_users";
  const LIKES_KEY = "vtik_pro_likes";
  const SAVES_KEY = "vtik_pro_saves";
  const FOLLOWS_KEY = "vtik_pro_follows";
  const COMMENTS_KEY = "vtik_pro_comments";

  const $ = (id) => document.getElementById(id);

  const read = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const makeId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  let currentPage = "home";
  let activeCommentPost = null;
  let selectedFile = null;
  let toastTimer;

  let currentUser = read(USER_KEY, null);

  if (!currentUser) {
    currentUser = {
      username: "guest",
      displayName: "Guest Creator",
      bio: "Welcome to V-Tik Pro!"
    };
  }

  const getPosts = () => read(POSTS_KEY, []);
  const getLikes = () => read(LIKES_KEY, []);
  const getSaves = () => read(SAVES_KEY, []);
  const getFollows = () => read(FOLLOWS_KEY, []);
  const getComments = () => read(COMMENTS_KEY, {});

  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function initials(name = "VT") {
    return name.trim().split(/\s+/).slice(0, 2)
      .map(part => part[0] || "").join("").toUpperCase();
  }

  function openModal(id) {
    $(id).classList.remove("hidden");
  }

  function closeModal(id) {
    $(id).classList.add("hidden");
  }

  function ownerOf(post) {
    return currentUser.username === post.username;
  }

  function seedPosts() {
    if (getPosts().length) return;

    const demos = [
      {
        id: "demo-1",
        username: "vtikofficial",
        displayName: "V-Tik Official",
        caption: "Welcome to V-Tik Pro! 🎬 Discover, watch and share amazing videos.",
        src: "fik logogo(1).mp4",
        demo: true,
        createdAt: Date.now()
      }
    ];

    write(POSTS_KEY, demos);
  }

  function makeCard(post) {
    const card = document.createElement("article");
    card.className = "video-card";

    const liked = getLikes().includes(post.id);
    const saved = getSaves().includes(post.id);
    const followed = getFollows().includes(post.username);
    const comments = getComments()[post.id] || [];
    const canDelete = ownerOf(post) && !post.demo;

    card.innerHTML = `
      <div class="video-card-header">
        <div class="mini-avatar">
          ${escapeHTML(initials(post.displayName || post.username))}
        </div>

        <div class="video-user-info">
          <strong>${escapeHTML(post.displayName || post.username)}</strong>
          <span>@${escapeHTML(post.username)}</span>
        </div>

        <button class="follow-chip"
          data-action="follow"
          data-id="${escapeHTML(post.id)}">
          ${followed ? "Following" : "+ Follow"}
        </button>
      </div>

      <div class="video-stage">
        <video
          src="${escapeHTML(post.src)}"
          controls
          playsinline
          preload="metadata"
        ></video>
      </div>

      <div class="video-caption">${escapeHTML(post.caption || "")}</div>

      <div class="video-actions">
        <button class="action-btn ${liked ? "selected" : ""}"
          data-action="like" data-id="${escapeHTML(post.id)}">
          ♥ ${liked ? "Liked" : "Like"}
        </button>

        <button class="action-btn"
          data-action="comment" data-id="${escapeHTML(post.id)}">
          ◉ Comment (${comments.length})
        </button>

        <button class="action-btn ${saved ? "selected" : ""}"
          data-action="save" data-id="${escapeHTML(post.id)}">
          ▣ ${saved ? "Saved" : "Save"}
        </button>

        <button class="action-btn"
          data-action="share" data-id="${escapeHTML(post.id)}">
          ↗ Share
        </button>

        ${canDelete ? `
          <button class="action-btn delete"
            data-action="delete" data-id="${escapeHTML(post.id)}">
            Delete
          </button>
        ` : ""}
      </div>
    `;

    return card;
  }

  function render() {
    const feed = $("videoFeed");
    const empty = $("emptyState");
    const search = $("searchInput").value.trim().toLowerCase();
    const profilePanel = $("profilePanel");

    feed.innerHTML = "";

    let posts = getPosts();

    if (currentPage === "following") {
      const following = getFollows();
      posts = posts.filter(post => following.includes(post.username));
    }

    if (currentPage === "saved") {
      const saved = getSaves();
      posts = posts.filter(post => saved.includes(post.id));
    }

    if (currentPage === "profile") {
      posts = posts.filter(post => post.username === currentUser.username);
      profilePanel.classList.remove("hidden");
      updateProfile();
    } else {
      profilePanel.classList.add("hidden");
    }

    if (search) {
      posts = posts.filter(post =>
        `${post.caption} ${post.username} ${post.displayName}`
          .toLowerCase().includes(search)
      );
    }

    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    posts.forEach(post => feed.appendChild(makeCard(post)));

    empty.classList.toggle("hidden", posts.length > 0);
    feed.classList.toggle("hidden", posts.length === 0);
  }

  function updateProfile() {
    const posts = getPosts().filter(
      post => post.username === currentUser.username
    );

    const likes = posts.reduce((total, post) => {
      return total + (post.likesCount || 0);
    }, 0);

    $("profileName").textContent = currentUser.displayName;
    $("profileUsername").textContent = "@" + currentUser.username;
    $("profileBio").textContent = currentUser.bio || "No bio yet.";
    $("profileAvatar").textContent = initials(currentUser.displayName);
    $("topAvatar").textContent = initials(currentUser.displayName);
    $("profilePostCount").textContent = posts.length;
    $("profileLikeCount").textContent = likes;
  }

  function setPage(page) {
    currentPage = page;

    const titles = {
      home: "For You",
      following: "Following",
      explore: "Explore",
      saved: "Saved videos",
      profile: "My Profile"
    };

    $("pageTitle").textContent = titles[page] || "For You";

    document.querySelectorAll("[data-page]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page && button.classList.contains("nav-item")
      );

      button.classList.toggle(
        "mobile-active",
        button.dataset.page === page && button.closest(".mobile-nav")
      );

      if (button.classList.contains("tab")) {
        button.classList.toggle("active", button.dataset.page === page);
      }
    });

    render();
  }

  // OPEN UPLOAD WINDOW
  function showUpload() {
    if (!read(USER_KEY, null)) {
      openModal("accountModal");
      notify("Create an account before uploading.");
      return;
    }

    openModal("uploadModal");
  }

  [
    "openUpload",
    "sidebarCreate",
    "rightUpload",
    "mobileUpload",
    "emptyUpload"
  ].forEach(id => {
    $(id).addEventListener("click", showUpload);
  });

  // CLOSE MODALS
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  // SELECT VIDEO
  $("videoFile").addEventListener("change", event => {
    selectedFile = event.target.files[0] || null;

    if (!selectedFile) {
      $("selectedFile").textContent = "No video selected";
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      notify("Please select a video file.");
      selectedFile = null;
      event.target.value = "";
      return;
    }

    const maxSize = 100 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      notify("Video is too large. Maximum size is 100 MB.");
      selectedFile = null;
      event.target.value = "";
      return;
    }

    $("selectedFile").textContent =
      `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)`;
  });

  // PUBLISH VIDEO
  $("publishVideo").addEventListener("click", () => {
    if (!selectedFile) {
      notify("Choose a video first.");
      return;
    }

    const videoURL = URL.createObjectURL(selectedFile);

    const post = {
      id: makeId(),
      username: currentUser.username,
      displayName: currentUser.displayName,
      caption: $("videoCaption").value.trim(),
      src: videoURL,
      localOnly: true,
      createdAt: Date.now()
    };

    const posts = getPosts();
    posts.unshift(post);
    write(POSTS_KEY, posts);

    $("videoCaption").value = "";
    $("videoFile").value = "";
    $("selectedFile").textContent = "No video selected";
    selectedFile = null;

    closeModal("uploadModal");
    setPage("home");
    notify("Your video has been added!");

    // Note: object URLs and local uploads are not permanent cloud storage.
  });

  // FEED BUTTON ACTIONS
  $("videoFeed").addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    const posts = getPosts();
    const post = posts.find(item => item.id === id);

    if (!post) return;

    if (action === "like") {
      let likes = getLikes();

      if (likes.includes(id)) {
        likes = likes.filter(item => item !== id);
        notify("Like removed.");
      } else {
        likes.push(id);
        post.likesCount = (post.likesCount || 0) + 1;
        notify("You liked this video.");
      }

      write(LIKES_KEY, likes);
      write(POSTS_KEY, posts);
      render();
    }

    if (action === "save") {
      let saves = getSaves();

      if (saves.includes(id)) {
        saves = saves.filter(item => item !== id);
        notify("Removed from saved videos.");
      } else {
        saves.push(id);
        notify("Video saved.");
      }

      write(SAVES_KEY, saves);
      render();
    }

    if (action === "follow") {
      if (post.username === currentUser.username) {
        notify("You cannot follow yourself.");
        return;
      }

      let follows = getFollows();

      if (follows.includes(post.username)) {
        follows = follows.filter(name => name !== post.username);
        notify("You unfollowed this creator.");
      } else {
        follows.push(post.username);
        notify("You are now following this creator.");
      }

      write(FOLLOWS_KEY, follows);
      render();
    }

    if (action === "comment") {
      activeCommentPost = id;
      renderComments();
      openModal("commentsModal");
    }

    if (action === "share") {
      const shareText = `Watch this video on V-Tik Pro: ${post.caption}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "V-Tik Pro video",
            text: shareText,
            url: location.href
          });
        } catch {
          // Sharing cancelled by the user.
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        notify("Video details copied.");
      } else {
        notify("Sharing is not supported in this browser.");
      }
    }

    if (action === "delete") {
      if (!ownerOf(post)) {
        notify("You can only delete your own videos.");
        return;
      }

      if (!confirm("Delete this video?")) return;

      write(POSTS_KEY, posts.filter(item => item.id !== id));
      write(LIKES_KEY, getLikes().filter(item => item !== id));
      write(SAVES_KEY, getSaves().filter(item => item !== id));

      const comments = getComments();
      delete comments[id];
      write(COMMENTS_KEY, comments);

      render();
      notify("Video deleted.");
    }
  });

  // COMMENTS
  function renderComments() {
    const list = $("commentList");
    const comments = getComments()[activeCommentPost] || [];

    list.innerHTML = "";

    if (!comments.length) {
      list.innerHTML = `<p class="muted">No comments yet. Be the first to comment.</p>`;
      return;
    }

    comments.forEach(comment => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <b>${escapeHTML(comment.name)}</b>
        <p>${escapeHTML(comment.text)}</p>
      `;
      list.appendChild(item);
    });
  }

  $("commentForm").addEventListener("submit", event => {
    event.preventDefault();

    const text = $("commentInput").value.trim();
    if (!text || !activeCommentPost) return;

    const comments = getComments();
    comments[activeCommentPost] ||= [];

    comments[activeCommentPost].push({
      name: currentUser.displayName,
      text,
      createdAt: Date.now()
    });

    write(COMMENTS_KEY, comments);
    $("commentInput").value = "";
    renderComments();
    render();
    notify("Comment posted.");
  });

  // SEARCH
  $("searchInput").addEventListener("input", render);

  $("clearSearch").addEventListener("click", () => {
    $("searchInput").value = "";
    render();
  });

  // NAVIGATION
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      setPage(button.dataset.page);
    });
  });

  // PROFILE
  $("editProfile").addEventListener("click", () => {
    $("editName").value = currentUser.displayName;
    $("editBio").value = currentUser.bio || "";
    openModal("profileModal");
  });

  $("saveProfile").addEventListener("click", () => {
    const name = $("editName").value.trim();
    const bio = $("editBio").value.trim();

    if (!name) {
      notify("Please enter your display name.");
      return;
    }

    currentUser.displayName = name;
    currentUser.bio = bio;

    write(USER_KEY, currentUser);
    updateProfile();
    render();
    closeModal("profileModal");
    notify("Profile updated.");
  });

  $("topAvatar").addEventListener("click", () => {
    if (!read(USER_KEY, null)) {
      openModal("accountModal");
    } else {
      setPage("profile");
    }
  });

  // ACCOUNT CREATION
  $("createAccount").addEventListener("click", () => {
    const name = $("accountName").value.trim();
    const username = $("accountUsername").value.trim().toLowerCase();
    const password = $("accountPassword").value;

    if (!name || !username || !password) {
      notify("Complete all account fields.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      notify("Username must be 3–20 letters, numbers or underscores.");
      return;
    }

    if (password.length < 6) {
      notify("Password must be at least 6 characters.");
      return;
    }

    const users = read(USERS_KEY, []);

    if (users.some(user => user.username === username)) {
      notify("That username is already taken.");
      return;
    }

    // Demo-only account storage. Do not use real passwords here.
    const user = {
      username,
      displayName: name,
      bio: "Welcome to my V-Tik profile.",
      password
    };

    users.push(user);
    write(USERS_KEY, users);

    currentUser = {
      username,
      displayName: name,
      bio: user.bio
    };

    write(USER_KEY, currentUser);
    closeModal("accountModal");
    updateProfile();
    setPage("profile");
    notify("Your account has been created!");
  });

  // LOGIN
  $("showLogin").addEventListener("click", () => {
    const username = prompt("Enter your username:");
    if (!username) return;

    const password = prompt("Enter your password:");
    if (!password) return;

    const users = read(USERS_KEY, []);
    const user = users.find(item =>
      item.username === username.trim().toLowerCase() &&
      item.password === password
    );

    if (!user) {
      notify("Incorrect username or password.");
      return;
    }

    currentUser = {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio
    };

    write(USER_KEY, currentUser);
    closeModal("accountModal");
    updateProfile();
    setPage("profile");
    notify("Welcome back!");
  });

  // INITIAL SETUP
  seedPosts();
  updateProfile();
  render();

})();
