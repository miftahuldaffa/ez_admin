
// ============================================================
// APP.JS — Eztafest Admin Dashboard (FULL)
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

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
    var sb = document.querySelector('.sidebar');
    var ov = document.getElementById('sidebar-overlay');
    if (window.innerWidth < 768) {
        sb.classList.toggle('mobile-open');
        ov.classList.toggle('active');
    } else {
        sb.classList.toggle('collapsed');
    }
}
function closeSidebar() {
    var sb = document.querySelector('.sidebar');
    var ov = document.getElementById('sidebar-overlay');
    sb.classList.remove('mobile-open');
    ov.classList.remove('active');
}

// ===== TAB =====
function switchTab(id) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
    var t = {dashboard:['Dashboard','Ringkasan bisnis Eztafest'],katalog:['Katalog Alat','Kelola inventaris alat event'],pelanggan:['Pelanggan','Kelola data pelanggan'],transaksi:['Transaksi','Kelola pesanan dan pembayaran'],kalender:['Kalender Sewa','Lihat jadwal penyewaan alat'],laporan:['Laporan','Analisa pendapatan dan performa']};
    document.getElementById('page-title').innerText = t[id][0];
    document.getElementById('page-subtitle').innerText = t[id][1];
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) { btns[i].classList.remove('active'); if (btns[i].dataset.target === id) btns[i].classList.add('active'); }
    closeSidebar();
    renderAll();
}

// ===== RENDER ALL =====
function renderAll() {
    renderDashboard(); renderKatalog(); renderPelanggan();
    renderTransaksi(); renderCalendar(); renderLaporan();
    lucide.createIcons();
}

// ===== STATUS BADGE =====
function statusBadge(s) {
    var m = {'Menunggu Pembayaran':'badge-waiting','Sudah Bayar DP':'badge-dp','Sedang Disewa':'badge-active','Diantar':'badge-delivery','Dikembalikan':'badge-returned','Selesai':'badge-done','Dibatalkan':'badge-cancelled'};
    return '<span class="badge '+(m[s]||'badge-waiting')+'">'+s+'</span>';
}

