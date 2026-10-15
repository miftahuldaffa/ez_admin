
// ============================================================
// APP.JS — Eztafest Admin Dashboard v2 COMPLETE
// Bagian 1: Init, Sidebar, Dashboard, Katalog, Pelanggan,
//           Transaksi, Payment, Order, Pengeluaran, Kalender, Invoice
// ============================================================
var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var selectedOrderForInvoice = null;
var calendarFilter = 'all';
var selectedCalDate = '';

document.addEventListener('DOMContentLoaded', async function() {
    await loadFromSheet();
    lucide.createIcons();
    document.getElementById('current-date').innerText = formatDateFull(getTodayStr());
    initYearFilters();
    renderAll();
});

function initYearFilters() {
    var now = new Date(), cy = now.getFullYear();
    var ids = ['dash-year','lap-year'];
    for (var k = 0; k < ids.length; k++) {
        var el = document.getElementById(ids[k]);
        if (!el) continue;
        var h = '';
        for (var y = cy - 2; y <= cy + 1; y++) {
            h += '<option value="' + y + '"' + (y === cy ? ' selected' : '') + '>' + y + '</option>';
        }
        el.innerHTML = h;
    }
    var dm = document.getElementById('dash-month');
    if (dm) dm.value = String(now.getMonth());
    var lm = document.getElementById('lap-month');
    if (lm) lm.value = String(now.getMonth());
}

function toggleSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sidebar-overlay');
    if (window.innerWidth <= 768) {
        sb.classList.toggle('mobile-open');
        ov.classList.toggle('hidden');
    } else {
        sb.classList.toggle('collapsed');
    }
}

function switchTab(id) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
    var titles = {
        dashboard: 'Dashboard', katalog: 'Katalog Alat', pelanggan: 'Pelanggan',
        transaksi: 'Transaksi', pengeluaran: 'Pengeluaran',
        kalender: 'Kalender Sewa', laporan: 'Laporan'
    };
    document.getElementById('page-title').innerText = titles[id] || '';
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('onclick') === "switchTab('" + id + "')") btns[i].classList.add('active');
    }
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }
    renderAll();
}

function renderAll() {
    renderDashboard();
    renderKatalog();
    renderPelanggan();
    renderTransaksi();
    renderPengeluaran();
    renderCalendar();
    renderLaporan();
    lucide.createIcons();
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function statusBadge(s) {
    var m = {
        'Menunggu Pembayaran': 'badge-waiting', 'Sudah Bayar DP': 'badge-dp',
        'Sedang Disewa': 'badge-active', 'Diantar': 'badge-delivery',
        'Dikembalikan': 'badge-returned', 'Selesai': 'badge-done', 'Dibatalkan': 'badge-cancelled'
    };
    return '<span class="badge ' + (m[s] || 'badge-waiting') + '">' + s + '</span>';
}

function showToast(msg) {
    var c = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast-item';
    t.innerHTML = '<span>✅</span> ' + msg;
    c.appendChild(t);
    setTimeout(function() { t.classList.add('toast-fade'); }, 2500);
    setTimeout(function() { t.remove(); }, 3000);
}

function getFilterMonth(prefix) {
    var mEl = document.getElementById(prefix + '-month');
    var yEl = document.getElementById(prefix + '-year');
    return { month: mEl ? mEl.value : '', year: yEl ? parseInt(yEl.value) : new Date().getFullYear() };
}

function matchesFilter(dateStr, filter) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (d.getFullYear() !== filter.year) return false;
    if (filter.month !== '' && d.getMonth() !== parseInt(filter.month)) return false;
    return true;
}

// ======================== DASHBOARD ========================
function renderDashboard() {
    var f = getFilterMonth('dash');
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var label = f.month !== '' ? mn[parseInt(f.month)] + ' ' + f.year : 'Tahun ' + f.year;
    var labelEl = document.getElementById('dash-period-label');
    if (labelEl) labelEl.innerText = label;

    var activeStatuses = ['Menunggu Pembayaran','Sudah Bayar DP','Sedang Disewa','Diantar'];
    var revenue = 0, activeOrders = 0, availableItems = 0;

    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan' && matchesFilter(o.createdDate, f)) revenue += Number(o.total) || 0;
        if (activeStatuses.indexOf(o.status) !== -1) activeOrders++;
    }
    for (var i = 0; i < inventoryData.length; i++) availableItems += Number(inventoryData[i].available) || 0;

    document.getElementById('stat-revenue').innerText = formatRp(revenue);
    document.getElementById('stat-orders').innerText = activeOrders;
    document.getElementById('stat-items').innerText = availableItems;
    document.getElementById('stat-customers').innerText = customersData.length;

    // Recent transactions
    var filtered = [];
    for (var i = ordersData.length - 1; i >= 0; i--) {
        if (matchesFilter(ordersData[i].createdDate, f)) filtered.push(ordersData[i]);
        if (filtered.length >= 5) break;
    }
    var tbody = document.getElementById('recent-transactions');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>';
    } else {
        var h = '';
        for (var i = 0; i < filtered.length; i++) {
            var o = filtered[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
            h += '<tr class="border-b border-gray-50"><td class="p-3 text-sm font-medium text-indigo-700">' + o.id + '</td><td class="p-3 text-sm">' + c.name + '</td><td class="p-3 text-sm text-gray-500">' + it.name + '</td><td class="p-3 text-sm font-medium">' + formatRp(o.total) + '</td><td class="p-3 text-sm">' + statusBadge(o.status) + '</td></tr>';
        }
        tbody.innerHTML = h;
    }

    // Top Items Dashboard
    var itemCount = {};
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan' && matchesFilter(o.createdDate, f)) {
            if (!itemCount[o.itemId]) itemCount[o.itemId] = { qty: 0, revenue: 0 };
            itemCount[o.itemId].qty += Number(o.qty) || 0;
            itemCount[o.itemId].revenue += Number(o.total) || 0;
        }
    }
    var topArr = [];
    for (var id in itemCount) {
        var item = getItemById(id);
        topArr.push({ name: item.name, qty: itemCount[id].qty, revenue: itemCount[id].revenue });
    }
    topArr.sort(function(a, b) { return b.qty - a.qty; });
    var topEl = document.getElementById('top-items-dashboard');
    if (topEl) {
        var th = '';
        for (var i = 0; i < Math.min(3, topArr.length); i++) {
            var t = topArr[i];
            th += '<div class="flex items-center justify-between py-2 ' + (i < Math.min(3, topArr.length) - 1 ? 'border-b border-gray-50' : '') + '"><div><span class="text-sm font-medium text-gray-800">' + t.name + '</span><span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit disewa</span></div><span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
        }
        topEl.innerHTML = th || '<p class="text-sm text-gray-400">Belum ada data</p>';
    }
}

