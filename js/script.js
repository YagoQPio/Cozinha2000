// /js/script.js

// --- ESTADO GLOBAL ---
let displayedDate = new Date(); // Controla o mês/ano exibido nos gastos

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); // Aplica o tema salvo ANTES de renderizar o resto

    const path = window.location.pathname.split("/").pop() || 'index.html';
    
    // Roda a lógica específica de cada página
    switch(path) {
        case 'index.html': setupAuthPage(); break;
        case 'home.html': renderHomePageSummary(); break;
        case 'estoque.html': renderStock(); break;
        case 'lista.html': renderShoppingList(); initializeSortableList(); break;
        case 'gastos.html': renderExpenses(); break;
        case 'settings.html': loadSettings(); break;
        case 'receitas.html': /* Nenhuma ação inicial necessária */ break;
    }
    
    // A barra de navegação só existe nas páginas internas
    if(path !== 'index.html' && path !== '') {
        updateActiveNav(path);
    }
    
    setupModalForms();
});

// --- GERENCIAMENTO DE DADOS E CONFIGURAÇÕES ---
const getData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const getSettings = () => {
    const defaults = {
        theme: 'system',
        notifications: { lowStock: true, recipeSuggestions: true }
    };
    const saved = getData('userSettings');
    return { ...defaults, ...saved, notifications: {...defaults.notifications, ...(saved.notifications || {})} };
};
const saveSettings = (settings) => saveData('userSettings', settings);


// --- LÓGICA DE AUTENTICAÇÃO E NAVEGAÇÃO ---
function setupAuthPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const toSignupLink = document.getElementById('to-signup-link');
    const toLoginLink = document.getElementById('to-login-link');

    window.showAuthPage = (pageId) => {
        document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
    };

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signup();
        });
    }
    if(toSignupLink) {
        toSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('signup-page');
        });
    }
    if(toLoginLink) {
        toLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('login-page');
        });
    }

    showAuthPage('login-page');
}

const login = () => {
    showToast('Login efetuado com sucesso!', 'success');
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1000);
};

const signup = () => {
    showToast('Cadastro realizado! Faça o login.', 'success');
    showAuthPage('login-page');
}

const logout = () => window.location.href = 'index.html';

function updateActiveNav(path) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const linkPath = new URL(link.href).pathname.split('/').pop();
        if (linkPath === path) {
            link.classList.add('active');
        }
    });
}

function showToast(message, type = 'success') {
    document.querySelector('.toast-notification')?.remove();
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
}


// --- PÁGINA DE CONFIGURAÇÕES ---
function applyTheme() {
    const settings = getSettings();
    document.documentElement.classList.remove('dark-mode');
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark-mode');
    }
}

function loadSettings() {
    const settings = getSettings();
    document.getElementById(`theme-${settings.theme}`).checked = true;
    document.getElementById('notification-low-stock').checked = settings.notifications.lowStock;
    document.getElementById('notification-suggestions').checked = settings.notifications.recipeSuggestions;
}

function changeTheme(theme) {
    let settings = getSettings();
    settings.theme = theme;
    saveSettings(settings);
    applyTheme();
    showToast('Tema atualizado!', 'success');
}

function toggleNotification(key) {
    let settings = getSettings();
    const checkbox = document.getElementById(`notification-${key}`);
    settings.notifications[key] = checkbox.checked;
    saveSettings(settings);
    showToast('Preferências salvas.', 'success');
}