// =============================================================
// DASHBOARD
// =============================================================
function renderDashboard() {
    var s = getStats();
    document.getElementById('dash-revenue').innerText = formatRp(s.monthRevenue);
    document.getElementById('dash-orders').innerText = s.activeOrders;
    document.getElementById('dash-available').innerText = s.availableItems;
    document.getElementById('dash-customers').innerText = s.totalCustomers;

    var recent = ordersData.slice().reverse().slice(0,5);
    var tbody = document.getElementById('dash-recent-tbody');
    if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>'; }
    else {
        var h = '';
        for (var i = 0; i < recent.length; i++) {
            var o = recent[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
            h += '<tr class="border-b border-gray-50">';
            h += '<td class="p-3 text-sm font-medium text-indigo-700">'+o.id+'</td>';
            h += '<td class="p-3 text-sm text-gray-700">'+c.name+'</td>';
            h += '<td class="p-3 text-sm text-gray-500">'+it.name+'</td>';
            h += '<td class="p-3 text-sm font-medium">'+formatRp(o.total)+'</td>';
            h += '<td class="p-3 text-sm">'+statusBadge(o.status)+'</td></tr>';
        }
        tbody.innerHTML = h;
    }

    var top = getTopItems(3), th = '';
    for (var i = 0; i < top.length; i++) {
        var t = top[i];
        th += '<div class="flex items-center justify-between py-2 '+(i<top.length-1?'border-b border-gray-50':'')+'">';
        th += '<div><span class="text-sm font-medium text-gray-800">'+t.name+'</span>';
        th += '<span class="text-xs text-gray-400 ml-2">'+t.qty+' unit</span></div>';
        th += '<span class="text-sm font-semibold text-indigo-700">'+formatRp(t.revenue)+'</span></div>';
    }
    var te = document.getElementById('dash-top-items');
    if (te) te.innerHTML = th || '<p class="text-sm text-gray-400">Belum ada data</p>';
}

// =============================================================
// KATALOG
// =============================================================
function renderKatalog() {
    var el = document.getElementById('search-katalog');
    var q = el ? el.value.toLowerCase() : '';
    var f = [];
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.name.toLowerCase().indexOf(q)!==-1 || it.category.toLowerCase().indexOf(q)!==-1 || it.id.toLowerCase().indexOf(q)!==-1) f.push(it);
    }
    var tbody = document.getElementById('katalog-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada alat ditemukan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var it = f[i], ri = inventoryData.indexOf(it);
        var ac = it.available > 0 ? 'text-green-600' : 'text-red-600';
        var cc = it.condition==='Baik'?'badge-done':(it.condition==='Rusak'?'badge-cancelled':'badge-waiting');
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">'+it.id+'</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">'+it.name+'</td>';
        h += '<td class="p-4 text-sm"><span class="badge badge-active">'+it.category+'</span></td>';
        h += '<td class="p-4 text-sm text-gray-600 text-center">'+it.stock+'</td>';
        h += '<td class="p-4 text-sm font-semibold text-center '+ac+'">'+it.available+'</td>';
        h += '<td class="p-4 text-sm text-gray-700 font-medium">'+formatRp(it.price)+'</td>';
        h += '<td class="p-4 text-sm"><span class="badge '+cc+'">'+(it.condition||'Baik')+'</span></td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editAlat('+ri+')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteAlat('+ri+')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>';
    }
    tbody.innerHTML = h;
}

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
    var d = { name:document.getElementById('alat-nama').value, category:document.getElementById('alat-kategori').value, stock:parseInt(document.getElementById('alat-stok').value), price:parseInt(document.getElementById('alat-harga').value), condition:document.getElementById('alat-kondisi').value, description:document.getElementById('alat-keterangan').value };
    if (idx === -1) {
        d.id = generateId('EQ', inventoryData); d.available = d.stock;
        inventoryData.push(d); syncToSheet('add','Alat',d);
        showToast('Alat "'+d.name+'" berhasil ditambah');
    } else {
        inventoryData[idx].name=d.name; inventoryData[idx].category=d.category;
        inventoryData[idx].stock=d.stock; inventoryData[idx].price=d.price;
        inventoryData[idx].condition=d.condition; inventoryData[idx].description=d.description;
        recalcAvailableStock(); syncToSheet('update','Alat',inventoryData[idx]); syncAvailableStock();
        showToast('Alat "'+d.name+'" berhasil diupdate');
    }
    closeModal('modal-alat'); renderAll();
}
function deleteAlat(idx) {
    if (!confirm('Hapus alat "'+inventoryData[idx].name+'"?')) return;
    syncToSheet('delete','Alat',{id:inventoryData[idx].id});
    showToast('Alat "'+inventoryData[idx].name+'" dihapus');
    inventoryData.splice(idx,1); renderAll();
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
        if (c.name.toLowerCase().indexOf(q)!==-1 || String(c.phone).indexOf(q)!==-1 || c.id.toLowerCase().indexOf(q)!==-1) f.push(c);
    }
    var tbody = document.getElementById('pelanggan-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada pelanggan ditemukan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var c = f[i], ri = customersData.indexOf(c), oc = 0;
        for (var j = 0; j < ordersData.length; j++) { if (ordersData[j].customerId===c.id) oc++; }
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-4 text-sm font-medium text-indigo-700">'+c.id+'</td>';
        h += '<td class="p-4 text-sm font-medium text-gray-800">'+c.name+'</td>';
        h += '<td class="p-4 text-sm text-gray-600">'+c.phone+'</td>';
        h += '<td class="p-4 text-sm text-gray-500">'+(c.email||'-')+'</td>';
        h += '<td class="p-4 text-sm text-gray-500">'+(c.address||'-')+(c.city?', '+c.city:'')+'</td>';
        h += '<td class="p-4 text-sm font-semibold text-center">'+oc+'</td>';
        h += '<td class="p-4 text-sm">';
        h += '<button onclick="editCustomer('+ri+')" class="action-btn action-btn-edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit</button>';
        h += '<button onclick="deleteCustomer('+ri+')" class="action-btn action-btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>';
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
    var d = { name:document.getElementById('cust-nama').value, phone:document.getElementById('cust-phone').value, email:document.getElementById('cust-email').value, address:document.getElementById('cust-alamat').value, city:document.getElementById('cust-kota').value, notes:document.getElementById('cust-catatan').value };
    if (idx === -1) {
        d.id = generateId('CST', customersData); customersData.push(d);
        syncToSheet('add','Pelanggan',d); showToast('Pelanggan "'+d.name+'" berhasil ditambah');
    } else {
        customersData[idx].name=d.name; customersData[idx].phone=d.phone;
        customersData[idx].email=d.email; customersData[idx].address=d.address;
        customersData[idx].city=d.city; customersData[idx].notes=d.notes;
        syncToSheet('update','Pelanggan',customersData[idx]);
        showToast('Pelanggan "'+d.name+'" berhasil diupdate');
    }
    closeModal('modal-pelanggan'); renderAll();
}
function deleteCustomer(idx) {
    if (!confirm('Hapus pelanggan "'+customersData[idx].name+'"?')) return;
    syncToSheet('delete','Pelanggan',{id:customersData[idx].id});
    showToast('Pelanggan "'+customersData[idx].name+'" dihapus');
    customersData.splice(idx,1); renderAll();
}

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
        var o = ordersData[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        var mq = o.id.toLowerCase().indexOf(q)!==-1 || c.name.toLowerCase().indexOf(q)!==-1 || it.name.toLowerCase().indexOf(q)!==-1;
        var ms = !sf || o.status===sf;
        if (mq && ms) f.push(o);
    }
    var tbody = document.getElementById('transaksi-tbody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada transaksi ditemukan</td></tr>'; return; }
    var h = '';
    for (var i = 0; i < f.length; i++) {
        var o = f[i], c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        var ri = ordersData.indexOf(o);
        h += '<tr class="border-b border-gray-50">';
        h += '<td class="p-3 text-sm font-medium text-indigo-700">'+o.id+'</td>';
        h += '<td class="p-3 text-sm"><div class="font-medium text-gray-800">'+c.name+'</div><div class="text-xs text-gray-400">'+c.phone+'</div></td>';
        h += '<td class="p-3 text-sm text-gray-700">'+it.name+'<span class="text-xs text-gray-400 ml-1">x'+o.qty+'</span></td>';
        h += '<td class="p-3 text-sm text-gray-600"><div>'+formatDateID(o.startDate)+'</div><div class="text-xs text-gray-400">s/d '+formatDateID(o.endDate)+'</div></td>';
        h += '<td class="p-3 text-sm font-semibold text-gray-800">'+formatRp(o.total)+'</td>';
        h += '<td class="p-3 text-sm">';
        if (o.dp>0) h += '<div class="text-xs text-green-600">DP: '+formatRp(o.dp)+'</div>';
        if (o.remaining>0) h += '<div class="text-xs text-red-600">Sisa: '+formatRp(o.remaining)+'</div>';
        h += '</td>';
        h += '<td class="p-3 text-sm">'+statusBadge(o.status)+'</td>';
        h += '<td class="p-3 text-sm"><div class="flex items-center gap-1 flex-wrap">';
        h += '<button onclick="openInvoice('+ri+')" class="action-btn action-btn-invoice"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></button>';
        h += '<select onchange="changeStatus('+ri+',this.value)" class="text-xs border rounded-lg px-1 py-1">';
        h += '<option value="" disabled selected>Status</option>';
        h += '<option value="Menunggu Pembayaran">Menunggu</option><option value="Sudah Bayar DP">DP</option>';
        h += '<option value="Sedang Disewa">Disewa</option><option value="Diantar">Antar</option>';
        h += '<option value="Dikembalikan">Kembali</option><option value="Selesai">Selesai</option>';
        h += '<option value="Dibatalkan">Batal</option>';
        h += '</select></div></td></tr>';
    }
    tbody.innerHTML = h;
}
function changeStatus(idx, val) {
    if (!val) return;
    ordersData[idx].status = val;
    recalcAvailableStock(); syncToSheet('update','Transaksi',ordersData[idx]); syncAvailableStock();
    showToast('Status '+ordersData[idx].id+' → '+val); renderAll();
}
function openOrderModal() {
    document.getElementById('form-order').reset();
    document.getElementById('order-total-preview').innerText = 'Rp 0';
    document.getElementById('order-subtotal-preview').innerText = 'Rp 0';
    document.getElementById('order-sisa-preview').innerText = 'Rp 0';
    var cs = document.getElementById('order-customer');
    var ch = '<option value="" disabled selected>Pilih Pelanggan</option>';
    for (var i = 0; i < customersData.length; i++) { var c = customersData[i]; ch += '<option value="'+c.id+'">'+c.name+' ('+c.phone+')</option>'; }
    cs.innerHTML = ch;
    var is = document.getElementById('order-item');
    var ih = '<option value="" disabled selected>Pilih Alat</option>';
    for (var i = 0; i < inventoryData.length; i++) {
        var it = inventoryData[i];
        if (it.available > 0) ih += '<option value="'+it.id+'" data-price="'+it.price+'" data-avail="'+it.available+'">'+it.name+' — '+formatRp(it.price)+'/hari (sisa: '+it.available+')</option>';
    }
    is.innerHTML = ih;
    openModal('modal-order');
}
function calcOrderPreview() {
    var is = document.getElementById('order-item');
    var sel = is.options[is.selectedIndex];
    if (!sel || !sel.dataset.price) return;
    var price = parseInt(sel.dataset.price), qty = parseInt(document.getElementById('order-qty').value)||1;
    var start = document.getElementById('order-start').value, end = document.getElementById('order-end').value;
    var days = (start && end) ? getDaysBetween(start,end) : 1;
    var discount = parseInt(document.getElementById('order-diskon').value)||0;
    var shipping = parseInt(document.getElementById('order-ongkir').value)||0;
    var dp = parseInt(document.getElementById('order-dp').value)||0;
    var calc = calcOrderTotal(price,qty,days,discount,shipping);
    document.getElementById('order-subtotal-preview').innerText = formatRp(calc.subtotal);
    document.getElementById('order-total-preview').innerText = formatRp(calc.total);
    document.getElementById('order-sisa-preview').innerText = formatRp(Math.max(0,calc.total-dp));
}
function saveOrder(e) {
    e.preventDefault();
    var is = document.getElementById('order-item'), sel = is.options[is.selectedIndex];
    var price = parseInt(sel.dataset.price), qty = parseInt(document.getElementById('order-qty').value);
    var sd = document.getElementById('order-start').value, ed = document.getElementById('order-end').value;
    var days = getDaysBetween(sd,ed);
    var discount = parseInt(document.getElementById('order-diskon').value)||0;
    var shipping = parseInt(document.getElementById('order-ongkir').value)||0;
    var dp = parseInt(document.getElementById('order-dp').value)||0;
    var ma = parseInt(sel.dataset.avail);
    if (qty > ma) { alert('Jumlah melebihi stok tersedia ('+ma+' unit).'); return; }
    var calc = calcOrderTotal(price,qty,days,discount,shipping);
    var od = { id:generateId('ORD',ordersData), customerId:document.getElementById('order-customer').value, itemId:document.getElementById('order-item').value, qty:qty, startDate:sd, endDate:ed, subtotal:calc.subtotal, discount:discount, shipping:shipping, total:calc.total, dp:dp, remaining:Math.max(0,calc.total-dp), status:dp>0?'Sudah Bayar DP':'Menunggu Pembayaran', notes:document.getElementById('order-notes').value, createdDate:getTodayStr() };
    ordersData.push(od); recalcAvailableStock();
    syncToSheet('add','Transaksi',od); syncAvailableStock();
    showToast('Pesanan '+od.id+' berhasil dibuat');
    closeModal('modal-order'); renderAll();
}

