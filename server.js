const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// 首頁
app.get('/', (req, res) => {
    if (req.session.username) {
        if (req.session.username === 'albert_admin') {
            return res.redirect('/admin');
        }
        res.send(`<h1>歡迎 ${req.session.username}！</h1><a href="/logout">登出</a>`);
    } else {
        res.redirect('/login.html');
    }
});

// 註冊
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (row) return res.send(`<script>alert('帳號已存在');window.location.href='/register.html';</script>`);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) throw err;
            res.send(`<script>alert('註冊成功！');window.location.href='/login.html';</script>`);
        });
    });
});

// 登入
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (!user) return res.send(`<script>alert('帳號不存在');window.location.href='/login.html';</script>`);
        if (password === user.password) {
            req.session.username = username;
            res.redirect('/');
        } else {
            res.send(`<script>alert('密碼錯誤');window.location.href='/login.html';</script>`);
        }
    });
});

// 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// 後台管理頁面
app.get('/admin', (req, res) => {
    if (req.session.username !== 'albert_admin') {
        return res.send('權限不足');
    }
    db.all('SELECT * FROM users', (err, rows) => {
        let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>管理員後台</title>
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
        <h1>管理員後台</h1>
        <table>
        <tr><th>ID</th><th>帳號</th><th>密碼</th><th>操作</th></tr>`;
        rows.forEach(user => {
            html += `<tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.password}</td>
                        <td>
                            <form action="/delete-user" method="POST" style="display:inline;">
                                <input type="hidden" name="id" value="${user.id}">
                                <button class="btn danger" type="submit">刪除</button>
                            </form>
                            <form action="/reset-password" method="POST" style="display:inline;">
                                <input type="hidden" name="id" value="${user.id}">
                                <input type="text" name="newPassword" placeholder="新密碼">
                                <button class="btn warning" type="submit">重設</button>
                            </form>
                        </td>
                    </tr>`;
        });
        html += `</table>
                 <h2>新增使用者</h2>
                 <form action="/add-user" method="POST">
                     <input type="text" name="username" placeholder="帳號" required>
                     <input type="text" name="password" placeholder="密碼" required>
                     <button class="btn success" type="submit">新增</button>
                 </form>
                 <a href="/logout" class="btn">登出</a>
                 </body></html>`;
        res.send(html);
    });
});

// 刪除使用者
app.post('/delete-user', (req, res) => {
    if (req.session.username !== 'albert_admin') return res.send('權限不足');
    const { id } = req.body;
    db.run('DELETE FROM users WHERE id = ?', [id], () => {
        res.redirect('/admin');
    });
});

// 新增使用者
app.post('/add-user', (req, res) => {
    if (req.session.username !== 'albert_admin') return res.send('權限不足');
    const { username, password } = req.body;
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], () => {
        res.redirect('/admin');
    });
});

// 重設密碼
app.post('/reset-password', (req, res) => {
    if (req.session.username !== 'albert_admin') return res.send('權限不足');
    const { id, newPassword } = req.body;
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, id], () => {
        res.redirect('/admin');
    });
});

/* === 預留 API 接口，未來功能可加在這裡 === */
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        res.json(rows);
    });
});

app.listen(3000, () => console.log('伺服器已啟動 http://localhost:3000'));