// ======================== KATALOG ========================
function renderKatalog() {
    var el = document.getElementById('search-katalog'), q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.name.toLowerCase().indexOf(q) !== -1 || it.category.toLowerCase().indexOf(q) !== -1 || it.id.toLowerCase().indexOf(q) !== -1) f.push(it);
    }
    var tbody = document.getElementById('katalog-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada alat</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var it = f[i], ri = inventoryData.indexOf(it);
        var ac = it.available > 0 ? 'text-green-600' : 'text-red-600';
        var cc = it.condition === 'Baik' ? 'badge-done' : (it.condition === 'Rusak' ? 'badge-cancelled' : 'badge-waiting');
        h += '<tr class="border-b border-gray-50"><td class="p-4 text-sm font-medium text-indigo-700">' + it.id + '</td><td class="p-4 text-sm font-medium">' + it.name + '</td><td class="p-4 text-sm"><span class="badge badge-active">' + it.category + '</span></td><td class="p-4 text-sm text-center">' + it.stock + '</td><td class="p-4 text-sm font-semibold text-center ' + ac + '">' + it.available + '</td><td class="p-4 text-sm font-medium">' + formatRp(it.price) + '</td><td class="p-4 text-sm"><span class="badge ' + cc + '">' + (it.condition || 'Baik') + '</span></td><td class="p-4 text-sm"><button onclick="editAlat(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button><button onclick="deleteAlat(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>';
    }
    tbody.innerHTML = h;
}

function openModalAlat() {
    document.getElementById('modal-alat-title').innerText = 'Tambah Alat';
    document.getElementById('alat-edit-id').value = '';
    document.getElementById('alat-nama').value = '';
    document.getElementById('alat-kategori').value = 'Sound System';
    document.getElementById('alat-stok').value = '';
    document.getElementById('alat-harga').value = '';
    document.getElementById('alat-kondisi').value = 'Baik';
    document.getElementById('alat-keterangan').value = '';
    openModal('modal-alat');
}

function editAlat(idx) {
    var it = inventoryData[idx];
    document.getElementById('modal-alat-title').innerText = 'Edit Alat';
    document.getElementById('alat-edit-id').value = idx;
    document.getElementById('alat-nama').value = it.name;
    document.getElementById('alat-kategori').value = it.category;
    document.getElementById('alat-stok').value = it.stock;
    document.getElementById('alat-harga').value = it.price;
    document.getElementById('alat-kondisi').value = it.condition || 'Baik';
    document.getElementById('alat-keterangan').value = it.description || '';
    openModal('modal-alat');
}

function saveAlat() {
    var idxVal = document.getElementById('alat-edit-id').value;
    var idx = idxVal !== '' ? parseInt(idxVal) : -1;
    var d = {
        name: document.getElementById('alat-nama').value,
        category: document.getElementById('alat-kategori').value,
        stock: parseInt(document.getElementById('alat-stok').value) || 0,
        price: parseInt(document.getElementById('alat-harga').value) || 0,
        condition: document.getElementById('alat-kondisi').value,
        description: document.getElementById('alat-keterangan').value
    };
    if (!d.name) { alert('Nama alat harus diisi'); return; }
    if (idx === -1 || isNaN(idx)) {
        d.id = generateId('EQ', inventoryData);
        d.available = d.stock;
        inventoryData.push(d);
        syncToSheet('add', 'Alat', d);
        showToast('Alat "' + d.name + '" ditambah');
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
        showToast('Alat "' + d.name + '" diupdate');
    }
    closeModal('modal-alat');
    renderAll();
}

function deleteAlat(idx) {
    if (!confirm('Hapus alat "' + inventoryData[idx].name + '"?')) return;
    syncToSheet('delete', 'Alat', { id: inventoryData[idx].id });
    showToast('Alat dihapus');
    inventoryData.splice(idx, 1);
    renderAll();
}

// ======================== PELANGGAN ========================
function renderPelanggan() {
    var el = document.getElementById('search-pelanggan'), q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < customersData.length; i++) {
        var c = customersData[i];
        if (c.name.toLowerCase().indexOf(q) !== -1 || String(c.phone).indexOf(q) !== -1 || c.id.toLowerCase().indexOf(q) !== -1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada pelanggan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var c = f[i], ri = customersData.indexOf(c), oc = 0;
        for (var j = 0; j < ordersData.length; j++) { if (ordersData[j].customerId === c.id) oc++; }
        h += '<tr class="border-b border-gray-50"><td class="p-4 text-sm font-medium text-indigo-700">' + c.id + '</td><td class="p-4 text-sm font-medium">' + c.name + '</td><td class="p-4 text-sm">' + c.phone + '</td><td class="p-4 text-sm text-gray-500">' + (c.email || '-') + '</td><td class="p-4 text-sm text-gray-500">' + (c.address || '-') + (c.city ? ', ' + c.city : '') + '</td><td class="p-4 text-sm font-semibold text-center">' + oc + '</td><td class="p-4 text-sm"><button onclick="editPelanggan(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button><button onclick="deletePelanggan(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>';
    }
    tbody.innerHTML = h;
}

function openModalPelanggan() {
    document.getElementById('modal-pelanggan-title').innerText = 'Tambah Pelanggan';
    document.getElementById('pel-edit-id').value = '';
    document.getElementById('pel-nama').value = '';
    document.getElementById('pel-phone').value = '';
    document.getElementById('pel-email').value = '';
    document.getElementById('pel-alamat').value = '';
    document.getElementById('pel-kota').value = 'Semarang';
    document.getElementById('pel-catatan').value = '';
    openModal('modal-pelanggan');
}

function editPelanggan(idx) {
    var c = customersData[idx];
    document.getElementById('modal-pelanggan-title').innerText = 'Edit Pelanggan';
    document.getElementById('pel-edit-id').value = idx;
    document.getElementById('pel-nama').value = c.name;
    document.getElementById('pel-phone').value = c.phone;
    document.getElementById('pel-email').value = c.email || '';
    document.getElementById('pel-alamat').value = c.address || '';
    document.getElementById('pel-kota').value = c.city || 'Semarang';
    document.getElementById('pel-catatan').value = c.notes || '';
    openModal('modal-pelanggan');
}

function savePelanggan() {
    var idxVal = document.getElementById('pel-edit-id').value;
    var idx = idxVal !== '' ? parseInt(idxVal) : -1;
    var d = {
        name: document.getElementById('pel-nama').value,
        phone: document.getElementById('pel-phone').value,
        email: document.getElementById('pel-email').value,
        address: document.getElementById('pel-alamat').value,
        city: document.getElementById('pel-kota').value,
        notes: document.getElementById('pel-catatan').value
    };
    if (!d.name || !d.phone) { alert('Nama dan WhatsApp harus diisi'); return; }
    if (idx === -1 || isNaN(idx)) {
        d.id = generateId('CST', customersData);
        customersData.push(d);
        syncToSheet('add', 'Pelanggan', d);
        showToast('Pelanggan ditambah');
    } else {
        customersData[idx].name = d.name;
        customersData[idx].phone = d.phone;
        customersData[idx].email = d.email;
        customersData[idx].address = d.address;
        customersData[idx].city = d.city;
        customersData[idx].notes = d.notes;
        syncToSheet('update', 'Pelanggan', customersData[idx]);
        showToast('Pelanggan diupdate');
    }
    closeModal('modal-pelanggan');
    renderAll();
}