// =============================================================
// KALENDER
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
        var ds = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var isT = ds === todayStr;

        // Cari semua order yang aktif di tanggal ini
        var bk = [];
        for (var b = 0; b < ordersData.length; b++) {
            var o = ordersData[b];
            if (o.status === 'Dibatalkan') continue;

            // Normalize tanggal: ambil 10 karakter pertama (YYYY-MM-DD)
            var oStart = String(o.startDate).substring(0, 10);
            var oEnd = String(o.endDate).substring(0, 10);

            if (ds >= oStart && ds <= oEnd) {
                bk.push(o);
            }
        }

        var ev = '';
        for (var b = 0; b < bk.length; b++) {
            var bkg = bk[b];
            var it = getItemById(bkg.itemId);
            var cust = getCustomerById(bkg.customerId);

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
            var label = it.name.length > 12 ? it.name.substring(0, 12) + '..' : it.name;

            ev += '<div onclick="openInvoice(' + oi + ')" class="cal-event ' + ec + '" title="' + it.name + ' x' + bkg.qty + ' — ' + cust.name + ' (' + bkg.status + ')">' + label + '</div>';
        }

        html += '<div class="cal-day ' + (isT ? 'today' : '') + '">';
        html += '<div class="day-num">' + day + '</div>';
        html += ev;
        html += '</div>';
    }
    grid.innerHTML = html;
}


