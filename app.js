
// ============================================================
// APP.JS — Eztafest Admin Dashboard
// ============================================================
var currentMonth = 9;
var currentYear = 2026;
var selectedOrderForInvoice = null;

document.addEventListener('DOMContentLoaded', async function() {
    await loadFromSheet();
    lucide.createIcons();
    var now = new Date();
    var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = now.toLocaleDateString('id-ID', opts);
    renderAll();
});

function switchTab(tabId) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(tabId).classList.remove('hidden');
    var t = {
        dashboard: ['Dashboard', 'Selamat datang di panel admin Eztafest'],
        katalog: ['Katalog Alat', 'Kelola inventaris alat event'],
        pelanggan: ['Pelanggan', 'Kelola data pelanggan'],
        transaksi: ['Transaksi', 'Kelola pesanan dan pembayaran'],
        kalender: ['Kalender Sewa', 'Lihat jadwal penyewaan alat']
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

function renderAll() {
    renderDashboard();
    renderKatalog();
    renderPelanggan();
    renderTransaksi();
    renderCalendar();
    lucide.createIcons();
}

function statusBadge(s) {
    var m = { 'Menunggu Pembayaran':'badge-waiting', 'Sedang Disewa':'badge-active', 'Selesai':'badge-done', 'Dibatalkan':'badge-cancelled' };
    return '<span class="badge ' + (m[s]||'badge-waiting') + '">' + s + '</span>';
}

// ===== DASHBOARD =====
function renderDashboard() {
    var rev = 0, active = 0, avail = 0;
    for (var i = 0; i < ordersData.length; i++) {
        if (ordersData[i].status !== 'Dibatalkan') rev += ordersData[i].total;
        if (ordersData[i].status === 'Sedang Disewa' || ordersData[i].status === 'Menunggu Pembayaran') active++;
    }
    for (var i = 0; i < inventoryData.length; i++) avail += inventoryData[i].available;
    document.getElementById('dash-revenue').innerText = formatRp(rev);
    document.getElementById('dash-orders').innerText = active;
    document.getElementById('dash-available').innerText = avail;
    document.getElementById('dash-customers').innerText = customersData.length;

    var recent = ordersData.slice().reverse().slice(0, 5);
    var tbody = document.getElementById('dash-recent-tbody');
    if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>'; return; }
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

// ===== KATALOG =====
function renderKatalog() {
    var el = document.getElementById('search-katalog');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.name.toLowerCase().indexOf(q) !== -1 || it.category.toLowerCase().indexOf(q) !== -1 || it.id.toLowerCase().indexOf(q) !== -1) f.push(it);
    }
    var tbody = document.getElementById('katalog-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada alat ditemukan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var it = f[i], ri = inventoryData.indexOf(it), ac = it.available > 0 ? 'text-green-600' : 'text-red-600';
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + it.id + '</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">' + it.name + '</td>';
        h += '<td class="p-4 text-sm"><span class="badge badge-active">' + it.category + '</span></td>';
        h += '<td class="p-4 text-sm text-gray-600">' + it.stock + '</td>';
        h += '<td class="p-4 text-sm font-semibold ' + ac + '">' + it.available + '</td>';
        h += '<td class="p-4 text-sm text-gray-700 font-medium">' + formatRp(it.price) + '</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editAlat(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteAlat(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

// ===== PELANGGAN =====
function renderPelanggan() {
    var el = document.getElementById('search-pelanggan');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < customersData.length; i++) {
        var c = customersData[i];
        if (c.name.toLowerCase().indexOf(q) !== -1 || c.phone.indexOf(q) !== -1 || c.id.toLowerCase().indexOf(q) !== -1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-tbody');
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
        h += '<td class="p-4 text-sm text-gray-500">' + (c.address || '-') + '</td>';
        h += '<td class="p-4 text-sm font-semibold text-center">' + oc + '</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editCustomer(' + ri + ')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteCustomer(' + ri + ')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
        h += '</td></tr>';
    }
    tbody.innerHTML = h;
}

// ===== TRANSAKSI =====
function renderTransaksi() {
    var sEl = document.getElementById('search-transaksi');
    var q = sEl ? sEl.value.toLowerCase() : '';
    var fEl = document.getElementById('filter-status');
    var sf = fEl ? fEl.value : '';
    var f = [];
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        var c = getCustomerById(o.customerId);
        var it = getItemById(o.itemId);
        var mq = o.id.toLowerCase().indexOf(q) !== -1 || c.name.toLowerCase().indexOf(q) !== -1 || it.name.toLowerCase().indexOf(q) !== -1;
        var ms = !sf || o.status === sf;
        if (mq && ms) f.push(o);
    }
    var tbody = document.getElementById('transaksi-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada transaksi ditemukan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var o = f[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId), ri = ordersData.indexOf(o);
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">' + o.id + '</td>';
        h += '<td class="p-4 text-sm"><div class="font-medium text-gray-800">' + c.name + '</div><div class="text-xs text-gray-400">' + c.phone + '</div></td>';
        h += '<td class="p-4 text-sm text-gray-700">' + it.name + '</td>';
        h += '<td class="p-4 text-sm text-gray-600 text-center">' + o.qty + '</td>';
        h += '<td class="p-4 text-sm text-gray-600"><div>' + o.startDate + '</div><div class="text-xs text-gray-400">s/d ' + o.endDate + '</div></td>';
        h += '<td class="p-4 text-sm font-semibold text-gray-800">' + formatRp(o.total) + '</td>';
        h += '<td class="p-4 text-sm">' + statusBadge(o.status) + '</td>';
        h += '<td class="p-4 text-sm"><div class="flex items-center gap-1 flex-wrap">';
        h += '<button onclick="openInvoice(' + ri + ')" class="action-btn action-btn-invoice"><i data-lucide="file-text" class="w-3.5 h-3.5"></i> Nota</button>';
        h += '<select onchange="changeStatus(' + ri + ', this.value)" class="text-xs border rounded-lg px-2 py-1">';
        h += '<option value="" disabled selected>Status</option>';
        h += '<option value="Menunggu Pembayaran">Menunggu</option>';
        h += '<option value="Sedang Disewa">Disewa</option>';
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
    renderAll();
}

function recalcAvailableStock() {
    for (var i = 0; i < inventoryData.length; i++) {
        var item = inventoryData[i], ar = 0;
        for (var j = 0; j < ordersData.length; j++) {
            var o = ordersData[j];
            if (o.itemId === item.id && (o.status === 'Sedang Disewa' || o.status === 'Menunggu Pembayaran')) ar += o.qty;
        }
        item.available = Math.max(0, item.stock - ar);
    }
}

// ===== CALENDAR =====
function renderCalendar() {
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    document.getElementById('calendar-month-title').innerText = mn[currentMonth] + ' ' + currentYear;
    var grid = document.getElementById('calendar-grid');
    var dn = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    var html = '';
    for (var d = 0; d < dn.length; d++) html += '<div class="cal-header">' + dn[d] + '</div>';

    var fd = new Date(currentYear, currentMonth, 1).getDay();
    var td = new Date(currentYear, currentMonth + 1, 0).getDate();
    var now = new Date();
    var ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    for (var i = 0; i < fd; i++) html += '<div class="cal-day" style="border:none;background:transparent;min-height:auto;"></div>';

    for (var day = 1; day <= td; day++) {
        var ds = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
        var isT = ds === ts;
        var bk = [];
        for (var b = 0; b < ordersData.length; b++) {
            var o = ordersData[b];
            if (ds >= o.startDate && ds <= o.endDate && o.status !== 'Dibatalkan') bk.push(o);
        }
        var ev = '';
        for (var b = 0; b < bk.length; b++) {
            var bkg = bk[b], it = getItemById(bkg.itemId), cu = getCustomerById(bkg.customerId);
            var ec = 'cal-event-active';
            if (bkg.status === 'Menunggu Pembayaran') ec = 'cal-event-waiting';
            if (bkg.status === 'Selesai') ec = 'cal-event-done';
            var oi = ordersData.indexOf(bkg);
            ev += '<div onclick="openInvoice(' + oi + ')" class="cal-event ' + ec + '" title="' + it.name + ' — ' + cu.name + '">' + it.name.substring(0,12) + '</div>';
        }
        html += '<div class="cal-day ' + (isT?'today':'') + '"><div class="day-num">' + day + '</div>' + ev + '</div>';
    }
    grid.innerHTML = html;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); lucide.createIcons(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== CRUD: ALAT =====
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
    openModal('modal-alat');
}

function saveAlat(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('alat-edit-index').value);
    var d = {
        name: document.getElementById('alat-nama').value,
        category: document.getElementById('alat-kategori').value,
        stock: parseInt(document.getElementById('alat-stok').value),
        price: parseInt(document.getElementById('alat-harga').value)
    };
    if (idx === -1) {
        d.id = generateId('EQ', inventoryData);
        d.available = d.stock;
        inventoryData.push(d);
        syncToSheet('add', 'Alat', d);
    } else {
        inventoryData[idx].name = d.name;
        inventoryData[idx].category = d.category;
        inventoryData[idx].stock = d.stock;
        inventoryData[idx].price = d.price;
        inventoryData[idx].available = Math.min(inventoryData[idx].available, d.stock);
        recalcAvailableStock();
        syncToSheet('update', 'Alat', inventoryData[idx]);
    }
    closeModal('modal-alat');
    renderAll();
}

function deleteAlat(idx) {
    if (!confirm('Hapus alat "' + inventoryData[idx].name + '"?')) return;
    syncToSheet('delete', 'Alat', { id: inventoryData[idx].id });
    inventoryData.splice(idx, 1);
    renderAll();
}

// ===== CRUD: PELANGGAN =====
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
    openModal('modal-pelanggan');
}