function deletePelanggan(idx) {
    if (!confirm('Hapus "' + customersData[idx].name + '"?')) return;
    syncToSheet('delete', 'Pelanggan', { id: customersData[idx].id });
    showToast('Pelanggan dihapus');
    customersData.splice(idx, 1);
    renderAll();
}

// ======================== TRANSAKSI ========================
function renderTransaksi() {
    var sEl = document.getElementById('search-order'), q = sEl ? sEl.value.toLowerCase() : '';
    var fEl = document.getElementById('filter-status'), sf = fEl ? fEl.value : '';
    var f = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        if ((o.id.toLowerCase().indexOf(q) !== -1 || c.name.toLowerCase().indexOf(q) !== -1 || it.name.toLowerCase().indexOf(q) !== -1) && (!sf || o.status === sf)) f.push(o);
    }
    var tbody = document.getElementById('order-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada transaksi</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var o = f[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId), ri = ordersData.indexOf(o);
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-3 text-sm font-medium text-indigo-700">' + o.id + '</td>';
        h += '<td class="p-3 text-sm"><div class="font-medium">' + c.name + '</div><div class="text-xs text-gray-400">' + c.phone + '</div></td>';
        h += '<td class="p-3 text-sm">' + it.name + '<span class="text-xs text-gray-400 ml-1">x' + o.qty + '</span></td>';
        h += '<td class="p-3 text-sm text-gray-600"><div>' + formatDateID(o.startDate) + '</div><div class="text-xs text-gray-400">s/d ' + formatDateID(o.endDate) + '</div></td>';
        h += '<td class="p-3 text-sm font-semibold">' + formatRp(o.total) + '</td>';
        h += '<td class="p-3 text-sm">';
        if (o.dp > 0) h += '<div class="text-xs text-green-600">DP: ' + formatRp(o.dp) + '</div>';
        if (o.remaining > 0) h += '<div class="text-xs text-red-600">Sisa: ' + formatRp(o.remaining) + '</div>';
        if (o.remaining <= 0 && o.dp > 0) h += '<div class="text-xs text-green-600 font-bold">✅ LUNAS</div>';
        h += '</td>';
        h += '<td class="p-3 text-sm">' + statusBadge(o.status) + '</td>';
        h += '<td class="p-3 text-sm">';
        if (o.notes) h += '<div class="text-xs text-gray-400 max-w-[120px] truncate" title="' + o.notes + '">' + o.notes + '</div>';
        h += '</td>';
        h += '<td class="p-3 text-sm"><div class="flex items-center gap-1 flex-wrap">';
        if (o.remaining > 0 && o.status !== 'Dibatalkan' && o.status !== 'Selesai') {
            h += '<button onclick="openPaymentModal(' + ri + ')" class="action-btn action-btn-payment" title="Update Pembayaran"><i data-lucide="credit-card" class="w-3.5 h-3.5"></i></button>';
        }
        h += '<button onclick="openInvoice(' + ri + ')" class="action-btn action-btn-invoice"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></button>';
        h += '<select onchange="changeStatus(' + ri + ',this.value)" class="text-xs border rounded-lg px-1 py-1">';
        h += '<option value="" disabled selected>Status</option>';
        h += '<option value="Menunggu Pembayaran">Menunggu</option>';
        h += '<option value="Sudah Bayar DP">DP</option>';
        h += '<option value="Sedang Disewa">Disewa</option>';
        h += '<option value="Diantar">Antar</option>';
        h += '<option value="Dikembalikan">Kembali</option>';
        h += '<option value="Selesai">Selesai</option>';
        h += '<option value="Dibatalkan">Batal</option>';
        h += '</select></div></td></tr>';
    }
    tbody.innerHTML = h;
}

function changeStatus(idx, val) {
    if (!val) return;
    ordersData[idx].status = val;
    recalcAvailableStock();
    syncToSheet('update', 'Transaksi', ordersData[idx]);
    syncAvailableStock();
    showToast('Status ' + ordersData[idx].id + ' → ' + val);
    renderAll();
}

// ======================== EDIT PEMBAYARAN ========================
function openPaymentModal(idx) {
    var o = ordersData[idx];
    document.getElementById('pay-idx').value = idx;
    document.getElementById('pay-order-id').innerText = o.id;
    document.getElementById('pay-total').innerText = formatRp(o.total);
    document.getElementById('pay-old-dp').innerText = formatRp(o.dp);
    document.getElementById('pay-old-remaining').innerText = formatRp(o.remaining);
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-new-dp').innerText = formatRp(o.dp);
    document.getElementById('pay-new-remaining').innerText = formatRp(o.remaining);
    document.getElementById('pay-new-status').innerHTML = statusBadge(o.status);
    openModal('modal-payment');
}

function previewPayment() {
    var idx = parseInt(document.getElementById('pay-idx').value);
    var o = ordersData[idx];
    var add = parseInt(document.getElementById('pay-amount').value) || 0;
    var nd = (Number(o.dp) || 0) + add;
    var nr = Math.max(0, (Number(o.total) || 0) - nd);
    var ns = o.status;
    if (nr <= 0) ns = 'Sedang Disewa';
    else if (nd > 0 && o.status === 'Menunggu Pembayaran') ns = 'Sudah Bayar DP';
    document.getElementById('pay-new-dp').innerText = formatRp(nd);
    document.getElementById('pay-new-remaining').innerText = formatRp(nr);
    document.getElementById('pay-new-status').innerHTML = statusBadge(ns);
}

function savePayment() {
    var idx = parseInt(document.getElementById('pay-idx').value);
    var o = ordersData[idx];
    var add = parseInt(document.getElementById('pay-amount').value) || 0;
    if (add <= 0) { alert('Masukkan jumlah pembayaran'); return; }
    var nd = (Number(o.dp) || 0) + add;
    var nr = Math.max(0, (Number(o.total) || 0) - nd);
    ordersData[idx].dp = nd;
    ordersData[idx].remaining = nr;
    if (nr <= 0) ordersData[idx].status = 'Sedang Disewa';
    else if (nd > 0 && o.status === 'Menunggu Pembayaran') ordersData[idx].status = 'Sudah Bayar DP';
    syncToSheet('update', 'Transaksi', ordersData[idx]);
    showToast('Pembayaran ' + o.id + ' diupdate');
    closeModal('modal-payment');
    renderAll();
}

