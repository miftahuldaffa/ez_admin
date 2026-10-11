
// ============================================================
// APP.JS — Eztafest Admin Dashboard
// FULL: Init, Dashboard, Katalog, Pelanggan, Transaksi,
// Kalender, Invoice, Laporan, Modal, Toast, Sidebar Toggle
// ============================================================

var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var selectedOrderForInvoice = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function() {
    await loadFromSheet();
    lucide.createIcons();
    document.getElementById('current-date').innerText = formatDateFull(getTodayStr());
    renderAll();
});

// ===== TAB NAVIGATION =====
function switchTab(tabId) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(tabId).classList.remove('hidden');

    var t = {
        dashboard: ['Dashboard', 'Ringkasan bisnis Eztafest'],
        katalog:   ['Katalog Alat', 'Kelola inventaris alat event'],
        pelanggan: ['Pelanggan', 'Kelola data pelanggan'],
        transaksi: ['Transaksi', 'Kelola pesanan dan pembayaran'],
        kalender:  ['Kalender Sewa', 'Lihat jadwal penyewaan alat'],
        laporan:   ['Laporan', 'Analisa pendapatan dan performa']
    };
    document.getElementById('page-title').innerText = t[tabId][0];
    document.getElementById('page-subtitle').innerText = t[tabId][1];

    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].dataset.target === tabId) btns[i].classList.add('active');
    }
    renderAll();
}

// ===== RENDER ALL =====
function renderAll() {
    renderDashboard();
    renderKatalog();
    renderPelanggan();
    renderTransaksi();
    renderCalendar();
    renderLaporan();
    lucide.createIcons();
}

// ===== STATUS BADGE =====
function statusBadge(s) {
    var m = {
        'Menunggu Pembayaran': 'badge-waiting',
        'Sudah Bayar DP':     'badge-dp',
        'Sedang Disewa':      'badge-active',
        'Diantar':            'badge-delivery',
        'Dikembalikan':       'badge-returned',
        'Selesai':            'badge-done',
        'Dibatalkan':         'badge-cancelled'
    };
    return '<span class="badge ' + (m[s]||'badge-waiting') + '">' + s + '</span>';
}

// =============================================================
// DASHBOARD
// =============================================================
function renderDashboard() {
    var stats = getStats();
    document.getElementById('dash-revenue').innerText = formatRp(stats.monthRevenue);
    document.getElementById('dash-orders').innerText = stats.activeOrders;
    document.getElementById('dash-available').innerText = stats.availableItems;
    document.getElementById('dash-customers').innerText = stats.totalCustomers;

    // Transaksi terbaru (5)
    var recent = ordersData.slice().reverse().slice(0, 5);
    var tbody = document.getElementById('dash-recent-tbody');
    if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>';
    } else {
        var h = '';
        for (var i = 0; i < recent.length; i++) {
            var o = recent[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
            h += '<tr class="border-b border-gray-50">';
            h += '<td class="p-3 text-sm font-medium text-indigo-700">' + o.id + '</td>';
            h += '<td class="p-3 text-sm text-gray-700">' + c.name + '</td>';
            h += '<td class="p-3 text-sm text-gray-500">' + it.name + '</td>';
            h += '<td class="p-3 text-sm font-medium">' + formatRp(o.total) + '</td>';
            h += '<td class="p-3 text-sm">' + statusBadge(o.status) + '</td></tr>';
        }
        tbody.innerHTML = h;
    }

    // Top 3 alat laris
    var topItems = getTopItems(3);
    var topHtml = '';
    for (var i = 0; i < topItems.length; i++) {
        var t = topItems[i];
        topHtml += '<div class="flex items-center justify-between py-2 ' + (i < topItems.length-1 ? 'border-b border-gray-50' : '') + '">';
        topHtml += '<div><span class="text-sm font-medium text-gray-800">' + t.name + '</span>';
        topHtml += '<span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit disewa</span></div>';
        topHtml += '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
    }
    var topEl = document.getElementById('dash-top-items');
    if (topEl) topEl.innerHTML = topHtml || '<p class="text-sm text-gray-400">Belum ada data</p>';
}