function saveCustomer(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('cust-edit-index').value);
    var d = {
        name: document.getElementById('cust-nama').value,
        phone: document.getElementById('cust-phone').value,
        email: document.getElementById('cust-email').value,
        address: document.getElementById('cust-alamat').value
    };
    if (idx === -1) {
        d.id = generateId('CST', customersData);
        customersData.push(d);
        syncToSheet('add', 'Pelanggan', d);
    } else {
        customersData[idx].name = d.name;
        customersData[idx].phone = d.phone;
        customersData[idx].email = d.email;
        customersData[idx].address = d.address;
        syncToSheet('update', 'Pelanggan', customersData[idx]);
    }
    closeModal('modal-pelanggan');
    renderAll();
}

function deleteCustomer(idx) {
    if (!confirm('Hapus pelanggan "' + customersData[idx].name + '"?')) return;
    syncToSheet('delete', 'Pelanggan', { id: customersData[idx].id });
    customersData.splice(idx, 1);
    renderAll();
}

// ===== CRUD: PESANAN =====
function openOrderModal() {
    document.getElementById('form-order').reset();
    document.getElementById('order-total-preview').innerText = 'Rp 0';
    var cs = document.getElementById('order-customer');
    var ch = '<option value="" disabled selected>Pilih Pelanggan</option>';
    for (var i = 0; i < customersData.length; i++) {
        var c = customersData[i];
        ch += '<option value="' + c.id + '">' + c.name + ' (' + c.phone + ')</option>';
    }
    cs.innerHTML = ch;
    var is = document.getElementById('order-item');
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

function calcOrderTotal() {
    var is = document.getElementById('order-item');
    var sel = is.options[is.selectedIndex];
    if (!sel || !sel.dataset.price) return;
    var p = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('order-qty').value) || 1;
    var s = document.getElementById('order-start').value;
    var e = document.getElementById('order-end').value;
    var days = (s && e) ? getDaysBetween(s, e) : 1;
    document.getElementById('order-total-preview').innerText = formatRp(p * qty * days);
}