function exportData() {
    const allData = {
        stockData: getData('stockData'),
        shoppingListData: getData('shoppingListData'),
        expensesData: getData('expensesData'),
        userSettings: getSettings()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dados_app_compras_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Dados exportados com sucesso!', 'success');
}

function clearCache() {
    if (confirm('Tem certeza que deseja apagar TODOS os dados do aplicativo? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('stockData');
        localStorage.removeItem('shoppingListData');
        localStorage.removeItem('expensesData');
        showToast('Dados de listas e gastos foram apagados!', 'success');
        setTimeout(() => window.location.reload(), 1500);
    }
}


// --- PÁGINA HOME ---
function renderHomePageSummary() {
    document.getElementById('stock-summary').textContent = `${getData('stockData').length} itens no estoque`;
    document.getElementById('list-summary').textContent = `${getData('shoppingListData').length} itens na lista`;
    document.getElementById('expenses-summary').textContent = `${getData('expensesData').length} gastos registrados`;
}


// --- MÓDULO DE ESTOQUE ---
function renderStock() {
    const stockListEl = document.getElementById('stock-list');
    let stockData = getData('stockData');
    stockData.sort((a, b) => a.name.localeCompare(b.name));
    
    if (stockData.length === 0) {
        stockListEl.innerHTML = `<div class="empty-state"><i class="bi bi-box-seam"></i><p>Seu estoque está vazio.</p></div>`;
        return;
    }

    stockListEl.innerHTML = '';
    stockData.forEach(item => {
        const lowStockClass = item.quantity <= 1 ? 'low-stock' : '';
        stockListEl.innerHTML += `
            <li class="list-group-item ${lowStockClass}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold">${item.name}</span>
                        <small class="d-block text-muted item-quantity">${item.quantity} ${item.unit}</small>
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm btn-outline-danger" onclick="removeStockItem(${item.id})"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </li>`;
    });
}

function addStockItem(event) {
    const form = event.target;
    if (!form.checkValidity()) {
        event.preventDefault(); event.stopPropagation();
        form.classList.add('was-validated'); return;
    }
    event.preventDefault();
    const stockData = getData('stockData');
    const newProduct = {
        id: Date.now(),
        name: document.getElementById('product-name').value,
        quantity: parseInt(document.getElementById('product-quantity').value),
        unit: document.getElementById('product-unit').value,
    };
    stockData.push(newProduct);
    saveData('stockData', stockData);
    renderStock();
    form.reset(); form.classList.remove('was-validated');
    bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
    showToast('Produto adicionado ao estoque!', 'success');
}

function removeStockItem(id) {
    if (!confirm('Remover este item do estoque?')) return;
    saveData('stockData', getData('stockData').filter(item => item.id !== id));
    renderStock();
    showToast('Item removido.', 'info');
}


// --- MÓDULO DE LISTA DE COMPRAS ---
function renderShoppingList() {
    const shoppingListEl = document.getElementById('shopping-list');
    const shoppingListData = getData('shoppingListData');
    
    if (shoppingListData.length === 0) {
        shoppingListEl.innerHTML = `<div class="empty-state"><i class="bi bi-cart-check"></i><p>Sua lista de compras está vazia.</p></div>`;
        return;
    }

    shoppingListEl.innerHTML = '';
    shoppingListData.forEach(item => {
        const purchasedClass = item.purchased ? 'item-purchased' : '';
        const isChecked = item.purchased ? 'checked' : '';
        shoppingListEl.innerHTML += `
            <li class="list-group-item ${purchasedClass}" data-id="${item.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="form-check d-flex align-items-center">
                        <input class="form-check-input me-3" style="transform: scale(1.3);" type="checkbox" onchange="togglePurchased(${item.id})" ${isChecked}>
                        <span class="item-name" onclick="startEditItemName(this, ${item.id})">${item.name}</span>
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="startEditItemName(this.closest('.list-group-item').querySelector('.item-name'), ${item.id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeShoppingItem(${item.id})"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            </li>`;
    });
}

function generateShoppingList() {
    let shoppingListData = getData('shoppingListData');
    const stockData = getData('stockData');
    const existingNames = shoppingListData.map(i => i.name.toLowerCase());
    const newItems = stockData.filter(i => !existingNames.includes(i.name.toLowerCase()));
    
    if(newItems.length === 0) {
        showToast('Todos os itens do estoque já estão na lista.', 'info');
        return;
    }

    const itemsToAdd = newItems.map(i => ({ id: Date.now() + Math.random(), name: i.name, purchased: false }));
    saveData('shoppingListData', [...shoppingListData, ...itemsToAdd]);
    renderShoppingList();
    showToast(`${itemsToAdd.length} novo(s) item(ns) adicionado(s) à lista!`, 'success');
}

function addShoppingItem(event) {
    const form = event.target;
    if (!form.checkValidity()) {
        event.preventDefault(); event.stopPropagation();
        form.classList.add('was-validated'); return;
    }
    event.preventDefault();
    const shoppingListData = getData('shoppingListData');
    const newItem = {
        id: Date.now(),
        name: document.getElementById('shopping-item-name').value,
        purchased: false
    };
    shoppingListData.push(newItem);
    saveData('shoppingListData', shoppingListData);
    renderShoppingList();
    form.reset(); form.classList.remove('was-validated');
    bootstrap.Modal.getInstance(document.getElementById('addShoppingItemModal')).hide();
    showToast('Item adicionado à lista!', 'success');
}

function togglePurchased(id) {
    let data = getData('shoppingListData');
    const item = data.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;
        saveData('shoppingListData', data);
        renderShoppingList();
    }
}

function startEditItemName(element, id) {
    const currentName = element.textContent;
    element.outerHTML = `<input type="text" class="form-control form-control-sm" value="${currentName}" onblur="saveItemName(this, ${id})" onkeydown="if(event.key==='Enter') this.blur()">`;
    const container = document.querySelector(`li[data-id='${id}']`);
    const input = container.querySelector('input[type="text"]');
    if (input) {
        input.focus();
        input.select();
    }
}

function saveItemName(input, id) {
    let data = getData('shoppingListData');
    const item = data.find(i => i.id === id);
    if (item && input.value.trim() !== '') {
        item.name = input.value.trim();
        saveData('shoppingListData', data);
    }
    renderShoppingList();
}

function removeShoppingItem(id) {
    if (!confirm('Remover este item da lista?')) return;
    saveData('shoppingListData', getData('shoppingListData').filter(i => i.id !== id));
    renderShoppingList();
    showToast('Item removido da lista.', 'info');
}

function initializeSortableList() {
    const list = document.getElementById('shopping-list');
    if (!list) return;
    new Sortable(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            let data = getData('shoppingListData');
            const [reorderedItem] = data.splice(evt.oldIndex, 1);
            data.splice(evt.newIndex, 0, reorderedItem);
            saveData('shoppingListData', data);
        }
    });
}


