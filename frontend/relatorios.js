// relatorios.js – Tela de Relatórios (somente leitura)

const API_URL = "http://localhost:3000"; // trocar pela URL do Render em produção

class ReportsPage {
  constructor() {
    this.products = [];
    this.currentUser = this.getCurrentUser();
    this.token = this.currentUser ? this.currentUser.token : null;
    this.init();
  }

  init() {
    this.checkAuth();
    this.setupUserInfo();
    this.setupLogout();
    this.fetchProducts();
  }

  // ======== Sessão / Autenticação ========

  getCurrentUser() {
    try {
      const session = localStorage.getItem("estoquehub_session");
      return session ? JSON.parse(session) : null;
    } catch (error) {
      return null;
    }
  }

  checkAuth() {
    if (!this.currentUser || !this.token) {
      window.location.href = "index.html";
    }
  }

  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ======== API ========

  async fetchProducts() {
    const tbody = document.getElementById("low-stock-tbody");
    const emptyMsg = document.getElementById("low-stock-empty");
    if (tbody) tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    if (emptyMsg) emptyMsg.style.display = "none";

    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erro ao carregar produtos.");
      }

      this.products = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: Number(p.quantity ?? 0),
        minQuantity: Number(p.minQuantity ?? p.min_quantity ?? 0),
        category: p.category || "",
        createdAt: p.createdAt || p.created_at,
        lastUpdated: p.lastUpdated || p.updated_at,
      }));

      this.updateDashboardCards();
      this.renderLowStockTable();
    } catch (error) {
      if (tbody) tbody.innerHTML = "";
      if (emptyMsg) {
        emptyMsg.textContent = error.message || "Erro ao carregar produtos.";
        emptyMsg.style.display = "block";
      }
      this.showToast(error.message || "Erro ao carregar produtos", "error");
    }
  }

  // ======== Cards de Resumo ========

  updateDashboardCards() {
    const cardTotalProdutos = document.getElementById("card-total-produtos");
    const cardTotalItens = document.getElementById("card-total-itens");
    const cardEstoqueBaixo = document.getElementById("card-estoque-baixo");

    if (!cardTotalProdutos) return;

    const totalProdutos = this.products.length;
    const totalItens = this.products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const estoqueBaixo = this.products.filter(
      (p) => p.quantity <= p.minQuantity
    ).length;

    cardTotalProdutos.textContent = totalProdutos;
    cardTotalItens.textContent = totalItens;
    cardEstoqueBaixo.textContent = estoqueBaixo;
  }

  // ======== Tabela de estoque baixo ========

  renderLowStockTable() {
    const tbody = document.getElementById("low-stock-tbody");
    const emptyMsg = document.getElementById("low-stock-empty");
    if (!tbody) return;

    tbody.innerHTML = "";

    const lowStock = this.products.filter(
      (p) => p.quantity <= p.minQuantity
    );

    if (!lowStock.length) {
      if (emptyMsg) {
        emptyMsg.textContent = "Nenhum produto com estoque baixo no momento.";
        emptyMsg.style.display = "block";
      }
      return;
    } else if (emptyMsg) {
      emptyMsg.style.display = "none";
    }

    lowStock.forEach((product) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = product.name;
      tr.appendChild(tdName);

      const tdSku = document.createElement("td");
      tdSku.textContent = product.sku;
      tr.appendChild(tdSku);

      const tdQty = document.createElement("td");
      tdQty.textContent = product.quantity;
      tr.appendChild(tdQty);

      const tdMin = document.createElement("td");
      tdMin.textContent = product.minQuantity;
      tr.appendChild(tdMin);

      const tdStatus = document.createElement("td");
      tdStatus.appendChild(this.createStatusBadge(product));
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    });
  }

  createStatusBadge(product) {
    const badge = document.createElement("span");
    badge.classList.add("dash-badge");

    if (product.quantity === 0) {
      badge.classList.add("dash-badge-low");
      badge.textContent = "Sem estoque";
    } else if (product.quantity <= product.minQuantity) {
      badge.classList.add("dash-badge-low");
      badge.textContent = "Estoque baixo";
    } else {
      badge.classList.add("dash-badge-ok");
      badge.textContent = "OK";
    }

    return badge;
  }

  // ======== Header (usuário / logout / toast) ========

  setupUserInfo() {
    const welcomeMsg = document.getElementById("welcome-message");
    if (welcomeMsg && this.currentUser) {
      welcomeMsg.textContent = `Bem-vindo, ${this.currentUser.name}!`;
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("estoquehub_session");
        window.location.href = "index.html";
      });
    }
  }

  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideIn 0.3s ease reverse";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ReportsPage();
});