function saveOrder(e) {
    e.preventDefault();
    var is = document.getElementById('order-item');
    var sel = is.options[is.selectedIndex];
    var p = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('order-qty').value);
    var sd = document.getElementById('order-start').value;
    var ed = document.getElementById('order-end').value;
    var days = getDaysBetween(sd, ed);
    var ma = parseInt(sel.dataset.avail);
    if (qty > ma) { alert('Jumlah melebihi stok tersedia (' + ma + ' unit).'); return; }
    var od = {
        id: generateId('ORD', ordersData),
        customerId: document.getElementById('order-customer').value,
        itemId: document.getElementById('order-item').value,
        qty: qty,
        startDate: sd,
        endDate: ed,
        total: p * qty * days,
        status: 'Menunggu Pembayaran'
    };
    ordersData.push(od);
    recalcAvailableStock();
    syncToSheet('add', 'Transaksi', od);
    closeModal('modal-order');
    renderAll();
}

// ===== INVOICE =====
function openInvoice(idx) {
    selectedOrderForInvoice = ordersData[idx];
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);
    document.getElementById('inv-id').innerText = '#' + o.id;
    document.getElementById('inv-date').innerText = 'Tanggal: ' + new Date().toLocaleDateString('id-ID');
    document.getElementById('inv-name').innerText = c.name;
    document.getElementById('inv-phone').innerText = 'WA: ' + c.phone;
    document.getElementById('inv-email').innerText = c.email || '';
    document.getElementById('inv-period').innerText = o.startDate + ' s/d ' + o.endDate;
    document.getElementById('inv-days').innerText = days + ' hari sewa';
    var ih = '<tr class="border-b border-gray-100">';
    ih += '<td class="p-3 text-sm text-gray-800">' + it.name + '<br><span class="text-xs text-gray-400">' + it.category + '</span></td>';
    ih += '<td class="p-3 text-sm text-center text-gray-600">' + o.qty + '</td>';
    ih += '<td class="p-3 text-sm text-center text-gray-600">' + days + '</td>';
    ih += '<td class="p-3 text-sm text-right text-gray-600">' + formatRp(it.price) + '</td>';
    ih += '<td class="p-3 text-sm text-right font-semibold text-gray-800">' + formatRp(o.total) + '</td></tr>';
    document.getElementById('inv-items-tbody').innerHTML = ih;
    document.getElementById('inv-subtotal').innerText = formatRp(o.total);
    document.getElementById('inv-total').innerText = formatRp(o.total);
    openModal('modal-invoice');
}

function sendInvoiceWA() {
    if (!selectedOrderForInvoice) return;
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);
    var msg = 'Halo ' + c.name + ', ini dari *Eztafest*\n\n';
    msg += 'Berikut rincian pesanan Anda:\n\n';
    msg += '*INVOICE ' + o.id + '*\n';
    msg += '================================\n';
    msg += 'Alat: ' + it.name + '\n';
    msg += 'Qty: ' + o.qty + ' unit\n';
    msg += 'Periode: ' + o.startDate + ' s/d ' + o.endDate + ' (' + days + ' hari)\n';
    msg += '================================\n';
    msg += '*Total: ' + formatRp(o.total) + '*\n\n';
    msg += 'Pembayaran via transfer bank.\n';
    msg += 'Terima kasih atas kepercayaan Anda!\n\n';
    msg += '_Eztafest — Sewa Alat Event Profesional_';
    window.open('https://wa.me/' + c.phone + '?text=' + encodeURIComponent(msg), '_blank');
}