// --- MÓDULO DE GASTOS ---
function changeMonth(offset) {
    displayedDate.setMonth(displayedDate.getMonth() + offset);
    renderExpenses();
}

function renderExpenses() {
    const allExpenses = getData('expensesData');
    const filteredExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.id);
        return expenseDate.getMonth() === displayedDate.getMonth() &&
               expenseDate.getFullYear() === displayedDate.getFullYear();
    });

    const monthDisplay = document.getElementById('current-month-display');
    if (monthDisplay) {
        const monthName = displayedDate.toLocaleString('pt-BR', { month: 'long' });
        monthDisplay.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${displayedDate.getFullYear()}`;
    }

    const expensesListEl = document.getElementById('expenses-list');
    if (filteredExpenses.length === 0) {
        expensesListEl.innerHTML = `<div class="empty-state"><i class="bi bi-wallet2"></i><p>Nenhum gasto neste mês.</p></div>`;
        renderExpenseSummary([]);
        return;
    }

    expensesListEl.innerHTML = '';
    filteredExpenses.sort((a, b) => b.id - a.id).forEach(expense => {
        expensesListEl.innerHTML += `
            <div class="expense-card">
                <div class="icon">${getCategoryIcon(expense.category)}</div>
                <div class="details">
                    <div class="fw-bold">${expense.description}</div>
                    <div class="text-muted small">${expense.category}</div>
                </div>
                <div class="amount me-3">R$ ${expense.amount.toFixed(2).replace('.', ',')}</div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editExpense(${expense.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
    });
    renderExpenseSummary(filteredExpenses);
}

function renderExpenseSummary(expenses) {
    const total = expenses.reduce((acc, item) => acc + item.amount, 0);
    const totalSpentEl = document.getElementById('total-spent');
    if(totalSpentEl) totalSpentEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    
    const bar = document.querySelector('.bar-graph .bar');
    if (bar) {
        const goal = 1000; // Meta fixa de exemplo
        const percentage = Math.min((total / goal) * 100, 100);
        bar.style.width = `${percentage}%`;
    }
}

function getCategoryIcon(category) {
    const icons = { 'Alimentação': '🍔', 'Mercado': '🛒', 'Transporte': '🚗', 'Lazer': '🎬', 'Outros': '💸' };
    return icons[category] || '💸';
}

function addExpense(event) {
    const form = event.target;
    if (!form.checkValidity()) {
        event.preventDefault(); event.stopPropagation(); form.classList.add('was-validated'); return;
    }
    event.preventDefault();
    const newExpense = {
        id: Date.now(),
        description: document.getElementById('add-expense-description').value,
        amount: parseFloat(document.getElementById('add-expense-amount').value),
        category: document.getElementById('add-expense-category').value,
    };
    saveData('expensesData', [...getData('expensesData'), newExpense]);
    renderExpenses();
    form.reset(); form.classList.remove('was-validated');
    bootstrap.Modal.getInstance(document.getElementById('addExpenseModal')).hide();
    showToast('Gasto adicionado!', 'success');
}

function editExpense(id) {
    const expense = getData('expensesData').find(e => e.id === id);
    if (!expense) return;
    document.getElementById('edit-expense-id').value = expense.id;
    document.getElementById('edit-expense-description').value = expense.description;
    document.getElementById('edit-expense-amount').value = expense.amount;
    document.getElementById('edit-expense-category').value = expense.category;
    new bootstrap.Modal(document.getElementById('editExpenseModal')).show();
}

function saveExpenseChanges(event) {
    const form = event.target;
    if (!form.checkValidity()) {
        event.preventDefault(); event.stopPropagation(); form.classList.add('was-validated'); return;
    }
    event.preventDefault();
    const id = parseInt(document.getElementById('edit-expense-id').value);
    let data = getData('expensesData');
    const item = data.find(i => i.id === id);
    if (item) {
        item.description = document.getElementById('edit-expense-description').value;
        item.amount = parseFloat(document.getElementById('edit-expense-amount').value);
        item.category = document.getElementById('edit-expense-category').value;
    }
    saveData('expensesData', data);
    renderExpenses();
    form.reset(); form.classList.remove('was-validated');
    bootstrap.Modal.getInstance(document.getElementById('editExpenseModal')).hide();
    showToast('Gasto atualizado.', 'success');
}

function deleteExpense(id) {
    if (!confirm('Apagar este gasto?')) return;
    saveData('expensesData', getData('expensesData').filter(e => e.id !== id));
    renderExpenses();
    showToast('Gasto apagado.', 'info');
}

// --- SETUP DOS FORMULÁRIOS ---
function setupModalForms() {
    document.getElementById('add-product-form')?.addEventListener('submit', addStockItem);
    document.getElementById('add-shopping-item-form')?.addEventListener('submit', addShoppingItem);
    document.getElementById('add-expense-form')?.addEventListener('submit', addExpense);
    document.getElementById('edit-expense-form')?.addEventListener('submit', saveExpenseChanges);
}