function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(); lucide.createIcons();
}

// =============================================================
// INVOICE
// =============================================================
function openInvoice(idx) {
    selectedOrderForInvoice = ordersData[idx];
    var o = selectedOrderForInvoice, c = getCustomerById(o.customerId), it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate,o.endDate);
    document.getElementById('inv-id').innerText = '#'+o.id;
    document.getElementById('inv-date').innerText = formatDateFull(getTodayStr());
    document.getElementById('inv-name').innerText = c.name;
    document.getElementById('inv-phone').innerText = 'WA: '+c.phone;
    document.getElementById('inv-email').innerText = c.email||'';
    document.getElementById('inv-address').innerText = (c.address||'')+(c.city?', '+c.city:'');
    document.getElementById('inv-period').innerText = formatDateID(o.startDate)+'  s/d  '+formatDateID(o.endDate);
    document.getElementById('inv-days').innerText = days+' hari sewa';
    var ih = '<tr class="border-b border-gray-100">';
    ih += '<td class="p-3 text-sm text-gray-800">'+it.name+'<br><span class="text-xs text-gray-400">'+it.category+'</span></td>';
    ih += '<td class="p-3 text-sm text-center">'+o.qty+'</td>';
    ih += '<td class="p-3 text-sm text-center">'+days+'</td>';
    ih += '<td class="p-3 text-sm text-right">'+formatRp(it.price)+'</td>';
    ih += '<td class="p-3 text-sm text-right font-semibold">'+formatRp(o.subtotal)+'</td></tr>';
    document.getElementById('inv-items-tbody').innerHTML = ih;
    document.getElementById('inv-subtotal').innerText = formatRp(o.subtotal);
    var dr = document.getElementById('inv-discount-row'), sr = document.getElementById('inv-shipping-row');
    if (dr) dr.style.display = o.discount>0?'flex':'none';
    if (sr) sr.style.display = o.shipping>0?'flex':'none';
    var de = document.getElementById('inv-discount'), se = document.getElementById('inv-shipping');
    if (de) de.innerText = '- '+formatRp(o.discount);
    if (se) se.innerText = formatRp(o.shipping);
    document.getElementById('inv-total').innerText = formatRp(o.total);
    document.getElementById('inv-dp').innerText = formatRp(o.dp);
    document.getElementById('inv-remaining').innerText = formatRp(o.remaining);
    var stEl = document.getElementById('inv-status');
    if (stEl) stEl.innerHTML = statusBadge(o.status);
    var ntEl = document.getElementById('inv-notes');
    if (ntEl) ntEl.innerText = o.notes||'-';
    var sgEl = document.getElementById('inv-sig-name');
    if (sgEl) sgEl.innerText = c.name;
    openModal('modal-invoice');
}
function sendInvoiceWA() {
    if (!selectedOrderForInvoice) return;
    var o = selectedOrderForInvoice, c = getCustomerById(o.customerId), it = getItemById(o.itemId);
    var days = getDaysBetween(o.startDate,o.endDate);
    var phone = String(c.phone).trim();
    if (phone.indexOf('08')===0) phone = '62'+phone.substring(1);
    var m = 'Halo *'+c.name+'*, ini dari *Eztafest* 🎪\n\n';
    m += '📋 *INVOICE '+o.id+'*\n━━━━━━━━━━━━━━━━━━\n';
    m += '🔧 Alat: '+it.name+'\n📦 Qty: '+o.qty+' unit\n';
    m += '📅 Periode: '+formatDateID(o.startDate)+' s/d '+formatDateID(o.endDate)+' ('+days+' hari)\n';
    m += '━━━━━━━━━━━━━━━━━━\nSubtotal: '+formatRp(o.subtotal)+'\n';
    if (o.discount>0) m += 'Diskon: -'+formatRp(o.discount)+'\n';
    if (o.shipping>0) m += 'Ongkir: '+formatRp(o.shipping)+'\n';
    m += '━━━━━━━━━━━━━━━━━━\n*Total: '+formatRp(o.total)+'*\n';
    if (o.dp>0) m += 'DP Dibayar: '+formatRp(o.dp)+'\n';
    if (o.remaining>0) m += '🔴 *Sisa Bayar: '+formatRp(o.remaining)+'*\n';
    m += '\n💳 Pembayaran via transfer:\nBank BCA - 1234567890\na/n Eztafest\n\n';
    m += 'Terima kasih atas kepercayaan Anda! 🙏\n_Eztafest — Sewa Alat Event Profesional_';
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(m),'_blank');
}

