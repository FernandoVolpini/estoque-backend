// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// 🔴 ANTES estava assim (e dava erro):
// const supabase = require("./backend/supabaseClient");

// ✅ AGORA: supabaseClient.js está na MESMA PASTA do server.js
const supabase = require("./supabaseClient");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// Middleware de autenticação com JWT (se você estiver usando)
// ---------------------------------------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const [, token] = authHeader.split(" ");

  jwt.verify(token, process.env.JWT_SECRET || "segredo-dev", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido" });
    }

    req.userId = decoded.id;
    return next();
  });
}

// ---------------------------------------------------------
// Rota básica só para testar se o backend está de pé
// ---------------------------------------------------------
app.get("/", (req, res) => {
  res.json({ message: "API EstoqueHub rodando ✅" });
});

// ---------------------------------------------------------
// 🔐 AUTENTICAÇÃO (exemplo) – ajuste nomes de tabela/colunas
// ---------------------------------------------------------

// Cadastro de usuário
app.post("/auth/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
    }

    // Verifica se já existe usuário
    const { data: existingUser, error: existingError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      // erro diferente de "no rows"
      console.error(existingError);
      return res.status(500).json({ error: "Erro ao verificar usuário" });
    }

    if (existingUser) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([{ nome, email, senha: hashedPassword }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }

    res.status(201).json({ message: "Usuário cadastrado com sucesso", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Login de usuário
app.post("/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const senhaConfere = await bcrypt.compare(senha, user.senha);
    if (!senhaConfere) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "segredo-dev", {
      expiresIn: "8h",
    });

    res.json({
      message: "Login realizado com sucesso",
      token,
      user: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ---------------------------------------------------------
// 📦 CRUD de produtos (exemplo) – ajuste para sua tabela
// ---------------------------------------------------------

// Listar produtos
app.get("/produtos", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from("produtos").select("*");

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Criar produto
app.post("/produtos", authMiddleware, async (req, res) => {
  try {
    const { nome, quantidade, preco } = req.body;

    if (!nome || quantidade == null || preco == null) {
      return res
        .status(400)
        .json({ error: "Nome, quantidade e preço são obrigatórios" });
    }

    const { data, error } = await supabase
      .from("produtos")
      .insert([{ nome, quantidade, preco }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao criar produto" });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Atualizar produto
app.put("/produtos/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, quantidade, preco } = req.body;

    const { data, error } = await supabase
      .from("produtos")
      .update({ nome, quantidade, preco })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao atualizar produto" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Deletar produto
app.delete("/produtos/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao deletar produto" });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ---------------------------------------------------------
// Subir servidor
// ---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
