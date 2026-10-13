
// ============================================================
// APP.JS — Eztafest Admin Dashboard (FINAL)
// ============================================================

var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var selectedOrderForInvoice = null;
var calendarFilter = 'all';
var selectedCalDate = '';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function() {
    await loadFromSheet();
    lucide.createIcons();
    document.getElementById('current-date').innerText = formatDateFull(getTodayStr());
    renderAll();
});

// ===== SIDEBAR TOGGLE =====
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

// ===== TAB NAVIGATION =====
function switchTab(tabId) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(tabId).classList.remove('hidden');

    var titles = {
        dashboard: 'Dashboard', katalog: 'Katalog Alat', pelanggan: 'Pelanggan',
        transaksi: 'Transaksi', kalender: 'Kalender Sewa', laporan: 'Laporan'
    };
    document.getElementById('page-title').innerText = titles[tabId] || '';

    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('onclick') === "switchTab('" + tabId + "')") {
            btns[i].classList.add('active');
        }
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebar-overlay').classList.add('hidden');
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

// ===== MODAL OPEN/CLOSE =====
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// ===== STATUS BADGE =====
function statusBadge(s) {
    var m = {
        'Menunggu Pembayaran': 'badge-waiting', 'Sudah Bayar DP': 'badge-dp',
        'Sedang Disewa': 'badge-active', 'Diantar': 'badge-delivery',
        'Dikembalikan': 'badge-returned', 'Selesai': 'badge-done', 'Dibatalkan': 'badge-cancelled'
    };
    return '<span class="badge ' + (m[s] || 'badge-waiting') + '">' + s + '</span>';
}

// ===== TOAST =====
function showToast(msg) {
    var c = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast-item';
    t.innerHTML = '<span>✅</span> ' + msg;
    c.appendChild(t);
    setTimeout(function() { t.classList.add('toast-fade'); }, 2500);
    setTimeout(function() { t.remove(); }, 3000);
}

