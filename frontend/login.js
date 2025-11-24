// login.js - Autenticação integrada com API REST (Node + Supabase)

const API_URL = "http://localhost:3000"; // Troque pelo URL do Render em produção

class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupTabs();
    this.setupLogin();
    this.setupRegister();
    this.setupModals();
    this.checkExistingSession();
  }

  // ========== Sessão / Storage ==========

  checkExistingSession() {
    const session = this.getSession();
    if (session && session.token) {
      // Já logado → manda pro dashboard
      window.location.href = "dashboard.html";
    }
  }

  getSession() {
    try {
      const raw = localStorage.getItem("estoquehub_session");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setSessionFromApi(data) {
    const { token, user } = data || {};
    if (!token || !user) {
      throw new Error("Resposta inválida do servidor.");
    }

    const sessionData = {
      token,
      email: user.email,
      name: user.name || user.fullName || user.nome || "Usuário",
      loginTime: new Date().toISOString(),
    };

    localStorage.setItem("estoquehub_session", JSON.stringify(sessionData));
  }

  // ========== Sistema de abas (Login / Cadastro) ==========

  setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    if (!tabButtons.length || !tabContents.length) return;

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;

        // Atualiza estado visual das abas
        tabButtons.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        // Mostra o conteúdo correto
        tabContents.forEach((content) => {
          const isActive = content.id === `${tab}-form`;
          content.classList.toggle("active", isActive);
          content.hidden = !isActive;

          if (isActive) {
            this.resetForm(content);
          }
        });

        // Focar no primeiro input do formulário ativo
        const firstInput = document.querySelector(`#${tab}-form input`);
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 100);
        }
      });
    });
  }

  resetForm(formElement) {
    const form = formElement.tagName === "FORM" ? formElement : formElement.querySelector("form");
    if (!form) return;

    form.reset();
    this.clearFieldErrors();
    const errorMsg = form.querySelector(".error-msg");
    const successMsg = form.querySelector(".success-msg");
    if (errorMsg) errorMsg.textContent = "";
    if (successMsg) successMsg.textContent = "";
  }

  // ========== Login ==========

  setupLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const errorMsg = document.getElementById("login-error");
    const submitBtn = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      this.clearFieldErrors();
      if (errorMsg) errorMsg.textContent = "";

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      let valid = true;

      // validações
      if (!email) {
        this.showFieldError("login-email", "E-mail é obrigatório");
        valid = false;
      } else if (!this.validateEmail(email)) {
        this.showFieldError("login-email", "E-mail inválido");
        valid = false;
      }

      if (!password) {
        this.showFieldError("login-password", "Senha é obrigatória");
        valid = false;
      }

      if (!valid) return;

      try {
        this.setLoadingState(submitBtn, true);

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || data.error || "Falha ao realizar login.");
        }

        this.setSessionFromApi(data);
        this.showToast("Login realizado com sucesso!", "success");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      } catch (error) {
        const msg = error.message || "Erro ao realizar login.";
        if (errorMsg) errorMsg.textContent = msg;
        this.showToast(msg, "error");
      } finally {
        this.setLoadingState(submitBtn, false);
      }
    });
  }

  // ========== Cadastro ==========

  setupRegister() {
    const form = document.getElementById("register-form");
    if (!form) return;

    const nameInput = document.getElementById("register-name");
    const emailInput = document.getElementById("register-email");
    const passwordInput = document.getElementById("register-password");
    const errorMsg = document.getElementById("register-error");
    const successMsg = document.getElementById("register-success");
    const submitBtn = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      this.clearFieldErrors();
      if (errorMsg) errorMsg.textContent = "";
      if (successMsg) successMsg.textContent = "";

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      let valid = true;

      if (!name) {
        this.showFieldError("register-name", "Nome é obrigatório");
        valid = false;
      } else if (name.length < 3) {
        this.showFieldError("register-name", "Informe pelo menos 3 caracteres");
        valid = false;
      }

      if (!email) {
        this.showFieldError("register-email", "E-mail é obrigatório");
        valid = false;
      } else if (!this.validateEmail(email)) {
        this.showFieldError("register-email", "E-mail inválido");
        valid = false;
      }

      if (!password) {
        this.showFieldError("register-password", "Senha é obrigatória");
        valid = false;
      } else if (password.length < 6) {
        this.showFieldError("register-password", "Senha deve ter pelo menos 6 caracteres");
        valid = false;
      }

      if (!valid) return;

      try {
        this.setLoadingState(submitBtn, true);

        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || data.error || "Falha ao realizar cadastro.");
        }

        // Opcional: já logar o usuário após cadastro
        this.setSessionFromApi(data);

        if (successMsg) {
          successMsg.textContent = "Conta criada com sucesso! Você será redirecionado.";
        }
        this.showToast("Cadastro realizado com sucesso!", "success");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (error) {
        const msg = error.message || "Erro ao realizar cadastro.";
        if (errorMsg) errorMsg.textContent = msg;
        this.showToast(msg, "error");
      } finally {
        this.setLoadingState(submitBtn, false);
      }
    });
  }

  // ========== Modal "Sobre" ==========

  setupModals() {
    const sobreLink = document.querySelector('a[href="#sobre"]');
    const modal = document.getElementById("sobre-modal");
    if (!sobreLink || !modal) return;

    const closeBtn = modal.querySelector(".modal-close");

    const openModal = () => {
      modal.hidden = false;
      modal.classList.add("open");
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.classList.remove("open");
    };

    sobreLink.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeModal());
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });
  }

  // ========== Utilitários de UI ==========

  setLoadingState(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.setAttribute("data-loading", "true");
      button.disabled = true;
    } else {
      button.removeAttribute("data-loading");
      button.disabled = false;
    }
  }

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  showFieldError(inputId, message) {
    const span = document.getElementById(`${inputId}-error`);
    if (span) span.textContent = message;
  }

  clearFieldErrors() {
    document.querySelectorAll(".field-error").forEach((span) => {
      span.textContent = "";
    });
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
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 5000);
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  new AuthManager();
});