// =============================================================
// KATALOG ALAT
// =============================================================
function renderKatalog() {
    var el = document.getElementById('search-katalog');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.name.toLowerCase().indexOf(q) !== -1 ||
            it.category.toLowerCase().indexOf(q) !== -1 ||
            it.id.toLowerCase().indexOf(q) !== -1) f.push(it);
    }
    var tbody = document.getElementById('katalog-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada alat ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var it = f[i], ri = inventoryData.indexOf(it);
        var ac = it.available > 0 ? 'text-green-600' : 'text-red-600';
        var condCls = it.condition === 'Baik' ? 'badge-done' : (it.condition === 'Rusak' ? 'badge-cancelled' : 'badge-waiting');

        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + it.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + it.name + '</td>';
        h += '<td class="p-4 text-sm"><span class="badge badge-active">' + it.category + '</span></td>';
        h += '<td class="p-4 text-sm text-gray-600 text-center">' + it.stock + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center ' + ac + '">' + it.available + '</td>';
        h += '<td class="p-4 text-sm text-gray-700 font-medium">' + formatRp(it.price) + '</td>';
        h += '<td class="p-4 text-sm"><span class="badge ' + condCls + '">' + (it.condition || 'Baik') + '</span></td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editAlat(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteAlat(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

// CRUD Alat
function openAlatModal() {
    document.getElementById('modal-alat-title').innerText = 'Tambah Alat';
    document.getElementById('alat-edit-index').value = -1;
    document.getElementById('form-alat').reset();
    openModal('modal-alat');
}

function editAlat(idx) {
    var it = inventoryData[idx];
    document.getElementById('modal-alat-title').innerText = 'Edit Alat';
    document.getElementById('alat-edit-index').value = idx;
    document.getElementById('alat-nama').value = it.name;
    document.getElementById('alat-kategori').value = it.category;
    document.getElementById('alat-stok').value = it.stock;
    document.getElementById('alat-harga').value = it.price;
    document.getElementById('alat-kondisi').value = it.condition || 'Baik';
    document.getElementById('alat-keterangan').value = it.description || '';
    openModal('modal-alat');
}

function saveAlat(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('alat-edit-index').value);
    var d = {
        name: document.getElementById('alat-nama').value,
        category: document.getElementById('alat-kategori').value,
        stock: parseInt(document.getElementById('alat-stok').value),
        price: parseInt(document.getElementById('alat-harga').value),
        condition: document.getElementById('alat-kondisi').value,
        description: document.getElementById('alat-keterangan').value
    };
    if (idx === -1) {
        d.id = generateId('EQ', inventoryData);
        d.available = d.stock;
        inventoryData.push(d);
        syncToSheet('add', 'Alat', d);
        showToast('Alat "' + d.name + '" berhasil ditambah');
    } else {
        inventoryData[idx].name = d.name;
        inventoryData[idx].category = d.category;
        inventoryData[idx].stock = d.stock;
        inventoryData[idx].price = d.price;
        inventoryData[idx].condition = d.condition;
        inventoryData[idx].description = d.description;
        recalcAvailableStock();
        syncToSheet('update', 'Alat', inventoryData[idx]);
        syncAvailableStock();
        showToast('Alat "' + d.name + '" berhasil diupdate');
    }
    closeModal('modal-alat');
    renderAll();
}

function deleteAlat(idx) {
    if (!confirm('Hapus alat "' + inventoryData[idx].name + '"?')) return;
    syncToSheet('delete', 'Alat', { id: inventoryData[idx].id });
    showToast('Alat "' + inventoryData[idx].name + '" dihapus');
    inventoryData.splice(idx, 1);
    renderAll();
}

// =============================================================
// PELANGGAN
// =============================================================
function renderPelanggan() {
    var el = document.getElementById('search-pelanggan');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < customersData.length; i++) {
        var c = customersData[i];
        if (c.name.toLowerCase().indexOf(q) !== -1 ||
            String(c.phone).indexOf(q) !== -1 ||
            c.id.toLowerCase().indexOf(q) !== -1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada pelanggan ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var c = f[i], ri = customersData.indexOf(c), oc = 0;
        for (var j = 0; j < ordersData.length; j++) {
            if (ordersData[j].customerId === c.id) oc++;
        }
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + c.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + c.name + '</td>';
        h += '<td class="p-4 text-sm text-gray-600">' + c.phone + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.email || '-') + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.address || '-') + (c.city ? ', ' + c.city : '') + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center">' + oc + '</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editCustomer(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteCustomer(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

