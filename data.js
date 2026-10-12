
// ============================================================
// DATA.JS — Eztafest Admin Dashboard (FINAL)
// ============================================================

var SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyolO6DSNsWMDIpPUsBqV3MObrfs_n3BA-0c-hjZCmBTMvsJpjplGdiOWpCbP83cF-Z/exec';

var inventoryData = [];
var customersData = [];
var ordersData = [];

// ===== FORMAT RUPIAH =====
function formatRp(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// ===== GENERATE ID OTOMATIS =====
function generateId(prefix, dataArray) {
    var max = 0;
    for (var i = 0; i < dataArray.length; i++) {
        var parts = String(dataArray[i].id).split('-');
        var n = parseInt(parts[parts.length - 1]) || 0;
        if (n > max) max = n;
    }
    return prefix + '-' + String(max + 1).padStart(3, '0');
}

// ===== LOOKUP HELPERS =====
function getCustomerById(id) {
    for (var i = 0; i < customersData.length; i++) {
        if (customersData[i].id === id) return customersData[i];
    }
    return { name: '-', phone: '-', email: '-', address: '-', city: '-', notes: '' };
}

function getItemById(id) {
    for (var i = 0; i < inventoryData.length; i++) {
        if (inventoryData[i].id === id) return inventoryData[i];
    }
    return { name: '-', price: 0, category: '-', stock: 0, available: 0 };
}

// ===== HITUNG HARI SEWA =====
function getDaysBetween(start, end) {
    var d1 = new Date(start);
    var d2 = new Date(end);
    var diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
}

// ===== HITUNG TOTAL PESANAN =====
function calcOrderTotal(price, qty, days, discount, shipping) {
    var subtotal = price * qty * days;
    var total = subtotal - (discount || 0) + (shipping || 0);
    return { subtotal: subtotal, total: Math.max(0, total) };
}

// ===== HITUNG STOK TERSEDIA =====
function recalcAvailableStock() {
    var activeStatuses = ['Menunggu Pembayaran', 'Sudah Bayar DP', 'Sedang Disewa', 'Diantar'];
    for (var i = 0; i < inventoryData.length; i++) {
        var item = inventoryData[i];
        var used = 0;
        for (var j = 0; j < ordersData.length; j++) {
            var o = ordersData[j];
            if (o.itemId === item.id && activeStatuses.indexOf(o.status) !== -1) {
                used += Number(o.qty) || 0;
            }
        }
        item.available = Math.max(0, (Number(item.stock) || 0) - used);
    }
}

// ===== FORMAT TANGGAL INDONESIA =====
function formatDateID(dateStr) {
    if (!dateStr) return '-';
    var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
    var d = new Date(dateStr);
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateFull(dateStr) {
    if (!dateStr) return '-';
    var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var d = new Date(dateStr);
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// =============================================================
// NORMALIZE TANGGAL (handle semua format dari Google Sheets)
// "Thu Oct 15 2026..." → "2026-10-15"
// "2026-10-15T00:00:00" → "2026-10-15"
// "10/15/2026" → "2026-10-15"
// 46311 (serial Excel) → "2026-10-15"
// =============================================================
function normalizeDateStr(val) {
    if (!val || val === '' || val === '-') return '';
    var s = String(val).trim();

    // Sudah format YYYY-MM-DD → langsung return
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Format YYYY-MM-DDTHH:mm:ss (ISO) → ambil 10 karakter
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.substring(0, 10);

    // Format MM/DD/YYYY atau DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        }
    }

    // Angka serial Excel (misal 46311)
    if (/^\d{4,5}$/.test(s)) {
        var excelEpoch = new Date(1899, 11, 30);
        var d = new Date(excelEpoch.getTime() + Number(s) * 86400000);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    // Fallback: "Thu Oct 15 2026..." atau format lainnya
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    return s;
}

// =============================================================
// GOOGLE SHEETS: LOAD DATA
// =============================================================
async function loadFromSheet() {
    if (!SHEET_API_URL) {
        loadFromLocalStorage();
        return false;
    }

    try {
        showLoading(true);
        var res = await fetch(SHEET_API_URL + '?action=getAll');
        var data = await res.json();

        if (data.alat && data.alat.length) {
            inventoryData = data.alat;
            for (var i = 0; i < inventoryData.length; i++) {
                inventoryData[i].stock = Number(inventoryData[i].stock) || 0;
                inventoryData[i].available = Number(inventoryData[i].available) || 0;
                inventoryData[i].price = Number(inventoryData[i].price) || 0;
            }
        }

        if (data.pelanggan && data.pelanggan.length) {
            customersData = data.pelanggan;
        }

        if (data.transaksi && data.transaksi.length) {
            ordersData = data.transaksi;
            for (var i = 0; i < ordersData.length; i++) {
                var o = ordersData[i];
                o.qty = Number(o.qty) || 0;
                o.subtotal = Number(o.subtotal) || 0;
                o.discount = Number(o.discount) || 0;
                o.shipping = Number(o.shipping) || 0;
                o.total = Number(o.total) || 0;
                o.dp = Number(o.dp) || 0;
                o.remaining = Number(o.remaining) || 0;
                // Fix tanggal — convert semua format ke YYYY-MM-DD
                o.startDate = normalizeDateStr(o.startDate);
                o.endDate = normalizeDateStr(o.endDate);
                o.createdDate = normalizeDateStr(o.createdDate);
            }
        }

        recalcAvailableStock();
        saveToLocalStorage();
        showLoading(false);
        console.log('✅ Data loaded dari Google Sheets');
        return true;

    } catch (err) {
        console.warn('⚠️ Gagal load dari Sheets, pakai data lokal:', err);
        loadFromLocalStorage();
        showLoading(false);
        return false;
    }
}

// =============================================================
// GOOGLE SHEETS: SYNC (Add/Update/Delete)
// =============================================================
async function syncToSheet(action, target, rowData) {
    if (!SHEET_API_URL) {
        saveToLocalStorage();
        return;
    }

    try {
        var response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: action,
                sheet: target,
                data: rowData
            })
        });
        var result = await response.json();
        console.log('✅ Sync ' + target + ' (' + action + '):', result);
        saveToLocalStorage();
    } catch (err) {
        console.warn('⚠️ Gagal sync ke Sheets:', err);
        saveToLocalStorage();
    }
}

