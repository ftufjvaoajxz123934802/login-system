const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// ✅ 強制 HTTPS（Render / Heroku 可用）
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// 資料庫初始化（密碼存明碼，因應你要後台可直接查看）
const db = new sqlite3.Database('users.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)");
  // 預設管理員帳號
  db.get("SELECT * FROM users WHERE username = ?", ["albert_admin"], (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["albert_admin", "albert9765"]);
    }
  });
});

// 首頁（登入頁）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 註冊頁
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 登入 API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) return res.status(500).send("資料庫錯誤");
    if (row) {
      if (username === 'albert_admin' && password === 'albert9765') {
        res.redirect('/admin');
      } else {
        res.send("<script>alert('登入成功！'); window.location.href='/';</script>");
      }
    } else {
      res.send("<script>alert('帳號或密碼錯誤'); window.history.back();</script>");
    }
  });
});

// 註冊 API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (row) {
      res.send("<script>alert('此帳號已存在'); window.history.back();</script>");
    } else {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], () => {
        res.send("<script>alert('註冊成功！'); window.location.href='/';</script>");
      });
    }
  });
});

// 後台頁面（僅管理員）
app.get('/admin', (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).send("資料庫錯誤");
    let html = `
      <html>
      <head>
        <title>後台管理</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f4f4f4; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; background: white; }
          th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
          th { background: #eee; }
          .btn { padding: 5px 10px; background: red; color: white; border: none; cursor: pointer; }
          .btn-add { background: green; }
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
          <td>${user.password}</td>
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
      </body></html>
    `;
    res.send(html);
  });
});

// 刪除用戶
app.post('/delete', (req, res) => {
  const { id } = req.body;
  db.run("DELETE FROM users WHERE id = ?", [id], () => {
    res.redirect('/admin');
  });
});

// 新增用戶
app.post('/add', (req, res) => {
  const { username, password } = req.body;
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], () => {
    res.redirect('/admin');
  });
});

// 重設密碼
app.post('/reset', (req, res) => {
  const { id, newPassword } = req.body;
  db.run("UPDATE users SET password = ? WHERE id = ?", [newPassword, id], () => {
    res.redirect('/admin');
  });
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`伺服器已啟動，端口 ${port}`);
});