// =============================================================
// DASHBOARD
// =============================================================
function renderDashboard() {
    var stats = getStats();
    document.getElementById('stat-revenue').innerText = formatRp(stats.monthRevenue);
    document.getElementById('stat-orders').innerText = stats.activeOrders;
    document.getElementById('stat-items').innerText = stats.availableItems;
    document.getElementById('stat-customers').innerText = stats.totalCustomers;

    var recent = ordersData.slice().reverse().slice(0, 5);
    var tbody = document.getElementById('recent-transactions');
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

    var topItems = getTopItems(3);
    var topEl = document.getElementById('top-items-dashboard');
    if (topEl) {
        var th = '';
        for (var i = 0; i < topItems.length; i++) {
            var t = topItems[i];
            th += '<div class="flex items-center justify-between py-2 ' + (i < topItems.length - 1 ? 'border-b border-gray-50' : '') + '">';
            th += '<div><span class="text-sm font-medium text-gray-800">' + t.name + '</span>';
            th += '<span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit disewa</span></div>';
            th += '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
        }
        topEl.innerHTML = th || '<p class="text-sm text-gray-400">Belum ada data</p>';
    }
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
        if (it.name.toLowerCase().indexOf(q) !== -1 || it.category.toLowerCase().indexOf(q) !== -1 || it.id.toLowerCase().indexOf(q) !== -1) f.push(it);
    }
    var tbody = document.getElementById('katalog-body');
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
        if (c.name.toLowerCase().indexOf(q) !== -1 || String(c.phone).indexOf(q) !== -1 || c.id.toLowerCase().indexOf(q) !== -1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada pelanggan ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var c = f[i], ri = customersData.indexOf(c), oc = 0;
        for (var j = 0; j < ordersData.length; j++) { if (ordersData[j].customerId === c.id) oc++; }
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + c.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + c.name + '</td>';
        h += '<td class="p-4 text-sm text-gray-600">' + c.phone + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.email || '-') + '</td>';
        h += '<td class="p-4 text-sm text-gray-500">' + (c.address || '-') + (c.city ? ', ' + c.city : '') + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center">' + oc + '</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editPelanggan(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deletePelanggan(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
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
    if (!d.name || !d.phone) { alert('Nama dan No. WhatsApp harus diisi'); return; }

    if (idx === -1 || isNaN(idx)) {
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

function deletePelanggan(idx) {
    if (!confirm('Hapus pelanggan "' + customersData[idx].name + '"?')) return;
    syncToSheet('delete', 'Pelanggan', { id: customersData[idx].id });
    showToast('Pelanggan "' + customersData[idx].name + '" dihapus');
    customersData.splice(idx, 1);
    renderAll();
}

// =============================================================
// TRANSAKSI
// =============================================================
function renderTransaksi() {
    var sEl = document.getElementById('search-order');
    var q = sEl ? sEl.value.toLowerCase() : '';
    var fEl = document.getElementById('filter-status');
    var sf = fEl ? fEl.value : '';

    var f = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        var mq = o.id.toLowerCase().indexOf(q) !== -1 || c.name.toLowerCase().indexOf(q) !== -1 || it.name.toLowerCase().indexOf(q) !== -1;
        var ms = !sf || o.status === sf;
        if (mq && ms) f.push(o);
    }

    var tbody = document.getElementById('order-body');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada transaksi ditemukan</td></tr>'; return; }

    var h = '';
    for (var i = 0; i < f.length; i++) {
        var o = f[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        var ri = ordersData.indexOf(o);
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-3 text-sm font-medium text-indigo-700">' + o.id + '</td>';
        h += '<td class="p-3 text-sm"><div class="font-medium text-gray-800">' + c.name + '</div><div class="text-xs text-gray-400">' + c.phone + '</div></td>';
        h += '<td class="p-3 text-sm text-gray-700">' + it.name + '<span class="text-xs text-gray-400 ml-1">x' + o.qty + '</span></td>';
        h += '<td class="p-3 text-sm text-gray-600"><div>' + formatDateID(o.startDate) + '</div><div class="text-xs text-gray-400">s/d ' + formatDateID(o.endDate) + '</div></td>';
        h += '<td class="p-3 text-sm font-semibold text-gray-800">' + formatRp(o.total) + '</td>';
        h += '<td class="p-3 text-sm">';
        if (o.dp > 0) h += '<div class="text-xs text-green-600">DP: ' + formatRp(o.dp) + '</div>';
        if (o.remaining > 0) h += '<div class="text-xs text-red-600">Sisa: ' + formatRp(o.remaining) + '</div>';
        h += '</td>';
        h += '<td class="p-3 text-sm">' + statusBadge(o.status) + '</td>';
        h += '<td class="p-3 text-sm">';
        if (o.notes) h += '<div class="text-xs text-gray-400 max-w-[120px] truncate" title="' + o.notes + '">' + o.notes + '</div>';
        h += '</td>';
        h += '<td class="p-3 text-sm"><div class="flex items-center gap-1 flex-wrap">';
        h += '<button onclick="openInvoice(' + ri + ')" class="action-btn action-btn-invoice"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></button>';
        h += '<select onchange="changeStatus(' + ri + ', this.value)" class="text-xs border rounded-lg px-1 py-1">';
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

// CRUD Pesanan
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
        var c = customersData[i];
        ch += '<option value="' + c.id + '">' + c.name + ' (' + c.phone + ')</option>';
    }
    cs.innerHTML = ch;

    var is = document.getElementById('ord-item');
    var ih = '<option value="" disabled selected>Pilih Alat</option>';
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.available > 0) {
            ih += '<option value="' + it.id + '" data-price="' + it.price + '" data-avail="' + it.available + '">';
            ih += it.name + ' — ' + formatRp(it.price) + '/hari (sisa: ' + it.available + ')</option>';
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
    if (!sd || !ed) { alert('Tanggal mulai dan selesai harus diisi'); return; }

    var days = getDaysBetween(sd, ed);
    var discount = parseInt(document.getElementById('ord-discount').value) || 0;
    var shipping = parseInt(document.getElementById('ord-shipping').value) || 0;
    var dp = parseInt(document.getElementById('ord-dp').value) || 0;
    var notes = document.getElementById('ord-notes').value;

    var ma = parseInt(sel.dataset.avail);
    if (qty > ma) { alert('Jumlah melebihi stok tersedia (' + ma + ' unit).'); return; }

    var calc = calcOrderTotal(price, qty, days, discount, shipping);
    var remaining = Math.max(0, calc.total - dp);
    var status = dp > 0 ? 'Sudah Bayar DP' : 'Menunggu Pembayaran';

    var od = {
        id: generateId('ORD', ordersData),
        customerId: custId,
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
    showToast('Pesanan ' + od.id + ' berhasil dibuat');
    closeModal('modal-order');
    renderAll();
}

// =============================================================
// KALENDER SEWA (Filter + Detail)
// =============================================================
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
        var isT = ds === todayStr;
        var isSel = ds === selectedCalDate;

        var bk = [];
        for (var b = 0; b < ordersData.length; b++) {
            var o = ordersData[b];
            if (o.status === 'Dibatalkan') continue;
            if (calendarFilter !== 'all' && o.status !== calendarFilter) continue;
            var oStart = String(o.startDate).substring(0, 10);
            var oEnd = String(o.endDate).substring(0, 10);
            if (ds >= oStart && ds <= oEnd) bk.push(o);
        }

        var ev = '';
        for (var b = 0; b < bk.length; b++) {
            var bkg = bk[b], it = getItemById(bkg.itemId), cust = getCustomerById(bkg.customerId);
            var ecMap = {
                'Menunggu Pembayaran':'cal-event-waiting', 'Sudah Bayar DP':'cal-event-dp',
                'Sedang Disewa':'cal-event-active', 'Diantar':'cal-event-delivery',
                'Dikembalikan':'cal-event-returned', 'Selesai':'cal-event-done'
            };
            var ec = ecMap[bkg.status] || 'cal-event-active';
            var oi = ordersData.indexOf(bkg);
            var label = it.name.length > 12 ? it.name.substring(0, 12) + '..' : it.name;
            ev += '<div onclick="event.stopPropagation(); openInvoice(' + oi + ')" class="cal-event ' + ec + '" title="' + it.name + ' x' + bkg.qty + ' — ' + cust.name + ' (' + bkg.status + ')">' + label + '</div>';
        }

        var dayCls = 'cal-day';
        if (isT) dayCls += ' today';
        if (isSel) dayCls += ' cal-selected';
        if (bk.length > 0) dayCls += ' cal-has-event';

        html += '<div class="' + dayCls + '" onclick="selectCalDate(\'' + ds + '\')">';
        html += '<div class="day-num">' + day + '</div>';
        html += ev;
        html += '</div>';
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
        var selDate = new Date(selectedCalDate);
        titleEl.innerText = 'Booking Tanggal ' + selDate.getDate() + ' ' + mn[selDate.getMonth()] + ' ' + selDate.getFullYear();
    } else {
        titleEl.innerText = 'Semua Booking ' + mn[currentMonth] + ' ' + currentYear;
    }

    var filtered = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan') continue;
        if (calendarFilter !== 'all' && o.status !== calendarFilter) continue;
        var oStart = String(o.startDate).substring(0, 10);
        var oEnd = String(o.endDate).substring(0, 10);

        if (selectedCalDate) {
            if (selectedCalDate >= oStart && selectedCalDate <= oEnd) filtered.push(o);
        } else {
            var monthStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
            if (oStart.substring(0, 7) === monthStr || oEnd.substring(0, 7) === monthStr || (oStart < monthStr + '-01' && oEnd > monthStr + '-31')) filtered.push(o);
        }
    }

    if (!filtered.length) {
        contentEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Tidak ada booking' + (selectedCalDate ? ' di tanggal ini' : ' bulan ini') + '</p>';
        return;
    }

    var h = '';
    for (var i = 0; i < filtered.length; i++) {
        var o = filtered[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        var oi = ordersData.indexOf(o);
        var badgeMap = {
            'Menunggu Pembayaran':'badge-waiting', 'Sudah Bayar DP':'badge-dp',
            'Sedang Disewa':'badge-active', 'Diantar':'badge-delivery',
            'Dikembalikan':'badge-returned', 'Selesai':'badge-done'
        };
        var bc = badgeMap[o.status] || 'badge-waiting';

        h += '<div class="cal-detail-card" onclick="openInvoice(' + oi + ')">';
        h += '<div class="cal-detail-header">';
        h += '<span class="cal-detail-id">' + o.id + '</span>';
        h += '<span class="badge ' + bc + '">' + o.status + '</span></div>';
        h += '<div class="cal-detail-body">';
        h += '<div class="cal-detail-row"><i data-lucide="user" class="w-3.5 h-3.5"></i> ' + c.name + ' <span class="text-gray-400">(' + c.phone + ')</span></div>';
        h += '<div class="cal-detail-row"><i data-lucide="package" class="w-3.5 h-3.5"></i> ' + it.name + ' <span class="text-gray-400">x' + o.qty + ' unit</span></div>';
        h += '<div class="cal-detail-row"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ' + formatDateID(o.startDate) + ' <span class="text-gray-400">s/d</span> ' + formatDateID(o.endDate) + '</div>';
        h += '<div class="cal-detail-row"><i data-lucide="banknote" class="w-3.5 h-3.5"></i> <strong>' + formatRp(o.total) + '</strong>';
        if (o.remaining > 0) h += ' <span class="text-red-500 text-xs">(Sisa: ' + formatRp(o.remaining) + ')</span>';
        h += '</div>';
        if (o.notes) h += '<div class="cal-detail-row"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> <span class="text-gray-400">' + o.notes + '</span></div>';
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

// =============================================================
// INVOICE
// =============================================================
function openInvoice(idx) {
    selectedOrderForInvoice = ordersData[idx];
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);

    document.getElementById('inv-id').innerText = '#' + o.id;
    document.getElementById('inv-date').innerText = formatDateFull(getTodayStr());
    document.getElementById('inv-cust-name').innerText = c.name;
    document.getElementById('inv-cust-phone').innerText = 'WA: ' + c.phone;
    document.getElementById('inv-cust-email').innerText = c.email || '';
    document.getElementById('inv-cust-address').innerText = (c.address || '') + (c.city ? ', ' + c.city : '');
    document.getElementById('inv-period').innerText = formatDateID(o.startDate) + '  s/d  ' + formatDateID(o.endDate);
    document.getElementById('inv-days').innerText = days + ' hari sewa';

    var ih = '<tr class="border-b border-gray-100">';
    ih += '<td class="p-3 text-sm text-gray-800">' + it.name + '<br><span class="text-xs text-gray-400">' + it.category + '</span></td>';
    ih += '<td class="p-3 text-sm text-center">' + o.qty + '</td>';
    ih += '<td class="p-3 text-sm text-center">' + days + '</td>';
    ih += '<td class="p-3 text-sm text-right">' + formatRp(it.price) + '</td>';
    ih += '<td class="p-3 text-sm text-right font-semibold">' + formatRp(o.subtotal) + '</td></tr>';
    document.getElementById('inv-items').innerHTML = ih;

    document.getElementById('inv-subtotal').innerText = formatRp(o.subtotal);
    document.getElementById('inv-discount').innerText = '- ' + formatRp(o.discount);
    document.getElementById('inv-shipping').innerText = formatRp(o.shipping);
    document.getElementById('inv-total').innerText = formatRp(o.total);
    document.getElementById('inv-dp').innerText = formatRp(o.dp);
    document.getElementById('inv-remaining').innerText = formatRp(o.remaining);

    var statusEl = document.getElementById('inv-status');
    if (statusEl) statusEl.innerHTML = statusBadge(o.status);
    var notesEl = document.getElementById('inv-notes');
    if (notesEl) notesEl.innerText = o.notes || '-';
    var sigEl = document.getElementById('inv-sig-name');
    if (sigEl) sigEl.innerText = c.name;

    openModal('modal-invoice');
}

function sendInvoiceWA() {
    if (!selectedOrderForInvoice) return;
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);

    var phone = String(c.phone).trim();
    if (phone.indexOf('08') === 0) phone = '62' + phone.substring(1);

    var msg = 'Halo *' + c.name + '*, berikut invoice dari *Eztafest*\n\n';
    msg += '*INVOICE ' + o.id + '*\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += 'Alat: ' + it.name + '\n';
    msg += 'Qty: ' + o.qty + ' unit\n';
    msg += 'Periode: ' + formatDateID(o.startDate) + ' s/d ' + formatDateID(o.endDate) + ' (' + days + ' hari)\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += 'Subtotal: ' + formatRp(o.subtotal) + '\n';
    if (o.discount > 0) msg += 'Diskon: -' + formatRp(o.discount) + '\n';
    if (o.shipping > 0) msg += 'Ongkir: ' + formatRp(o.shipping) + '\n';
    msg += '*Total: ' + formatRp(o.total) + '*\n';
    if (o.dp > 0) msg += 'DP Dibayar: ' + formatRp(o.dp) + '\n';
    if (o.remaining > 0) msg += '*Sisa Bayar: ' + formatRp(o.remaining) + '*\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += 'Transfer ke: BCA 1234567890 a/n Eztafest\n\n';
    msg += 'Terima kasih! - Eztafest Semarang';

    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
}