// ===== SYNC STOK TERSEDIA =====
async function syncAvailableStock() {
    if (!SHEET_API_URL) return;

    var items = [];
    for (var i = 0; i < inventoryData.length; i++) {
        items.push({
            id: inventoryData[i].id,
            tersedia: inventoryData[i].available
        });
    }

    try {
        await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'updateTersedia',
                sheet: 'Alat',
                data: { items: items }
            })
        });
        console.log('✅ Stok tersedia di-sync ke Sheets');
    } catch (err) {
        console.warn('⚠️ Gagal sync stok:', err);
    }
}

// =============================================================
// LOCAL STORAGE BACKUP
// =============================================================
function saveToLocalStorage() {
    localStorage.setItem('eztafest_inventory', JSON.stringify(inventoryData));
    localStorage.setItem('eztafest_customers', JSON.stringify(customersData));
    localStorage.setItem('eztafest_orders', JSON.stringify(ordersData));
}

function loadFromLocalStorage() {
    try {
        var inv = localStorage.getItem('eztafest_inventory');
        var cust = localStorage.getItem('eztafest_customers');
        var ord = localStorage.getItem('eztafest_orders');
        if (inv) inventoryData = JSON.parse(inv);
        if (cust) customersData = JSON.parse(cust);
        if (ord) ordersData = JSON.parse(ord);
        recalcAvailableStock();
    } catch (e) {
        console.warn('⚠️ Gagal load dari localStorage:', e);
    }
}

// ===== LOADING INDICATOR =====
function showLoading(show) {
    var el = document.getElementById('loading-overlay');
    if (el) el.classList.toggle('hidden', !show);
}

// =============================================================
// STATISTIK
// =============================================================
function getStats() {
    var now = new Date();
    var monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    var totalRevenue = 0, monthRevenue = 0, activeOrders = 0, completedOrders = 0, availableItems = 0;
    var activeStatuses = ['Menunggu Pembayaran', 'Sudah Bayar DP', 'Sedang Disewa', 'Diantar'];

    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan') totalRevenue += o.total;
        if (o.status === 'Selesai') completedOrders++;
        if (activeStatuses.indexOf(o.status) !== -1) activeOrders++;
        if (o.createdDate && String(o.createdDate).indexOf(monthStr) === 0 && o.status !== 'Dibatalkan') {
            monthRevenue += o.total;
        }
    }
    for (var i = 0; i < inventoryData.length; i++) {
        availableItems += inventoryData[i].available;
    }

    return {
        totalRevenue: totalRevenue, monthRevenue: monthRevenue,
        activeOrders: activeOrders, completedOrders: completedOrders,
        availableItems: availableItems, totalCustomers: customersData.length,
        totalOrders: ordersData.length
    };
}

function getTopItems(limit) {
    var itemCount = {};
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan') {
            if (!itemCount[o.itemId]) itemCount[o.itemId] = { qty: 0, revenue: 0 };
            itemCount[o.itemId].qty += Number(o.qty) || 0;
            itemCount[o.itemId].revenue += Number(o.total) || 0;
        }
    }
    var arr = [];
    for (var id in itemCount) {
        var item = getItemById(id);
        arr.push({ id: id, name: item.name, qty: itemCount[id].qty, revenue: itemCount[id].revenue });
    }
    arr.sort(function(a, b) { return b.qty - a.qty; });
    return arr.slice(0, limit || 5);
}

function getTopCustomers(limit) {
    var custCount = {};
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan') {
            if (!custCount[o.customerId]) custCount[o.customerId] = { orders: 0, revenue: 0 };
            custCount[o.customerId].orders++;
            custCount[o.customerId].revenue += Number(o.total) || 0;
        }
    }
    var arr = [];
    for (var id in custCount) {
        var cust = getCustomerById(id);
        arr.push({ id: id, name: cust.name, orders: custCount[id].orders, revenue: custCount[id].revenue });
    }
    arr.sort(function(a, b) { return b.orders - a.orders; });
    return arr.slice(0, limit || 5);
}

function getMonthlyRevenue(year) {
    var months = new Array(12).fill(0);
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status !== 'Dibatalkan' && o.createdDate) {
            var d = new Date(o.createdDate);
            if (d.getFullYear() === year) months[d.getMonth()] += Number(o.total) || 0;
        }
    }
    return months;
}

function getStatusCount() {
    var statuses = {
        'Menunggu Pembayaran':0, 'Sudah Bayar DP':0, 'Sedang Disewa':0,
        'Diantar':0, 'Dikembalikan':0, 'Selesai':0, 'Dibatalkan':0
    };
    for (var i = 0; i < ordersData.length; i++) {
        var s = ordersData[i].status;
        if (statuses[s] !== undefined) statuses[s]++;
    }
    return statuses;
}