// =============================================================
// LAPORAN
// =============================================================
function renderLaporan() {
    var s = getStats(), sc = getStatusCount(), ti = getTopItems(5), tc = getTopCustomers(5);
    var sumEl = document.getElementById('lap-summary');
    if (sumEl) {
        sumEl.innerHTML = '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">'
            +'<div class="bg-indigo-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Total Pendapatan</p><p class="text-lg font-bold text-indigo-700">'+formatRp(s.totalRevenue)+'</p></div>'
            +'<div class="bg-green-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Pesanan Selesai</p><p class="text-lg font-bold text-green-700">'+s.completedOrders+'</p></div>'
            +'<div class="bg-orange-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Pesanan Aktif</p><p class="text-lg font-bold text-orange-700">'+s.activeOrders+'</p></div>'
            +'<div class="bg-blue-50 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">Total Transaksi</p><p class="text-lg font-bold text-blue-700">'+s.totalOrders+'</p></div></div>';
    }
    var stEl = document.getElementById('lap-status');
    if (stEl) { var sh=''; for (var k in sc) { sh+='<div class="flex items-center justify-between py-2 border-b border-gray-50"><span>'+statusBadge(k)+'</span><span class="text-sm font-semibold text-gray-700">'+sc[k]+'</span></div>'; } stEl.innerHTML = sh; }

    var tiEl = document.getElementById('lap-top-items');
    if (tiEl) {
        if (!ti.length) tiEl.innerHTML = '<p class="text-sm text-gray-400">Belum ada data</p>';
        else { var th='<table class="w-full"><thead><tr class="border-b border-gray-100"><th class="text-left p-2 text-xs text-gray-500">#</th><th class="text-left p-2 text-xs text-gray-500">Alat</th><th class="text-right p-2 text-xs text-gray-500">Qty</th><th class="text-right p-2 text-xs text-gray-500">Revenue</th></tr></thead><tbody>';
            for (var i=0;i<ti.length;i++) { th+='<tr class="border-b border-gray-50"><td class="p-2 text-sm font-bold text-indigo-600">'+(i+1)+'</td><td class="p-2 text-sm text-gray-800">'+ti[i].name+'</td><td class="p-2 text-sm text-right text-gray-600">'+ti[i].qty+'</td><td class="p-2 text-sm text-right font-medium">'+formatRp(ti[i].revenue)+'</td></tr>'; }
            th+='</tbody></table>'; tiEl.innerHTML = th;
        }
    }
    var tcEl = document.getElementById('lap-top-customers');
    if (tcEl) {
        if (!tc.length) tcEl.innerHTML = '<p class="text-sm text-gray-400">Belum ada data</p>';
        else { var tch='<table class="w-full"><thead><tr class="border-b border-gray-100"><th class="text-left p-2 text-xs text-gray-500">#</th><th class="text-left p-2 text-xs text-gray-500">Pelanggan</th><th class="text-right p-2 text-xs text-gray-500">Order</th><th class="text-right p-2 text-xs text-gray-500">Revenue</th></tr></thead><tbody>';
            for (var i=0;i<tc.length;i++) { tch+='<tr class="border-b border-gray-50"><td class="p-2 text-sm font-bold text-indigo-600">'+(i+1)+'</td><td class="p-2 text-sm text-gray-800">'+tc[i].name+'</td><td class="p-2 text-sm text-right text-gray-600">'+tc[i].orders+'x</td><td class="p-2 text-sm text-right font-medium">'+formatRp(tc[i].revenue)+'</td></tr>'; }
            tch+='</tbody></table>'; tcEl.innerHTML = tch;
        }
    }
}

// =============================================================
// MODAL + TOAST
// =============================================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); lucide.createIcons(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg) {
    var c = document.getElementById('toast-container'); if (!c) return;
    var t = document.createElement('div'); t.className = 'toast-item';
    t.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> '+msg;
    c.appendChild(t); lucide.createIcons();
    setTimeout(function(){ t.classList.add('toast-fade'); setTimeout(function(){ t.remove(); },300); },3000);
}