// ======================== BUAT PESANAN ========================
function openModalOrder() {
    document.getElementById('ord-qty').value = 1;
    document.getElementById('ord-start').value = '';
    document.getElementById('ord-end').value = '';
    document.getElementById('ord-discount').value = 0;
    document.getElementById('ord-shipping').value = 0;
    document.getElementById('ord-dp').value = 0;
    document.getElementById('ord-notes').value = '';
    document.getElementById('ord-preview-subtotal').innerText = 'Rp 0';
    document.getElementById('ord-preview-total').innerText = 'Rp 0';
    document.getElementById('ord-preview-remaining').innerText = 'Rp 0';
    var cs = document.getElementById('ord-customer');
    var ch = '<option value="" disabled selected>Pilih Pelanggan</option>';
    for (var i = 0; i < customersData.length; i++) {
        ch += '<option value="' + customersData[i].id + '">' + customersData[i].name + ' (' + customersData[i].phone + ')</option>';
    }
    cs.innerHTML = ch;
    var is = document.getElementById('ord-item');
    var ih = '<option value="" disabled selected>Pilih Alat</option>';
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.available > 0) {
            ih += '<option value="' + it.id + '" data-price="' + it.price + '" data-avail="' + it.available + '">' + it.name + ' — ' + formatRp(it.price) + '/hari (sisa: ' + it.available + ')</option>';
        }
    }
    is.innerHTML = ih;
    openModal('modal-order');
}

function calcOrderPreview() {
    var is = document.getElementById('ord-item');
    var sel = is.options[is.selectedIndex];
    if (!sel || !sel.dataset.price) return;
    var price = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('ord-qty').value) || 1;
    var start = document.getElementById('ord-start').value;
    var end = document.getElementById('ord-end').value;
    var days = (start && end) ? getDaysBetween(start, end) : 1;
    var discount = parseInt(document.getElementById('ord-discount').value) || 0;
    var shipping = parseInt(document.getElementById('ord-shipping').value) || 0;
    var dp = parseInt(document.getElementById('ord-dp').value) || 0;
    var calc = calcOrderTotal(price, qty, days, discount, shipping);
    var sisa = Math.max(0, calc.total - dp);
    document.getElementById('ord-preview-subtotal').innerText = formatRp(calc.subtotal);
    document.getElementById('ord-preview-total').innerText = formatRp(calc.total);
    document.getElementById('ord-preview-remaining').innerText = formatRp(sisa);
}

function saveOrder() {
    var custId = document.getElementById('ord-customer').value;
    var is = document.getElementById('ord-item');
    var sel = is.options[is.selectedIndex];
    if (!custId || !sel || !sel.value) { alert('Pilih pelanggan dan alat'); return; }
    var price = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('ord-qty').value) || 1;
    var sd = document.getElementById('ord-start').value;
    var ed = document.getElementById('ord-end').value;
    if (!sd || !ed) { alert('Tanggal harus diisi'); return; }
    var days = getDaysBetween(sd, ed);
    var discount = parseInt(document.getElementById('ord-discount').value) || 0;
    var shipping = parseInt(document.getElementById('ord-shipping').value) || 0;
    var dp = parseInt(document.getElementById('ord-dp').value) || 0;
    var notes = document.getElementById('ord-notes').value;
    var ma = parseInt(sel.dataset.avail);
    if (qty > ma) { alert('Melebihi stok (' + ma + ')'); return; }
    var calc = calcOrderTotal(price, qty, days, discount, shipping);
    var remaining = Math.max(0, calc.total - dp);
    var status = dp >= calc.total ? 'Sedang Disewa' : (dp > 0 ? 'Sudah Bayar DP' : 'Menunggu Pembayaran');
    var od = {
        id: generateId('ORD', ordersData), customerId: custId,
        itemId: document.getElementById('ord-item').value,
        qty: qty, startDate: sd, endDate: ed,
        subtotal: calc.subtotal, discount: discount, shipping: shipping,
        total: calc.total, dp: dp, remaining: remaining,
        status: status, notes: notes, createdDate: getTodayStr()
    };
    ordersData.push(od);
    recalcAvailableStock();
    syncToSheet('add', 'Transaksi', od);
    syncAvailableStock();
    showToast('Pesanan ' + od.id + ' dibuat');
    closeModal('modal-order');
    renderAll();
}

// ======================== PENGELUARAN ========================
function renderPengeluaran() {
    var sEl = document.getElementById('search-expense'), q = sEl ? sEl.value.toLowerCase() : '';
    var cEl = document.getElementById('filter-expense-cat'), cf = cEl ? cEl.value : '';
    var f = [];
    for (var i = 0; i < pengeluaranData.length; i++) {
        var e = pengeluaranData[i];
        if (((e.description || '').toLowerCase().indexOf(q) !== -1 || (e.vendor || '').toLowerCase().indexOf(q) !== -1 || (e.id || '').toLowerCase().indexOf(q) !== -1) && (!cf || e.category === cf)) f.push(e);
    }
    var tbody = document.getElementById('expense-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada pengeluaran</td></tr>'; return; }
    var h = '', total = 0;
    for (var i = 0; i < f.length; i++) {
        var e = f[i], ri = pengeluaranData.indexOf(e);
        total += Number(e.amount) || 0;
        h += '<tr class="border-b border-gray-50"><td class="p-3 text-sm font-medium text-red-600">' + e.id + '</td><td class="p-3 text-sm">' + formatDateID(e.date) + '</td><td class="p-3 text-sm"><span class="badge badge-expense">' + (e.category || '-') + '</span></td><td class="p-3 text-sm">' + (e.description || '-') + '</td><td class="p-3 text-sm font-semibold text-red-600">' + formatRp(e.amount) + '</td><td class="p-3 text-sm">' + (e.vendor || '-') + '</td><td class="p-3 text-sm text-gray-400">' + (e.orderId || '-') + '</td><td class="p-3 text-sm">';
        if (e.notes) h += '<span class="text-xs">' + e.notes + '</span>';
        h += '</td><td class="p-3 text-sm"><button onclick="editPengeluaran(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button><button onclick="deletePengeluaran(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>';
    }
    tbody.innerHTML = h;
    var totEl = document.getElementById('expense-total');
    if (totEl) totEl.innerText = formatRp(total);
}

function openModalPengeluaran() {
    document.getElementById('modal-pengeluaran-title').innerText = 'Tambah Pengeluaran';
    document.getElementById('exp-edit-id').value = '';
    document.getElementById('exp-date').value = getTodayStr();
    document.getElementById('exp-category').value = 'Sewa Vendor';
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-vendor').value = '';
    document.getElementById('exp-notes').value = '';
    var os = document.getElementById('exp-order');
    var oh = '<option value="">Tidak terkait order</option>';
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i], c = getCustomerById(o.customerId);
        oh += '<option value="' + o.id + '">' + o.id + ' — ' + c.name + '</option>';
    }
    os.innerHTML = oh;
    openModal('modal-pengeluaran');
}

