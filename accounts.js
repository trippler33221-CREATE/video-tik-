(() => {
  const $ = id => document.getElementById(id);
  const SESSION = "vtik_current_user", USERS = "vtik_demo_accounts";
  const get = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const avatar = name => (name || "VT").slice(0,2).toUpperCase();
  function refresh() {
    const user = localStorage.getItem(SESSION) || "vtikguest";
    $("profileAvatar").textContent = avatar(user);
    $("profileName").textContent = user === "vtikguest" ? "Guest account" : user;
    $("profileHandle").textContent = "@" + user;
    const posts = get("vtik_posts_v1", []);
    const mine = posts.filter(p => p.username === user && !p.demo && p.localOnly);
    $("videoCount").textContent = mine.length;
    $("savedCount").textContent = get("vtik_saves_v1", []).length;
    $("profileVideos").innerHTML = "";
    mine.forEach(post => {
      const card = document.createElement("div"); card.className = "profile-video";
      const v = document.createElement("video"); v.src = post.src; v.controls = true; v.playsInline = true;
      card.appendChild(v);
      const del = document.createElement("button"); del.textContent = "Delete"; del.addEventListener("click", () => {
        if (!confirm("Delete this video?")) return;
        const next = get("vtik_posts_v1", []).filter(p => p.id !== post.id);
        localStorage.setItem("vtik_posts_v1", JSON.stringify(next)); refresh();
      });
      card.appendChild(del); $("profileVideos").appendChild(card);
    });
    $("noProfileVideos").classList.toggle("hidden", mine.length > 0);
  }
  $("accountForm").addEventListener("submit", e => {
    e.preventDefault();
    const username = $("username").value.trim();
    const password = $("password").value;
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) { $("authMessage").textContent = "Use 3–24 letters, numbers, dots, underscores or hyphens."; return; }
    const users = get(USERS, {});
    if (users[username] && users[username] !== password) { $("authMessage").textContent = "That username already exists in this browser. Check the password."; return; }
    if (!users[username]) users[username] = password;
    localStorage.setItem(USERS, JSON.stringify(users));
    localStorage.setItem(SESSION, username);
    $("authMessage").textContent = "Signed in as @" + username + " on this browser.";
    refresh();
  });
  $("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(SESSION); $("authMessage").textContent = "Logged out. You are now using the guest account."; refresh();
  });
  $("profileInbox")?.addEventListener("click", () => alert("Online inbox requires a backend."));
  refresh();
})();