function openCustomerModal() {
    document.getElementById('modal-pelanggan-title').innerText = 'Tambah Pelanggan';
    document.getElementById('cust-edit-index').value = -1;
    document.getElementById('form-pelanggan').reset();
    openModal('modal-pelanggan');
}

function editCustomer(idx) {
    var c = customersData[idx];
    document.getElementById('modal-pelanggan-title').innerText = 'Edit Pelanggan';
    document.getElementById('cust-edit-index').value = idx;
    document.getElementById('cust-nama').value = c.name;
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-email').value = c.email || '';
    document.getElementById('cust-alamat').value = c.address || '';
    document.getElementById('cust-kota').value = c.city || 'Semarang';
    document.getElementById('cust-catatan').value = c.notes || '';
    openModal('modal-pelanggan');
}

function saveCustomer(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('cust-edit-index').value);
    var d = {
        name: document.getElementById('cust-nama').value,
        phone: document.getElementById('cust-phone').value,
        email: document.getElementById('cust-email').value,
        address: document.getElementById('cust-alamat').value,
        city: document.getElementById('cust-kota').value,
        notes: document.getElementById('cust-catatan').value
    };
    if (idx === -1) {
        d.id = generateId('CST', customersData);
        customersData.push(d);
        syncToSheet('add', 'Pelanggan', d);
        showToast('Pelanggan "' + d.name + '" berhasil ditambah');
    } else {
        customersData[idx].name = d.name;
        customersData[idx].phone = d.phone;
        customersData[idx].email = d.email;
        customersData[idx].address = d.address;
        customersData[idx].city = d.city;
        customersData[idx].notes = d.notes;
        syncToSheet('update', 'Pelanggan', customersData[idx]);
        showToast('Pelanggan "' + d.name + '" berhasil diupdate');
    }
    closeModal('modal-pelanggan');
    renderAll();
}

function deleteCustomer(idx) {
    if (!confirm('Hapus pelanggan "' + customersData[idx].name + '"?')) return;
    syncToSheet('delete', 'Pelanggan', { id: customersData[idx].id });
    showToast('Pelanggan "' + customersData[idx].name + '" dihapus');
    customersData.splice(idx, 1);
    renderAll();
}


// ============================================================
// APP.JS — Eztafest Admin Dashboard
// FULL: Init, Dashboard, Katalog, Pelanggan, Transaksi,
// Kalender, Invoice, Laporan, Modal, Toast, Sidebar Toggle
// ============================================================

var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var selectedOrderForInvoice = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function() {
    await loadFromSheet();
    lucide.createIcons();
    document.getElementById('current-date').innerText = formatDateFull(getTodayStr());
    renderAll();
});

// ===== TAB NAVIGATION =====
function switchTab(tabId) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(tabId).classList.remove('hidden');

    var t = {
        dashboard: ['Dashboard', 'Ringkasan bisnis Eztafest'],
        katalog:   ['Katalog Alat', 'Kelola inventaris alat event'],
        pelanggan: ['Pelanggan', 'Kelola data pelanggan'],
        transaksi: ['Transaksi', 'Kelola pesanan dan pembayaran'],
        kalender:  ['Kalender Sewa', 'Lihat jadwal penyewaan alat'],
        laporan:   ['Laporan', 'Analisa pendapatan dan performa']
    };
    document.getElementById('page-title').innerText = t[tabId][0];
    document.getElementById('page-subtitle').innerText = t[tabId][1];

    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].dataset.target === tabId) btns[i].classList.add('active');
    }
    renderAll();
}

// ===== RENDER ALL =====
function renderAll() {
    renderDashboard();
    renderKatalog();
    renderPelanggan();
    renderTransaksi();
    renderCalendar();
    renderLaporan();
    lucide.createIcons();
}

// ===== STATUS BADGE =====
function statusBadge(s) {
    var m = {
        'Menunggu Pembayaran': 'badge-waiting',
        'Sudah Bayar DP':     'badge-dp',
        'Sedang Disewa':      'badge-active',
        'Diantar':            'badge-delivery',
        'Dikembalikan':       'badge-returned',
        'Selesai':            'badge-done',
        'Dibatalkan':         'badge-cancelled'
    };
    return '<span class="badge ' + (m[s]||'badge-waiting') + '">' + s + '</span>';
}