function editPengeluaran(idx) {
    var e = pengeluaranData[idx];
    document.getElementById('modal-pengeluaran-title').innerText = 'Edit Pengeluaran';
    document.getElementById('exp-edit-id').value = idx;
    document.getElementById('exp-date').value = e.date || '';
    document.getElementById('exp-category').value = e.category || 'Sewa Vendor';
    document.getElementById('exp-desc').value = e.description || '';
    document.getElementById('exp-amount').value = e.amount || '';
    document.getElementById('exp-vendor').value = e.vendor || '';
    document.getElementById('exp-notes').value = e.notes || '';
    var os = document.getElementById('exp-order');
    var oh = '<option value="">Tidak terkait order</option>';
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i], c = getCustomerById(o.customerId);
        oh += '<option value="' + o.id + '"' + (e.orderId === o.id ? ' selected' : '') + '>' + o.id + ' — ' + c.name + '</option>';
    }
    os.innerHTML = oh;
    openModal('modal-pengeluaran');
}

function savePengeluaran() {
    var idxVal = document.getElementById('exp-edit-id').value;
    var idx = idxVal !== '' ? parseInt(idxVal) : -1;
    var d = {
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        description: document.getElementById('exp-desc').value,
        amount: parseInt(document.getElementById('exp-amount').value) || 0,
        vendor: document.getElementById('exp-vendor').value,
        orderId: document.getElementById('exp-order').value,
        notes: document.getElementById('exp-notes').value
    };
    if (!d.description || !d.amount) { alert('Deskripsi dan jumlah harus diisi'); return; }
    if (idx === -1 || isNaN(idx)) {
        d.id = generateId('EXP', pengeluaranData);
        pengeluaranData.push(d);
        syncToSheet('add', 'Pengeluaran', d);
        showToast('Pengeluaran ditambah');
    } else {
        pengeluaranData[idx].date = d.date;
        pengeluaranData[idx].category = d.category;
        pengeluaranData[idx].description = d.description;
        pengeluaranData[idx].amount = d.amount;
        pengeluaranData[idx].vendor = d.vendor;
        pengeluaranData[idx].orderId = d.orderId;
        pengeluaranData[idx].notes = d.notes;
        syncToSheet('update', 'Pengeluaran', pengeluaranData[idx]);
        showToast('Pengeluaran diupdate');
    }
    closeModal('modal-pengeluaran');
    renderAll();
}

function deletePengeluaran(idx) {
    if (!confirm('Hapus "' + pengeluaranData[idx].description + '"?')) return;
    syncToSheet('delete', 'Pengeluaran', { id: pengeluaranData[idx].id });
    showToast('Pengeluaran dihapus');
    pengeluaranData.splice(idx, 1);
    renderAll();
}

// ======================== KALENDER ========================
function filterCalendar(status) {
    calendarFilter = status;
    var btns = document.querySelectorAll('.cal-filter-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('cal-filter-active');
        if (btns[i].dataset.filter === status) btns[i].classList.add('cal-filter-active');
    }
    renderCalendar();
    lucide.createIcons();
}

function renderCalendar() {
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    document.getElementById('calendar-month-title').innerText = mn[currentMonth] + ' ' + currentYear;
    var grid = document.getElementById('calendar-grid');
    var dn = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    var html = '';
    for (var d = 0; d < dn.length; d++) html += '<div class="cal-header">' + dn[d] + '</div>';
    var fd = new Date(currentYear, currentMonth, 1).getDay();
    var td = new Date(currentYear, currentMonth + 1, 0).getDate();
    var todayStr = getTodayStr();
    for (var i = 0; i < fd; i++) html += '<div class="cal-day cal-empty"></div>';
    for (var day = 1; day <= td; day++) {
        var ds = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var isT = ds === todayStr, isSel = ds === selectedCalDate, bk = [];
        for (var b = 0; b < ordersData.length; b++) {
            var o = ordersData[b];
            if (o.status === 'Dibatalkan') continue;
            if (calendarFilter !== 'all' && o.status !== calendarFilter) continue;
            var oS = String(o.startDate).substring(0, 10), oE = String(o.endDate).substring(0, 10);
            if (ds >= oS && ds <= oE) bk.push(o);
        }
        var ev = '';
        for (var b = 0; b < bk.length; b++) {
            var bkg = bk[b], it = getItemById(bkg.itemId);
            var ecMap = { 'Menunggu Pembayaran':'cal-event-waiting', 'Sudah Bayar DP':'cal-event-dp', 'Sedang Disewa':'cal-event-active', 'Diantar':'cal-event-delivery', 'Dikembalikan':'cal-event-returned', 'Selesai':'cal-event-done' };
            var ec = ecMap[bkg.status] || 'cal-event-active';
            var oi = ordersData.indexOf(bkg), cust = getCustomerById(bkg.customerId);
            var label = it.name.length > 12 ? it.name.substring(0, 12) + '..' : it.name;
            ev += '<div onclick="event.stopPropagation();openInvoice(' + oi + ')" class="cal-event ' + ec + '" title="' + it.name + ' x' + bkg.qty + ' — ' + cust.name + '">' + label + '</div>';
        }
        var dayCls = 'cal-day';
        if (isT) dayCls += ' today';
        if (isSel) dayCls += ' cal-selected';
        if (bk.length > 0) dayCls += ' cal-has-event';
        html += '<div class="' + dayCls + '" onclick="selectCalDate(\'' + ds + '\')"><div class="day-num">' + day + '</div>' + ev + '</div>';
    }
    grid.innerHTML = html;
    renderCalendarDetail();
}

function selectCalDate(dateStr) {
    selectedCalDate = (selectedCalDate === dateStr) ? '' : dateStr;
    renderCalendar();
    lucide.createIcons();
}

