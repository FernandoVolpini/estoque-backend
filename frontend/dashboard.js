// dashboard.js – integrado com API REST (Node + Supabase)
const API_URL = "http://localhost:3000"; // Troque pelo URL do Render em produção

class StockManager {
  constructor() {
    this.products = [];
    this.currentUser = this.getCurrentUser();
    this.token = this.currentUser ? this.currentUser.token : null;
    this.init();
  }

  init() {
    this.checkAuth();
    this.setupEventListeners();
    this.fetchProducts();
    this.setupUserInfo();
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

  // ======== Chamadas de API ========

  async fetchProducts() {
    const tbody = document.getElementById("products-tbody");
    const noProductsMsg = document.getElementById("no-products-msg");
    if (tbody) tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";
    if (noProductsMsg) noProductsMsg.style.display = "none";

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

      this.renderTable();
      this.updateDashboardCards();
    } catch (error) {
      if (tbody) tbody.innerHTML = "";
      if (noProductsMsg) {
        noProductsMsg.textContent = error.message || "Erro ao carregar produtos.";
        noProductsMsg.style.display = "block";
      }
      this.showToast(error.message || "Erro ao carregar produtos", "error");
    }
  }

  async createProduct(productData) {
    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Erro ao criar produto");
    }

    return data;
  }

  async updateProduct(id, productData) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Erro ao atualizar produto");
    }

    return data;
  }

  async deleteProduct(id) {
    if (!confirm("Tem certeza que deseja remover este produto?")) {
      return;
    }

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Erro ao remover produto");
    }

    this.showToast("Produto removido com sucesso", "success");
    await this.fetchProducts();
  }

  // ======== Renderização da Tabela ========

  renderTable(searchTerm = "") {
    const tbody = document.getElementById("products-tbody");
    const noProductsMsg = document.getElementById("no-products-msg");
    if (!tbody) return;

    tbody.innerHTML = "";

    const normalizedTerm = searchTerm.trim().toLowerCase();
    let filtered = this.products;

    if (normalizedTerm) {
      filtered = this.products.filter((p) => {
        return (
          p.name.toLowerCase().includes(normalizedTerm) ||
          p.sku.toLowerCase().includes(normalizedTerm)
        );
      });
    }

    if (!filtered.length) {
      if (noProductsMsg) {
        noProductsMsg.style.display = "block";
        noProductsMsg.textContent = "Nenhum produto encontrado.";
      }
      return;
    } else if (noProductsMsg) {
      noProductsMsg.style.display = "none";
    }

    filtered.forEach((product) => {
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

      const tdActions = document.createElement("td");
      tdActions.appendChild(this.createActionButtons(product));
      tr.appendChild(tdActions);

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

  createActionButtons(product) {
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("dash-actions");

    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.textContent = "Editar";
    btnEdit.className = "secondary-btn";
    btnEdit.addEventListener("click", () => this.fillFormForEdit(product));

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.textContent = "Remover";
    btnDelete.className = "danger-btn";
    btnDelete.addEventListener("click", async () => {
      try {
        await this.deleteProduct(product.id);
      } catch (error) {
        this.showToast(error.message || "Erro ao remover produto", "error");
      }
    });

    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDelete);

    return actionsDiv;
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

  // ======== Formulário ========

  setupEventListeners() {
    const form = document.getElementById("product-form");
    const searchInput = document.getElementById("search-input");
    const logoutBtn = document.getElementById("logout");

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleFormSubmit();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const value = e.target.value;
        this.renderTable(value);
      });
    }

    // Botão exportar (exporta o array atual do front)
    const searchWrapper = document.querySelector(".dash-search-wrapper");
    if (searchWrapper) {
      const exportBtn = document.createElement("button");
      exportBtn.textContent = "📊 Exportar";
      exportBtn.type = "button";
      exportBtn.className = "export-btn";
      exportBtn.addEventListener("click", () => this.exportData());
      searchWrapper.parentNode.insertBefore(exportBtn, searchWrapper.nextSibling);
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("estoquehub_session");
        window.location.href = "index.html";
      });
    }
  }

  async handleFormSubmit() {
    const formMsg = document.getElementById("product-form-msg");
    if (formMsg) {
      formMsg.textContent = "";
      formMsg.className = "form-msg";
    }

    const inputId = document.getElementById("product-id");
    const inputName = document.getElementById("product-name");
    const inputSku = document.getElementById("product-sku");
    const inputQty = document.getElementById("product-qty");
    const inputMin = document.getElementById("product-min");

    const productData = {
      name: inputName.value.trim(),
      sku: inputSku.value.trim(),
      quantity: Number(inputQty.value),
      minQuantity: Number(inputMin.value),
    };

    const editingId = inputId.value ? Number(inputId.value) : null;
    const errors = this.validateProduct(productData, editingId);

    if (errors.length > 0) {
      if (formMsg) {
        formMsg.textContent = errors.join(". ") + ".";
        formMsg.className = "form-msg error-msg";
      }
      return;
    }

    try {
      if (editingId) {
        await this.updateProduct(editingId, productData);
        this.showToast("Produto atualizado com sucesso!", "success");
      } else {
        await this.createProduct(productData);
        this.showToast("Produto criado com sucesso!", "success");
      }

      document.getElementById("product-form").reset();
      inputId.value = "";
      await this.fetchProducts();
    } catch (error) {
      if (formMsg) {
        formMsg.textContent = error.message || "Erro ao salvar produto.";
        formMsg.className = "form-msg error-msg";
      }
      this.showToast(error.message || "Erro ao salvar produto", "error");
    }
  }

  validateProduct(product, editingId = null) {
    const errors = [];

    if (!product.name) {
      errors.push("Nome do produto é obrigatório");
    } else if (product.name.length < 3) {
      errors.push("Nome do produto deve ter pelo menos 3 caracteres");
    }

    if (!product.sku) {
      errors.push("SKU é obrigatório");
    }

    if (product.quantity < 0) {
      errors.push("Quantidade não pode ser negativa");
    }

    if (product.minQuantity < 0) {
      errors.push("Estoque mínimo não pode ser negativo");
    }

    if (product.minQuantity > product.quantity) {
      // Pode ser regra opcional, comente se não quiser restringir
      // errors.push("Estoque mínimo não deve ser maior que a quantidade");
    }

    // Evita SKU duplicado em outro produto
    const duplicated = this.products.some((p) => {
      if (editingId && p.id === editingId) return false;
      return p.sku === product.sku;
    });

    if (duplicated) {
      errors.push("Já existe um produto com este SKU");
    }

    return errors;
  }

  fillFormForEdit(product) {
    const inputId = document.getElementById("product-id");
    const inputName = document.getElementById("product-name");
    const inputSku = document.getElementById("product-sku");
    const inputQty = document.getElementById("product-qty");
    const inputMin = document.getElementById("product-min");

    inputId.value = product.id;
    inputName.value = product.name;
    inputSku.value = product.sku;
    inputQty.value = product.quantity;
    inputMin.value = product.minQuantity;

    const msg = document.getElementById("product-form-msg");
    if (msg) {
      msg.textContent = "Editando produto. Salve para confirmar as alterações.";
      msg.className = "form-msg info-msg";
    }
  }

  exportData() {
    const dataStr = JSON.stringify(this.products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "estoquehub_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Dados exportados com sucesso", "success");
  }

  // ======== Info do usuário / Toast ========

  setupUserInfo() {
    const welcomeMsg = document.getElementById("welcome-message");
    if (welcomeMsg && this.currentUser) {
      welcomeMsg.textContent = `Bem-vindo, ${this.currentUser.name}!`;
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

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  new StockManager();
});
