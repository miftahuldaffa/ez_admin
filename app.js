
// =============================================================
// TRANSAKSI
// =============================================================
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
        var mq = o.id.toLowerCase().indexOf(q) !== -1 ||
                 c.name.toLowerCase().indexOf(q) !== -1 ||
                 it.name.toLowerCase().indexOf(q) !== -1;
        var ms = !sf || o.status === sf;
        if (mq && ms) f.push(o);
    }

    var tbody = document.getElementById('transaksi-tbody');
    if (!f.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada transaksi ditemukan</td></tr>';
        return;
    }

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
        if (o.notes) h += '<div class="text-xs text-gray-400 max-w-[120px] truncate" title="' + o.notes + '">📝 ' + o.notes + '</div>';
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
function openOrderModal() {
    document.getElementById('form-order').reset();
    document.getElementById('order-total-preview').innerText = 'Rp 0';
    document.getElementById('order-subtotal-preview').innerText = 'Rp 0';
    document.getElementById('order-sisa-preview').innerText = 'Rp 0';

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

function calcOrderPreview() {
    var is = document.getElementById('order-item');
    var sel = is.options[is.selectedIndex];
    if (!sel || !sel.dataset.price) return;

    var price = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('order-qty').value) || 1;
    var start = document.getElementById('order-start').value;
    var end = document.getElementById('order-end').value;
    var days = (start && end) ? getDaysBetween(start, end) : 1;
    var discount = parseInt(document.getElementById('order-diskon').value) || 0;
    var shipping = parseInt(document.getElementById('order-ongkir').value) || 0;
    var dp = parseInt(document.getElementById('order-dp').value) || 0;

    var calc = calcOrderTotal(price, qty, days, discount, shipping);
    var sisa = Math.max(0, calc.total - dp);

    document.getElementById('order-subtotal-preview').innerText = formatRp(calc.subtotal);
    document.getElementById('order-total-preview').innerText = formatRp(calc.total);
    document.getElementById('order-sisa-preview').innerText = formatRp(sisa);
}