function renderCalendarDetail() {
    var titleEl = document.getElementById('calendar-detail-title');
    var contentEl = document.getElementById('calendar-detail-content');
    if (!titleEl || !contentEl) return;
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    if (selectedCalDate) {
        var sd = new Date(selectedCalDate);
        titleEl.innerText = 'Booking ' + sd.getDate() + ' ' + mn[sd.getMonth()] + ' ' + sd.getFullYear();
    } else {
        titleEl.innerText = 'Semua Booking ' + mn[currentMonth] + ' ' + currentYear;
    }
    var filtered = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan') continue;
        if (calendarFilter !== 'all' && o.status !== calendarFilter) continue;
        var oS = String(o.startDate).substring(0, 10), oE = String(o.endDate).substring(0, 10);
        if (selectedCalDate) {
            if (selectedCalDate >= oS && selectedCalDate <= oE) filtered.push(o);
        } else {
            var ms = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
            if (oS.substring(0, 7) === ms || oE.substring(0, 7) === ms) filtered.push(o);
        }
    }
    if (!filtered.length) {
        contentEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Tidak ada booking</p>';
        return;
    }
    var h = '';
    for (var i = 0; i < filtered.length; i++) {
        var o = filtered[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId), oi = ordersData.indexOf(o);
        var bm = { 'Menunggu Pembayaran':'badge-waiting', 'Sudah Bayar DP':'badge-dp', 'Sedang Disewa':'badge-active', 'Diantar':'badge-delivery', 'Dikembalikan':'badge-returned', 'Selesai':'badge-done' };
        var bc = bm[o.status] || 'badge-waiting';
        h += '<div class="cal-detail-card" onclick="openInvoice(' + oi + ')"><div class="cal-detail-header"><span class="cal-detail-id">' + o.id + '</span><span class="badge ' + bc + '">' + o.status + '</span></div><div class="cal-detail-body">';
        h += '<div class="cal-detail-row"><i data-lucide="user" class="w-3.5 h-3.5"></i> ' + c.name + ' (' + c.phone + ')</div>';
        h += '<div class="cal-detail-row"><i data-lucide="package" class="w-3.5 h-3.5"></i> ' + it.name + ' x' + o.qty + '</div>';
        h += '<div class="cal-detail-row"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ' + formatDateID(o.startDate) + ' s/d ' + formatDateID(o.endDate) + '</div>';
        h += '<div class="cal-detail-row"><i data-lucide="banknote" class="w-3.5 h-3.5"></i> <strong>' + formatRp(o.total) + '</strong>';
        if (o.remaining > 0) h += ' <span class="text-red-500 text-xs">(Sisa: ' + formatRp(o.remaining) + ')</span>';
        h += '</div>';
        if (o.notes) h += '<div class="cal-detail-row"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> ' + o.notes + '</div>';
        h += '</div></div>';
    }
    contentEl.innerHTML = h;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    selectedCalDate = '';
    renderCalendar();
    lucide.createIcons();
}

// ======================== INVOICE ========================
function openInvoice(idx) {
    selectedOrderForInvoice = ordersData[idx];
    var o = selectedOrderForInvoice, c = getCustomerById(o.customerId), it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);
    document.getElementById('inv-id').innerText = '#' + o.id;
    document.getElementById('inv-date').innerText = formatDateFull(getTodayStr());
    document.getElementById('inv-cust-name').innerText = c.name;
    document.getElementById('inv-cust-phone').innerText = 'WA: ' + c.phone;
    document.getElementById('inv-cust-email').innerText = c.email || '';
    document.getElementById('inv-cust-address').innerText = (c.address || '') + (c.city ? ', ' + c.city : '');
    document.getElementById('inv-period').innerText = formatDateID(o.startDate) + ' s/d ' + formatDateID(o.endDate);
    document.getElementById('inv-days').innerText = days + ' hari sewa';
    document.getElementById('inv-items').innerHTML = '<tr class="border-b border-gray-100"><td class="p-3 text-sm">' + it.name + '<br><span class="text-xs text-gray-400">' + it.category + '</span></td><td class="p-3 text-sm text-center">' + o.qty + '</td><td class="p-3 text-sm text-center">' + days + '</td><td class="p-3 text-sm text-right">' + formatRp(it.price) + '</td><td class="p-3 text-sm text-right font-semibold">' + formatRp(o.subtotal) + '</td></tr>';
    document.getElementById('inv-subtotal').innerText = formatRp(o.subtotal);
    document.getElementById('inv-discount').innerText = '- ' + formatRp(o.discount);
    document.getElementById('inv-shipping').innerText = formatRp(o.shipping);
    document.getElementById('inv-total').innerText = formatRp(o.total);
    document.getElementById('inv-dp').innerText = formatRp(o.dp);
    document.getElementById('inv-remaining').innerText = formatRp(o.remaining);
    var stEl = document.getElementById('inv-status');
    if (stEl) stEl.innerHTML = statusBadge(o.status);
    var ntEl = document.getElementById('inv-notes');
    if (ntEl) ntEl.innerText = o.notes || '-';
    var sgEl = document.getElementById('inv-sig-name');
    if (sgEl) sgEl.innerText = c.name;
    openModal('modal-invoice');
}

function sendInvoiceWA() {
    if (!selectedOrderForInvoice) return;
    var o = selectedOrderForInvoice, c = getCustomerById(o.customerId), it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);
    var phone = String(c.phone).trim();
    if (phone.indexOf('08') === 0) phone = '62' + phone.substring(1);
    var msg = 'Halo *' + c.name + '*, berikut invoice dari *Eztafest*\n\n';
    msg += '*INVOICE ' + o.id + '*\n━━━━━━━━━━━━\n';
    msg += 'Alat: ' + it.name + '\nQty: ' + o.qty + ' unit\n';
    msg += 'Periode: ' + formatDateID(o.startDate) + ' s/d ' + formatDateID(o.endDate) + ' (' + days + ' hari)\n';
    msg += '━━━━━━━━━━━━\nSubtotal: ' + formatRp(o.subtotal) + '\n';
    if (o.discount > 0) msg += 'Diskon: -' + formatRp(o.discount) + '\n';
    if (o.shipping > 0) msg += 'Ongkir: ' + formatRp(o.shipping) + '\n';
    msg += '*Total: ' + formatRp(o.total) + '*\n';
    if (o.dp > 0) msg += 'DP: ' + formatRp(o.dp) + '\n';
    if (o.remaining > 0) msg += '*Sisa: ' + formatRp(o.remaining) + '*\n';
    msg += '━━━━━━━━━━━━\nTransfer: BCA 1234567890 a/n Eztafest\n\nTerima kasih! - Eztafest';
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
}


// ============================================================
// APP.JS — Bagian 2: Laporan, CashFlow, Export Excel, Export PDF
// GABUNG langsung setelah Bagian 1
// ============================================================

