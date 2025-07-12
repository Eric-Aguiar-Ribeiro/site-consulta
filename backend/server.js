const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.static('public'));

// Banco de dados
const db = new sqlite3.Database('./db.sqlite');

// Criação da tabela
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    codigo TEXT,
    nome TEXT,
    valor REAL,
    vencimento TEXT,
    descricao TEXT,
    status TEXT
  )`);
  db.run("DELETE FROM clientes"); // limpar a cada início (teste)
});

// Autenticação básica
app.use('/admin', basicAuth({
  users: { 'admin': '123456' },
  challenge: true
}));

// Upload
const upload = multer({ dest: 'uploads/' });
app.post('/admin/upload', upload.single('planilha'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  db.serialize(() => {
    db.run("DELETE FROM clientes");
    const stmt = db.prepare("INSERT INTO clientes VALUES (?, ?, ?, ?, ?, ?)");
    data.forEach(row => {
      stmt.run(
        row.CODIGO_CLIENTE,
        row.NOME_CLIENTE,
        row.VALOR_DEVIDO,
        row.DATA_VENCIMENTO,
        row.DESCRICAO,
        row.STATUS
      );
    });
    stmt.finalize();
  });

  fs.unlinkSync(filePath); // remove o arquivo depois de ler
  res.send("Planilha importada com sucesso!");
});

// Consulta pública
app.get('/consulta/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  db.all("SELECT * FROM clientes WHERE codigo = ?", [codigo], (err, rows) => {
    if (err) {
      res.status(500).send("Erro na consulta");
    } else {
      res.json(rows);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
