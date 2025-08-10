const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 建立資料庫
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) console.error(err);
  console.log("資料庫已連線");
});

// 建立 users 資料表
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

// 預設管理員帳號
db.get(`SELECT * FROM users WHERE username = ?`, ["albert_admin"], (err, row) => {
  if (!row) {
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [
      "albert_admin",
      "albert9765"
    ]);
    console.log("已建立管理員帳號 albert_admin / albert9765");
  }
});

// 首頁跳轉到登入頁
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// 註冊 API
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
    if (err) {
      return res.send(`<script>alert("帳號已存在"); window.location.href='/register.html';</script>`);
    }
    res.send(`<script>alert("註冊成功，請登入"); window.location.href='/login.html';</script>`);
  });
});

// 登入 API
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (!user) {
      return res.send(`<script>alert("帳號或密碼錯誤"); window.location.href='/login.html';</script>`);
    }
    if (username === "albert_admin") {
      return res.redirect("/admin");
    }
    res.send(`<script>alert("登入成功，歡迎 ${username}"); window.location.href='/user.html';</script>`);
  });
});

// 後台頁面（管理員）
app.get("/admin", (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) return res.status(500).send("資料庫錯誤");

    let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>後台管理</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f4f4f4; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
        th { background: #eee; }
        .btn { padding: 5px 10px; background: red; color: white; border: none; cursor: pointer; }
        .btn-add { background: green; }
        .btn-view { background: blue; color: white; border: none; padding: 5px 10px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>後台管理 - 所有用戶</h1>
      <table>
        <tr><th>ID</th><th>帳號</th><th>密碼</th><th>操作</th></tr>
    `;

    rows.forEach(user => {
      html += `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>
            <span id="pwd-${user.id}">******</span>
            <button class="btn-view" onclick="togglePassword(${user.id}, '${user.password}')">查看</button>
          </td>
          <td>
            <form action="/delete" method="POST" style="display:inline;">
              <input type="hidden" name="id" value="${user.id}">
              <button class="btn">刪除</button>
            </form>
            <form action="/reset" method="POST" style="display:inline;">
              <input type="hidden" name="id" value="${user.id}">
              <input type="text" name="newPassword" placeholder="新密碼">
              <button class="btn-add">重設密碼</button>
            </form>
          </td>
        </tr>
      `;
    });

    html += `
      </table>
      <h2>新增用戶</h2>
      <form action="/add" method="POST">
        <input type="text" name="username" placeholder="帳號" required>
        <input type="text" name="password" placeholder="密碼" required>
        <button class="btn-add">新增</button>
      </form>
      <button onclick="logout()">登出</button>
      <script>
        function togglePassword(id, realPwd) {
          let span = document.getElementById('pwd-' + id);
          if (span.innerText === '******') {
            span.innerText = realPwd;
          } else {
            span.innerText = '******';
          }
        }
        function logout(){
          fetch('/logout',{method:'Post'})
            .then(() => {
              window.location.herf = '/login.html';
            });
        }
      </script>
    </body>
    </html>
    `;

    res.send(html);
  });
});

// 新增用戶
app.post("/add", (req, res) => {
  const { username, password } = req.body;
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
    if (err) {
      return res.send(`<script>alert("新增失敗，帳號可能已存在"); window.location.href='/admin';</script>`);
    }
    res.redirect("/admin");
  });
});

// 刪除用戶
app.post("/delete", (req, res) => {
  const { id } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [id], (err) => {
    res.redirect("/admin");
  });
});

// 重設密碼
app.post("/reset", (req, res) => {
  const { id, newPassword } = req.body;
  db.run(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, id], (err) => {
    res.redirect("/admin");
  });
});

//用戶登出
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.sendStatus(200);
  });
});

//部屬完成
app.listen(3000, () => console.log("伺服器已啟動：http://localhost:3000"));