// =============================================================
// LAPORAN
// =============================================================
function renderLaporan() {
    var stats = getStats();
    var sumEl = document.getElementById('laporan-summary');
    if (sumEl) {
        sumEl.innerHTML = '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
            '<p class="text-sm text-gray-500">Total Pendapatan</p>' +
            '<p class="text-2xl font-extrabold text-gray-800 mt-1">' + formatRp(stats.totalRevenue) + '</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
            '<p class="text-sm text-gray-500">Total Pesanan</p>' +
            '<p class="text-2xl font-extrabold text-gray-800 mt-1">' + stats.totalOrders + '</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
            '<p class="text-sm text-gray-500">Pesanan Selesai</p>' +
            '<p class="text-2xl font-extrabold text-green-600 mt-1">' + stats.completedOrders + '</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100">' +
            '<p class="text-sm text-gray-500">Pesanan Aktif</p>' +
            '<p class="text-2xl font-extrabold text-orange-600 mt-1">' + stats.activeOrders + '</p></div>';
    }

    // Status breakdown
    var sc = getStatusCount();
    var stEl = document.getElementById('laporan-status');
    if (stEl) {
        var sh = '';
        for (var s in sc) {
            sh += '<div class="flex items-center justify-between py-2 border-b border-gray-50">';
            sh += '<span class="text-sm">' + statusBadge(s) + '</span>';
            sh += '<span class="text-sm font-bold">' + sc[s] + '</span></div>';
        }
        stEl.innerHTML = sh;
    }

    // Top items
    var topItems = getTopItems(5);
    var tiEl = document.getElementById('laporan-top-items');
    if (tiEl) {
        var tih = '';
        for (var i = 0; i < topItems.length; i++) {
            var t = topItems[i];
            tih += '<div class="flex items-center justify-between py-2 ' + (i < topItems.length - 1 ? 'border-b border-gray-50' : '') + '">';
            tih += '<div><span class="text-sm font-medium">' + (i + 1) + '. ' + t.name + '</span>';
            tih += '<span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit</span></div>';
            tih += '<span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
        }
        tiEl.innerHTML = tih || '<p class="text-sm text-gray-400">Belum ada data</p>';
    }

    // Top customers
    var topCust = getTopCustomers(5);
    var tcEl = document.getElementById('laporan-top-customers');
    if (tcEl) {
        var tch = '';
        for (var i = 0; i < topCust.length; i++) {
            var tc = topCust[i];
            tch += '<div class="flex items-center justify-between py-2 ' + (i < topCust.length - 1 ? 'border-b border-gray-50' : '') + '">';
            tch += '<div><span class="text-sm font-medium">' + (i + 1) + '. ' + tc.name + '</span>';
            tch += '<span class="text-xs text-gray-400 ml-2">' + tc.orders + ' order</span></div>';
            tch += '<span class="text-sm font-semibold text-indigo-700">' + formatRp(tc.revenue) + '</span></div>';
        }
        tcEl.innerHTML = tch || '<p class="text-sm text-gray-400">Belum ada data</p>';
    }
}