// =============================================================
// DASHBOARD
// =============================================================
function renderDashboard() {
    var stats = getStats();
    document.getElementById('dash-revenue').innerText = formatRp(stats.monthRevenue);
    document.getElementById('dash-orders').innerText = stats.activeOrders;
    document.getElementById('dash-available').innerText = stats.availableItems;
    document.getElementById('dash-customers').innerText = stats.totalCustomers;

    // Transaksi terbaru (5)
    var recent = ordersData.slice().reverse().slice(0, 5);
    var tbody = document.getElementById('dash-recent-tbody');
    if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>';
    } else {
        var h = '';
        for (var i = 0; i < recent.length; i++) {
            var o = recent[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
            h += '<tr class="border-b border-gray-50">';
            h += '<td class="p-3 text-sm font-medium text-indigo-700">' + o.id + '</td>';
            h += '<td class="p-3 text-sm text-gray-700">' + c.name + '</td>';
            h += '<td class="p-3 text-sm text-gray-500">' + it.name + '</td>';
            h += '<td class="p-3 text-sm font-medium">' + formatRp(o.total) + '</td>';
            h += '<td class="p-3 text-sm">' + statusBadge(o.status) + '</td></tr>';
        }
        tbody.innerHTML = h;
    }

    // Top 3 alat laris
    var topItems = getTopItems(3);
    var topHtml = '';
    for (var i = 0; i < topItems.length; i++) {
        var t = topItems[i];
        topHtml += '<div class="flex items-center justify-between py-2 ' + (i < topItems.length-1 ? 'border-b border-gray-50' : '') + '">';
        topHtml += '<div><span class="text-sm font-medium text-gray-800">' + t.name + '</span>';
        topHtml += '<span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit disewa</span></div>';
        topHtml += '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
    }
    var topEl = document.getElementById('dash-top-items');
    if (topEl) topEl.innerHTML = topHtml || '<p class="text-sm text-gray-400">Belum ada data</p>';
}

// =============================================================
// KATALOG ALAT
// =============================================================
function renderKatalog() {
    var el = document.getElementById('search-katalog');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.name.toLowerCase().indexOf(q) !== -1 ||
            it.category.toLowerCase().indexOf(q) !== -1 ||
            it.id.toLowerCase().indexOf(q) !== -1) f.push(it);
    }
    var tbody = document.getElementById('katalog-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada alat ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var it = f[i], ri = inventoryData.indexOf(it);
        var ac = it.available > 0 ? 'text-green-600' : 'text-red-600';
        var condCls = it.condition === 'Baik' ? 'badge-done' : (it.condition === 'Rusak' ? 'badge-cancelled' : 'badge-waiting');

        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + it.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + it.name + '</td>';
        h += '<td class="p-4 text-sm"><span class="badge badge-active">' + it.category + '</span></td>';
        h += '<td class="p-4 text-sm text-gray-600 text-center">' + it.stock + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center ' + ac + '">' + it.available + '</td>';
        h += '<td class="p-4 text-sm text-gray-700 font-medium">' + formatRp(it.price) + '</td>';
        h += '<td class="p-4 text-sm"><span class="badge ' + condCls + '">' + (it.condition || 'Baik') + '</span></td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editAlat(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteAlat(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

// CRUD Alat
function openAlatModal() {
    document.getElementById('modal-alat-title').innerText = 'Tambah Alat';
    document.getElementById('alat-edit-index').value = -1;
    document.getElementById('form-alat').reset();
    openModal('modal-alat');
}

function editAlat(idx) {
    var it = inventoryData[idx];
    document.getElementById('modal-alat-title').innerText = 'Edit Alat';
    document.getElementById('alat-edit-index').value = idx;
    document.getElementById('alat-nama').value = it.name;
    document.getElementById('alat-kategori').value = it.category;
    document.getElementById('alat-stok').value = it.stock;
    document.getElementById('alat-harga').value = it.price;
    document.getElementById('alat-kondisi').value = it.condition || 'Baik';
    document.getElementById('alat-keterangan').value = it.description || '';
    openModal('modal-alat');
}

function saveAlat(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('alat-edit-index').value);
    var d = {
        name: document.getElementById('alat-nama').value,
        category: document.getElementById('alat-kategori').value,
        stock: parseInt(document.getElementById('alat-stok').value),
        price: parseInt(document.getElementById('alat-harga').value),
        condition: document.getElementById('alat-kondisi').value,
        description: document.getElementById('alat-keterangan').value
    };
    if (idx === -1) {
        d.id = generateId('EQ', inventoryData);
        d.available = d.stock;
        inventoryData.push(d);
        syncToSheet('add', 'Alat', d);
        showToast('Alat "' + d.name + '" berhasil ditambah');
    } else {
        inventoryData[idx].name = d.name;
        inventoryData[idx].category = d.category;
        inventoryData[idx].stock = d.stock;
        inventoryData[idx].price = d.price;
        inventoryData[idx].condition = d.condition;
        inventoryData[idx].description = d.description;
        recalcAvailableStock();
        syncToSheet('update', 'Alat', inventoryData[idx]);
        syncAvailableStock();
        showToast('Alat "' + d.name + '" berhasil diupdate');
    }
    closeModal('modal-alat');
    renderAll();
}