function saveOrder(e) {
    e.preventDefault();
    var is = document.getElementById('order-item');
    var sel = is.options[is.selectedIndex];
    var price = parseInt(sel.dataset.price);
    var qty = parseInt(document.getElementById('order-qty').value);
    var sd = document.getElementById('order-start').value;
    var ed = document.getElementById('order-end').value;
    var days = getDaysBetween(sd, ed);
    var discount = parseInt(document.getElementById('order-diskon').value) || 0;
    var shipping = parseInt(document.getElementById('order-ongkir').value) || 0;
    var dp = parseInt(document.getElementById('order-dp').value) || 0;
    var notes = document.getElementById('order-notes').value;

    var ma = parseInt(sel.dataset.avail);
    if (qty > ma) { alert('Jumlah melebihi stok tersedia (' + ma + ' unit).'); return; }

    var calc = calcOrderTotal(price, qty, days, discount, shipping);
    var remaining = Math.max(0, calc.total - dp);
    var status = dp > 0 ? 'Sudah Bayar DP' : 'Menunggu Pembayaran';

    var od = {
        id: generateId('ORD', ordersData),
        customerId: document.getElementById('order-customer').value,
        itemId: document.getElementById('order-item').value,
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
// KALENDER SEWA
// =============================================================
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
        var ds = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
        var isT = ds === todayStr;

        var bk = [];
        for (var b = 0; b < ordersData.length; b++) {
            var o = ordersData[b];
            if (ds >= o.startDate && ds <= o.endDate && o.status !== 'Dibatalkan') bk.push(o);
        }

        var ev = '';
        for (var b = 0; b < bk.length; b++) {
            var bkg = bk[b], it = getItemById(bkg.itemId);
            var ecMap = {
                'Menunggu Pembayaran': 'cal-event-waiting',
                'Sudah Bayar DP':     'cal-event-dp',
                'Sedang Disewa':      'cal-event-active',
                'Diantar':            'cal-event-delivery',
                'Dikembalikan':       'cal-event-returned',
                'Selesai':            'cal-event-done'
            };
            var ec = ecMap[bkg.status] || 'cal-event-active';
            var oi = ordersData.indexOf(bkg);
            ev += '<div onclick="openInvoice(' + oi + ')" class="cal-event ' + ec + '" title="' + it.name + ' — ' + getCustomerById(bkg.customerId).name + '">' + it.name.substring(0,10) + '</div>';
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
    lucide.createIcons();
}

// =============================================================
// INVOICE / NOTA
// =============================================================
function openInvoice(idx) {
    selectedOrderForInvoice = ordersData[idx];
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);

    document.getElementById('inv-id').innerText = '#' + o.id;
    document.getElementById('inv-date').innerText = formatDateFull(getTodayStr());
    document.getElementById('inv-name').innerText = c.name;
    document.getElementById('inv-phone').innerText = 'WA: ' + c.phone;
    document.getElementById('inv-email').innerText = c.email || '';
    document.getElementById('inv-address').innerText = (c.address || '') + (c.city ? ', ' + c.city : '');
    document.getElementById('inv-period').innerText = formatDateID(o.startDate) + '  s/d  ' + formatDateID(o.endDate);
    document.getElementById('inv-days').innerText = days + ' hari sewa';

    var ih = '<tr class="border-b border-gray-100">';
    ih += '<td class="p-3 text-sm text-gray-800">' + it.name + '<br><span class="text-xs text-gray-400">' + it.category + '</span></td>';
    ih += '<td class="p-3 text-sm text-center">' + o.qty + '</td>';
    ih += '<td class="p-3 text-sm text-center">' + days + '</td>';
    ih += '<td class="p-3 text-sm text-right">' + formatRp(it.price) + '</td>';
    ih += '<td class="p-3 text-sm text-right font-semibold">' + formatRp(o.subtotal) + '</td></tr>';
    document.getElementById('inv-items-tbody').innerHTML = ih;

    document.getElementById('inv-subtotal').innerText = formatRp(o.subtotal);

    var discRow = document.getElementById('inv-discount-row');
    var shipRow = document.getElementById('inv-shipping-row');
    if (discRow) discRow.style.display = o.discount > 0 ? 'flex' : 'none';
    if (shipRow) shipRow.style.display = o.shipping > 0 ? 'flex' : 'none';

    var discEl = document.getElementById('inv-discount');
    var shipEl = document.getElementById('inv-shipping');
    if (discEl) discEl.innerText = '- ' + formatRp(o.discount);
    if (shipEl) shipEl.innerText = formatRp(o.shipping);

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

// ===== KIRIM INVOICE VIA WHATSAPP =====
function sendInvoiceWA() {
    if (!selectedOrderForInvoice) return;
    var o = selectedOrderForInvoice;
    var c = getCustomerById(o.customerId);
    var it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate, o.endDate);

    var phone = String(c.phone).trim();
    if (phone.indexOf('08') === 0) phone = '62' + phone.substring(1);

    var msg = 'Halo *' + c.name + '*, ini dari *Eztafest* 🎪\n\n';
    msg += '📋 *INVOICE ' + o.id + '*\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += '🔧 Alat: ' + it.name + '\n';
    msg += '📦 Qty: ' + o.qty + ' unit\n';
    msg += '📅 Periode: ' + formatDateID(o.startDate) + ' s/d ' + formatDateID(o.endDate) + ' (' + days + ' hari)\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += 'Subtotal: ' + formatRp(o.subtotal) + '\n';
    if (o.discount > 0) msg += 'Diskon: -' + formatRp(o.discount) + '\n';
    if (o.shipping > 0) msg += 'Ongkir: ' + formatRp(o.shipping) + '\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += '*Total: ' + formatRp(o.total) + '*\n';
    if (o.dp > 0) msg += 'DP Dibayar: ' + formatRp(o.dp) + '\n';
    if (o.remaining > 0) msg += '🔴 *Sisa Bayar: ' + formatRp(o.remaining) + '*\n';
    msg += '\n💳 Pembayaran via transfer:\n';
    msg += 'Bank BCA - 1234567890\n';
    msg += 'a/n Eztafest\n\n';
    msg += 'Terima kasih atas kepercayaan Anda! 🙏\n';
    msg += '_Eztafest — Sewa Alat Event Profesional_';

    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
}

// =============================================================
// LAPORAN
// =============================================================
function renderLaporan() {
    var stats = getStats();
    var sc = getStatusCount();
    var topItems = getTopItems(5);
    var topCust = getTopCustomers(5);

    var sumEl = document.getElementById('lap-summary');
    if (sumEl) {
        sumEl.innerHTML =
            '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">' +
            '<div class="bg-indigo-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Total Pendapatan</p><p class="text-lg font-bold text-indigo-700">' + formatRp(stats.totalRevenue) + '</p></div>' +
            '<div class="bg-green-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Pesanan Selesai</p><p class="text-lg font-bold text-green-700">' + stats.completedOrders + '</p></div>' +
            '<div class="bg-orange-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Pesanan Aktif</p><p class="text-lg font-bold text-orange-700">' + stats.activeOrders + '</p></div>' +
            '<div class="bg-blue-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Total Transaksi</p><p class="text-lg font-bold text-blue-700">' + stats.totalOrders + '</p></div>' +
            '</div>';
    }

    var statusEl = document.getElementById('lap-status');
    if (statusEl) {
        var sh = '';
        for (var s in sc) {
            sh += '<div class="flex items-center justify-between py-2 border-b border-gray-50">';
            sh += '<span>' + statusBadge(s) + '</span>';
            sh += '<span class="text-sm font-semibold text-gray-700">' + sc[s] + '</span></div>';
        }
        statusEl.innerHTML = sh;
    }

    var tiEl = document.getElementById('lap-top-items');
    if (tiEl) {
        if (!topItems.length) { tiEl.innerHTML = '<p class="text-sm text-gray-400">Belum ada data</p>'; }
        else {
            var th = '<table class="w-full"><thead><tr class="border-b border-gray-100"><th class="text-left p-2 text-xs text-gray-500">#</th><th class="text-left p-2 text-xs text-gray-500">Alat</th><th class="text-right p-2 text-xs text-gray-500">Qty</th><th class="text-right p-2 text-xs text-gray-500">Revenue</th></tr></thead><tbody>';
            for (var i = 0; i < topItems.length; i++) {
                var t = topItems[i];
                th += '<tr class="border-b border-gray-50"><td class="p-2 text-sm font-bold text-indigo-600">' + (i+1) + '</td>';
                th += '<td class="p-2 text-sm text-gray-800">' + t.name + '</td>';
                th += '<td class="p-2 text-sm text-right text-gray-600">' + t.qty + ' unit</td>';
                th += '<td class="p-2 text-sm text-right font-medium">' + formatRp(t.revenue) + '</td></tr>';
            }
            th += '</tbody></table>';
            tiEl.innerHTML = th;
        }
    }

    var tcEl = document.getElementById('lap-top-customers');
    if (tcEl) {
        if (!topCust.length) { tcEl.innerHTML = '<p class="text-sm text-gray-400">Belum ada data</p>'; }
        else {
            var tch = '<table class="w-full"><thead><tr class="border-b border-gray-100"><th class="text-left p-2 text-xs text-gray-500">#</th><th class="text-left p-2 text-xs text-gray-500">Pelanggan</th><th class="text-right p-2 text-xs text-gray-500">Order</th><th class="text-right p-2 text-xs text-gray-500">Revenue</th></tr></thead><tbody>';
            for (var i = 0; i < topCust.length; i++) {
                var tc = topCust[i];
                tch += '<tr class="border-b border-gray-50"><td class="p-2 text-sm font-bold text-indigo-600">' + (i+1) + '</td>';
                tch += '<td class="p-2 text-sm text-gray-800">' + tc.name + '</td>';
                tch += '<td class="p-2 text-sm text-right text-gray-600">' + tc.orders + 'x</td>';
                tch += '<td class="p-2 text-sm text-right font-medium">' + formatRp(tc.revenue) + '</td></tr>';
            }
            tch += '</tbody></table>';
            tcEl.innerHTML = tch;
        }
    }
}

// =============================================================
// MODAL HELPERS
// =============================================================
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    lucide.createIcons();
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// =============================================================
// TOAST NOTIFICATION
// =============================================================
function showToast(message) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> ' + message;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(function() {
        toast.classList.add('toast-fade');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}

// =============================================================
// SIDEBAR TOGGLE
// =============================================================
function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var icon = document.getElementById('toggle-icon');

    sidebar.classList.toggle('collapsed');

    if (sidebar.classList.contains('collapsed')) {
        icon.setAttribute('data-lucide', 'panel-left-open');
    } else {
        icon.setAttribute('data-lucide', 'panel-left-close');
    }
    lucide.createIcons();
}