// ======================== LAPORAN ========================
function renderLaporan() {
    var f = getFilterMonth('lap');
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var totalRevenue = 0, totalOrders = 0, completedOrders = 0, totalExpense = 0;

    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (!matchesFilter(o.createdDate, f)) continue;
        if (o.status !== 'Dibatalkan') totalRevenue += Number(o.total) || 0;
        totalOrders++;
        if (o.status === 'Selesai') completedOrders++;
    }
    for (var i = 0; i < pengeluaranData.length; i++) {
        if (matchesFilter(pengeluaranData[i].date, f)) totalExpense += Number(pengeluaranData[i].amount) || 0;
    }

    var profit = totalRevenue - totalExpense;
    var profitClass = profit >= 0 ? 'text-green-600' : 'text-red-600';

    var sumEl = document.getElementById('laporan-summary');
    if (sumEl) {
        sumEl.innerHTML =
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
                '<p class="text-sm text-gray-500">Total Pemasukan</p>' +
                '<p class="text-2xl font-extrabold text-green-600 mt-1">' + formatRp(totalRevenue) + '</p>' +
                '<p class="text-xs text-gray-400 mt-1">' + totalOrders + ' pesanan</p>' +
            '</div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
                '<p class="text-sm text-gray-500">Total Pengeluaran</p>' +
                '<p class="text-2xl font-extrabold text-red-600 mt-1">' + formatRp(totalExpense) + '</p>' +
            '</div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
                '<p class="text-sm text-gray-500">Laba Bersih</p>' +
                '<p class="text-2xl font-extrabold ' + profitClass + ' mt-1">' + formatRp(profit) + '</p>' +
            '</div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
                '<p class="text-sm text-gray-500">Pesanan Selesai</p>' +
                '<p class="text-2xl font-extrabold text-gray-800 mt-1">' + completedOrders + '</p>' +
                '<p class="text-xs text-gray-400 mt-1">dari ' + totalOrders + ' total</p>' +
            '</div>';
    }

    renderCashFlow(f);

    // Status Breakdown
    var statusCount = {};
    var allSt = ['Menunggu Pembayaran','Sudah Bayar DP','Sedang Disewa','Diantar','Dikembalikan','Selesai','Dibatalkan'];
    for (var i = 0; i < allSt.length; i++) statusCount[allSt[i]] = 0;
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (!matchesFilter(o.createdDate, f)) continue;
        if (statusCount[o.status] !== undefined) statusCount[o.status]++;
    }
    var bMap = {
        'Menunggu Pembayaran':'badge-waiting', 'Sudah Bayar DP':'badge-dp',
        'Sedang Disewa':'badge-active', 'Diantar':'badge-delivery',
        'Dikembalikan':'badge-returned', 'Selesai':'badge-done', 'Dibatalkan':'badge-cancelled'
    };
    var sH = '';
    for (var i = 0; i < allSt.length; i++) {
        var s = allSt[i];
        sH += '<div class="flex items-center justify-between py-2 ' +
            (i < allSt.length - 1 ? 'border-b border-gray-50' : '') + '">' +
            '<span class="badge ' + bMap[s] + '">' + s + '</span>' +
            '<span class="text-sm font-bold text-gray-700">' + statusCount[s] + '</span></div>';
    }
    var stEl = document.getElementById('laporan-status');
    if (stEl) stEl.innerHTML = sH || '<p class="text-sm text-gray-400">Tidak ada data</p>';

    // Top Items
    var itemCount = {};
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan' || !matchesFilter(o.createdDate, f)) continue;
        if (!itemCount[o.itemId]) itemCount[o.itemId] = { qty: 0, revenue: 0 };
        itemCount[o.itemId].qty += Number(o.qty) || 0;
        itemCount[o.itemId].revenue += Number(o.total) || 0;
    }
    var topItems = [];
    for (var id in itemCount) {
        var it = getItemById(id);
        topItems.push({ name: it.name, qty: itemCount[id].qty, revenue: itemCount[id].revenue });
    }
    topItems.sort(function(a, b) { return b.qty - a.qty; });
    var tiH = '';
    for (var i = 0; i < Math.min(5, topItems.length); i++) {
        var t = topItems[i];
        tiH += '<div class="flex items-center justify-between py-2 ' +
            (i < Math.min(5, topItems.length) - 1 ? 'border-b border-gray-50' : '') + '">' +
            '<div><span class="text-sm font-medium text-gray-800">' + t.name + '</span>' +
            '<span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit</span></div>' +
            '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
    }
    var tiEl = document.getElementById('laporan-top-items');
    if (tiEl) tiEl.innerHTML = tiH || '<p class="text-sm text-gray-400">Belum ada data</p>';

    // Top Customers
    var custCount = {};
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan' || !matchesFilter(o.createdDate, f)) continue;
        if (!custCount[o.customerId]) custCount[o.customerId] = { orders: 0, revenue: 0 };
        custCount[o.customerId].orders++;
        custCount[o.customerId].revenue += Number(o.total) || 0;
    }
    var topCust = [];
    for (var id in custCount) {
        var c = getCustomerById(id);
        topCust.push({ name: c.name, orders: custCount[id].orders, revenue: custCount[id].revenue });
    }
    topCust.sort(function(a, b) { return b.revenue - a.revenue; });
    var tcH = '';
    for (var i = 0; i < Math.min(5, topCust.length); i++) {
        var t = topCust[i];
        tcH += '<div class="flex items-center justify-between py-2 ' +
            (i < Math.min(5, topCust.length) - 1 ? 'border-b border-gray-50' : '') + '">' +
            '<div><span class="text-sm font-medium text-gray-800">' + t.name + '</span>' +
            '<span class="text-xs text-gray-400 ml-2">' + t.orders + ' pesanan</span></div>' +
            '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
    }
    var tcEl = document.getElementById('laporan-top-customers');
    if (tcEl) tcEl.innerHTML = tcH || '<p class="text-sm text-gray-400">Belum ada data</p>';

    // Top Pengeluaran per Kategori
    var expCat = {};
    for (var i = 0; i < pengeluaranData.length; i++) {
        var e = pengeluaranData[i];
        if (!matchesFilter(e.date, f)) continue;
        var cat = e.category || 'Lainnya';
        if (!expCat[cat]) expCat[cat] = 0;
        expCat[cat] += Number(e.amount) || 0;
    }
    var topExp = [];
    for (var cat in expCat) topExp.push({ name: cat, amount: expCat[cat] });
    topExp.sort(function(a, b) { return b.amount - a.amount; });
    var teH = '';
    for (var i = 0; i < topExp.length; i++) {
        var t = topExp[i];
        teH += '<div class="flex items-center justify-between py-2 ' +
            (i < topExp.length - 1 ? 'border-b border-gray-50' : '') + '">' +
            '<span class="text-sm font-medium text-gray-800">' + t.name + '</span>' +
            '<span class="text-sm font-semibold text-red-600">' + formatRp(t.amount) + '</span></div>';
    }
    var teEl = document.getElementById('laporan-top-expenses');
    if (teEl) teEl.innerHTML = teH || '<p class="text-sm text-gray-400">Belum ada pengeluaran</p>';
}