function deleteAlat(idx) {
    if (!confirm('Hapus alat "' + inventoryData[idx].name + '"?')) return;
    syncToSheet('delete', 'Alat', { id: inventoryData[idx].id });
    showToast('Alat "' + inventoryData[idx].name + '" dihapus');
    inventoryData.splice(idx, 1);
    renderAll();
}

// =============================================================
// PELANGGAN
// =============================================================
function renderPelanggan() {
    var el = document.getElementById('search-pelanggan');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < customersData.length; i++) {
        var c = customersData[i];
        if (c.name.toLowerCase().indexOf(q) !== -1 ||
            String(c.phone).indexOf(q) !== -1 ||
            c.id.toLowerCase().indexOf(q) !== -1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada pelanggan ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var c = f[i], ri = customersData.indexOf(c), oc = 0;
        for (var j = 0; j < ordersData.length; j++) {
            if (ordersData[j].customerId === c.id) oc++;
        }
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + c.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + c.name + '</td>';
        h += '<td class="p-4 text-sm text-gray-600">' + c.phone + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.email || '-') + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.address || '-') + (c.city ? ', ' + c.city : '') + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center">' + oc + '</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editCustomer(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteCustomer(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

function openCustomerModal() {
    document.getElementById('modal-pelanggan-title').innerText = 'Tambah Pelanggan';
    document.getElementById('cust-edit-index').value = -1;
    document.getElementById('form-pelanggan').reset();
    openModal('modal-pelanggan');
}

function editCustomer(idx) {
    var c = customersData[idx];
    document.getElementById('modal-pelanggan-title').innerText = 'Edit Pelanggan';
    document.getElementById('cust-edit-index').value = idx;
    document.getElementById('cust-nama').value = c.name;
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-email').value = c.email || '';
    document.getElementById('cust-alamat').value = c.address || '';
    document.getElementById('cust-kota').value = c.city || 'Semarang';
    document.getElementById('cust-catatan').value = c.notes || '';
    openModal('modal-pelanggan');
}

function saveCustomer(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('cust-edit-index').value);
    var d = {
        name: document.getElementById('cust-nama').value,
        phone: document.getElementById('cust-phone').value,
        email: document.getElementById('cust-email').value,
        address: document.getElementById('cust-alamat').value,
        city: document.getElementById('cust-kota').value,
        notes: document.getElementById('cust-catatan').value
    };
    if (idx === -1) {
        d.id = generateId('CST', customersData);
        customersData.push(d);
        syncToSheet('add', 'Pelanggan', d);
        showToast('Pelanggan "' + d.name + '" berhasil ditambah');
    } else {
        customersData[idx].name = d.name;
        customersData[idx].phone = d.phone;
        customersData[idx].email = d.email;
        customersData[idx].address = d.address;
        customersData[idx].city = d.city;
        customersData[idx].notes = d.notes;
        syncToSheet('update', 'Pelanggan', customersData[idx]);
        showToast('Pelanggan "' + d.name + '" berhasil diupdate');
    }
    closeModal('modal-pelanggan');
    renderAll();
}

function deleteCustomer(idx) {
    if (!confirm('Hapus pelanggan "' + customersData[idx].name + '"?')) return;
    syncToSheet('delete', 'Pelanggan', { id: customersData[idx].id });
    showToast('Pelanggan "' + customersData[idx].name + '" dihapus');
    customersData.splice(idx, 1);
    renderAll();
}

