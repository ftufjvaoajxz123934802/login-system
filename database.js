const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

// 建立資料表
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
`);

// 建立預設管理員帳號
db.get('SELECT * FROM users WHERE username = ?', ['albert_admin'], (err, row) => {
    if (!row) {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['albert_admin', 'albert9765']);
        console.log('已建立管理員帳號: albert_admin / albert9765');
    }
});

module.exports = db;