// ======================== CASHFLOW ========================
function getCashFlowData(filter) {
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var year = filter.year, rows = [], totalIncome = 0, totalExpense = 0;
    var startMonth = 0, endMonth = 11;
    if (filter.month !== '') { startMonth = parseInt(filter.month); endMonth = startMonth; }

    for (var m = startMonth; m <= endMonth; m++) {
        var income = 0, expense = 0;
        for (var i = 0; i < ordersData.length; i++) {
            var o = ordersData[i];
            if (o.status === 'Dibatalkan') continue;
            var d = new Date(o.createdDate);
            if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === m) {
                income += Number(o.total) || 0;
            }
        }
        for (var i = 0; i < pengeluaranData.length; i++) {
            var e = pengeluaranData[i];
            var d = new Date(e.date);
            if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === m) {
                expense += Number(e.amount) || 0;
            }
        }
        totalIncome += income;
        totalExpense += expense;
        rows.push({ month: mn[m], income: income, expense: expense, profit: income - expense });
    }
    return { rows: rows, totalIncome: totalIncome, totalExpense: totalExpense, totalProfit: totalIncome - totalExpense };
}

function renderCashFlow(filter) {
    var data = getCashFlowData(filter);
    var tbody = document.getElementById('cashflow-body');
    var tfoot = document.getElementById('cashflow-footer');
    if (!tbody || !tfoot) return;

    var h = '';
    for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i];
        var pc = r.profit >= 0 ? 'cashflow-profit positive' : 'cashflow-profit negative';
        h += '<tr><td>' + r.month + '</td>' +
            '<td class="cashflow-income">' + formatRp(r.income) + '</td>' +
            '<td class="cashflow-expense">' + formatRp(r.expense) + '</td>' +
            '<td class="' + pc + '">' + formatRp(r.profit) + '</td></tr>';
    }
    tbody.innerHTML = h;

    var tpc = data.totalProfit >= 0 ? 'cashflow-profit positive' : 'cashflow-profit negative';
    tfoot.innerHTML = '<tr><td>TOTAL</td>' +
        '<td class="cashflow-income">' + formatRp(data.totalIncome) + '</td>' +
        '<td class="cashflow-expense">' + formatRp(data.totalExpense) + '</td>' +
        '<td class="' + tpc + '">' + formatRp(data.totalProfit) + '</td></tr>';
}

// ======================== EXPORT EXCEL ========================
function exportCashflowExcel() {
    var f = getFilterMonth('lap');
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var data = getCashFlowData(f);
    var label = f.month !== '' ? mn[parseInt(f.month)] + ' ' + f.year : 'Tahun ' + f.year;

    var wsData = [
        ['LAPORAN CASH FLOW - EZTAFEST'],
        ['Periode: ' + label],
        ['Tanggal Export: ' + formatDateFull(getTodayStr())],
        [],
        ['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Laba / Rugi (Rp)']
    ];
    for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i];
        wsData.push([r.month, r.income, r.expense, r.profit]);
    }
    wsData.push([]);
    wsData.push(['TOTAL', data.totalIncome, data.totalExpense, data.totalProfit]);

    // Detail Pemasukan
    wsData.push([]);
    wsData.push(['=== DETAIL PEMASUKAN ===']);
    wsData.push(['Order ID', 'Pelanggan', 'Alat', 'Qty', 'Periode', 'Total', 'DP', 'Sisa', 'Status']);
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan' || !matchesFilter(o.createdDate, f)) continue;
        var c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        wsData.push([
            o.id, c.name, it.name, Number(o.qty),
            formatDateID(o.startDate) + ' - ' + formatDateID(o.endDate),
            Number(o.total), Number(o.dp), Number(o.remaining), o.status
        ]);
    }

    // Detail Pengeluaran
    wsData.push([]);
    wsData.push(['=== DETAIL PENGELUARAN ===']);
    wsData.push(['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Vendor', 'Order', 'Catatan']);
    for (var i = 0; i < pengeluaranData.length; i++) {
        var e = pengeluaranData[i];
        if (!matchesFilter(e.date, f)) continue;
        wsData.push([
            e.id, formatDateID(e.date), e.category, e.description,
            Number(e.amount), e.vendor || '-', e.orderId || '-', e.notes || '-'
        ]);
    }

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, 'Eztafest_CashFlow_' + label.replace(/ /g, '_') + '.xlsx');
    showToast('Excel berhasil didownload');
}

// ======================== EXPORT PDF ========================
function exportCashflowPDF() {
    var f = getFilterMonth('lap');
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var data = getCashFlowData(f);
    var label = f.month !== '' ? mn[parseInt(f.month)] + ' ' + f.year : 'Tahun ' + f.year;

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(49, 46, 129);
    doc.text('EZTAFEST', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Rental Alat Event Profesional - Semarang', 14, 27);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Laporan Cash Flow', 14, 40);
    doc.setFontSize(10);
    doc.text('Periode: ' + label, 14, 47);
    doc.text('Tanggal: ' + formatDateFull(getTodayStr()), 14, 53);

    // Table CashFlow
    var cfHead = [['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba / Rugi']];
    var cfBody = [];
    for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i];
        cfBody.push([r.month, formatRp(r.income), formatRp(r.expense), formatRp(r.profit)]);
    }
    cfBody.push(['TOTAL', formatRp(data.totalIncome), formatRp(data.totalExpense), formatRp(data.totalProfit)]);

    doc.autoTable({
        head: cfHead, body: cfBody, startY: 60, theme: 'grid',
        headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        didParseCell: function(data) {
            if (data.section === 'body' && data.row.index === cfBody.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    // Detail Pemasukan
    var y = doc.lastAutoTable.finalY + 15;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(49, 46, 129);
    doc.text('Detail Pemasukan', 14, y);

    var incHead = [['Order', 'Pelanggan', 'Alat', 'Total', 'DP', 'Sisa', 'Status']];
    var incBody = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan' || !matchesFilter(o.createdDate, f)) continue;
        var c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        incBody.push([o.id, c.name, it.name, formatRp(o.total), formatRp(o.dp), formatRp(o.remaining), o.status]);
    }
    if (incBody.length > 0) {
        doc.autoTable({
            head: incHead, body: incBody, startY: y + 5, theme: 'grid',
            headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
        });
    }

    // Detail Pengeluaran
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : y + 20;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(49, 46, 129);
    doc.text('Detail Pengeluaran', 14, y);

    var expHead = [['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Vendor']];
    var expBody = [];
    for (var i = 0; i < pengeluaranData.length; i++) {
        var e = pengeluaranData[i];
        if (!matchesFilter(e.date, f)) continue;
        expBody.push([e.id, formatDateID(e.date), e.category, e.description, formatRp(e.amount), e.vendor || '-']);
    }
    if (expBody.length > 0) {
        doc.autoTable({
            head: expHead, body: expBody, startY: y + 5, theme: 'grid',
            headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 4: { halign: 'right' } }
        });
    }

    // Footer halaman
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Eztafest - Cash Flow - ' + label, 14, 290);
        doc.text('Halaman ' + p + '/' + pageCount, 180, 290);
    }

    doc.save('Eztafest_CashFlow_' + label.replace(/ /g, '_') + '.pdf');
    showToast('PDF berhasil didownload');
}

