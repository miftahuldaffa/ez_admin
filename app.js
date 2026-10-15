
// ============================================================
// APP.JS — BAGIAN 2: Laporan, CashFlow, Export
// GABUNG ke akhir app.js (setelah Bagian 1)
// ============================================================

// ======================== LAPORAN ========================
function renderLaporan() {
    var f = getFilterMonth('lap');
    var mn = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var totalRevenue = 0, totalOrders = 0, completedOrders = 0, totalExpense = 0;
    var activeStatuses = ['Menunggu Pembayaran','Sudah Bayar DP','Sedang Disewa','Diantar'];

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
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100"><p class="text-sm text-gray-500">Total Pemasukan</p><p class="text-2xl font-extrabold text-green-600 mt-1">' + formatRp(totalRevenue) + '</p><p class="text-xs text-gray-400 mt-1">' + totalOrders + ' pesanan</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100"><p class="text-sm text-gray-500">Total Pengeluaran</p><p class="text-2xl font-extrabold text-red-600 mt-1">' + formatRp(totalExpense) + '</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100"><p class="text-sm text-gray-500">Laba Bersih</p><p class="text-2xl font-extrabold ' + profitClass + ' mt-1">' + formatRp(profit) + '</p></div>' +
            '<div class="stat-card bg-white rounded-2xl p-5 border border-gray-100"><p class="text-sm text-gray-500">Pesanan Selesai</p><p class="text-2xl font-extrabold text-gray-800 mt-1">' + completedOrders + '</p><p class="text-xs text-gray-400 mt-1">dari ' + totalOrders + ' total</p></div>';
    }

    renderCashFlow(f);

    // Status Pesanan
    var statusCount = {};
    var allSt = ['Menunggu Pembayaran','Sudah Bayar DP','Sedang Disewa','Diantar','Dikembalikan','Selesai','Dibatalkan'];
    for (var i = 0; i < allSt.length; i++) statusCount[allSt[i]] = 0;
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (!matchesFilter(o.createdDate, f)) continue;
        if (statusCount[o.status] !== undefined) statusCount[o.status]++;
    }
    var bMap = {'Menunggu Pembayaran':'badge-waiting','Sudah Bayar DP':'badge-dp','Sedang Disewa':'badge-active','Diantar':'badge-delivery','Dikembalikan':'badge-returned','Selesai':'badge-done','Dibatalkan':'badge-cancelled'};
    var sH = '';
    for (var i = 0; i < allSt.length; i++) {
        var s = allSt[i];
        sH += '<div class="flex items-center justify-between py-2 ' + (i < allSt.length-1 ? 'border-b border-gray-50' : '') + '"><span class="badge ' + bMap[s] + '">' + s + '</span><span class="text-sm font-bold text-gray-700">' + statusCount[s] + '</span></div>';
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
    for (var id in itemCount) { var it = getItemById(id); topItems.push({ name: it.name, qty: itemCount[id].qty, revenue: itemCount[id].revenue }); }
    topItems.sort(function(a,b) { return b.qty - a.qty });
    var tiH = '';
    for (var i = 0; i < Math.min(5, topItems.length); i++) {
        var t = topItems[i];
        tiH += '<div class="flex items-center justify-between py-2 ' + (i < Math.min(5, topItems.length)-1 ? 'border-b border-gray-50' : '') + '"><div><span class="text-sm font-medium text-gray-800">' + t.name + '</span><span class="text-xs text-gray-400 ml-2">' + t.qty + ' unit</span></div><span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
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
    for (var id in custCount) { var c = getCustomerById(id); topCust.push({ name: c.name, orders: custCount[id].orders, revenue: custCount[id].revenue }); }
    topCust.sort(function(a,b) { return b.revenue - a.revenue });
    var tcH = '';
    for (var i = 0; i < Math.min(5, topCust.length); i++) {
        var t = topCust[i];
        tcH += '<div class="flex items-center justify-between py-2 ' + (i < Math.min(5, topCust.length)-1 ? 'border-b border-gray-50' : '') + '"><div><span class="text-sm font-medium text-gray-800">' + t.name + '</span><span class="text-xs text-gray-400 ml-2">' + t.orders + ' pesanan</span></div><span class="text-sm font-semibold text-indigo-700">' + formatRp(t.revenue) + '</span></div>';
    }
    var tcEl = document.getElementById('laporan-top-customers');
    if (tcEl) tcEl.innerHTML = tcH || '<p class="text-sm text-gray-400">Belum ada data</p>';

    // Top Pengeluaran
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
    topExp.sort(function(a,b) { return b.amount - a.amount });
    var teH = '';
    for (var i = 0; i < topExp.length; i++) {
        var t = topExp[i];
        teH += '<div class="flex items-center justify-between py-2 ' + (i < topExp.length-1 ? 'border-b border-gray-50' : '') + '"><span class="text-sm font-medium text-gray-800">' + t.name + '</span><span class="text-sm font-semibold text-red-600">' + formatRp(t.amount) + '</span></div>';
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
            var o = ordersData[i]; if (o.status === 'Dibatalkan') continue;
            var d = new Date(o.createdDate);
            if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === m) income += Number(o.total) || 0;
        }
        for (var i = 0; i < pengeluaranData.length; i++) {
            var e = pengeluaranData[i]; var d = new Date(e.date);
            if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === m) expense += Number(e.amount) || 0;
        }
        totalIncome += income; totalExpense += expense;
        rows.push({ month: mn[m], income: income, expense: expense, profit: income - expense });
    }
    return { rows: rows, totalIncome: totalIncome, totalExpense: totalExpense, totalProfit: totalIncome - totalExpense };
}

function renderCashFlow(filter) {
    var data = getCashFlowData(filter);
    var tbody = document.getElementById('cashflow-body'), tfoot = document.getElementById('cashflow-footer');
    if (!tbody || !tfoot) return;
    var h = '';
    for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i], pc = r.profit >= 0 ? 'cashflow-profit positive' : 'cashflow-profit negative';
        h += '<tr><td>' + r.month + '</td><td class="cashflow-income">' + formatRp(r.income) + '</td><td class="cashflow-expense">' + formatRp(r.expense) + '</td><td class="' + pc + '">' + formatRp(r.profit) + '</td></tr>';
    }
    tbody.innerHTML = h;
    var tpc = data.totalProfit >= 0 ? 'cashflow-profit positive' : 'cashflow-profit negative';
    tfoot.innerHTML = '<tr><td>TOTAL</td><td class="cashflow-income">' + formatRp(data.totalIncome) + '</td><td class="cashflow-expense">' + formatRp(data.totalExpense) + '</td><td class="' + tpc + '">' + formatRp(data.totalProfit) + '</td></tr>';
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
    wsData.push([], ['=== DETAIL PEMASUKAN ==='], ['Order ID','Pelanggan','Alat','Qty','Periode','Total','DP','Sisa','Status']);
    for (var i = 0; i < ordersData.length; i++) {
        var o = ordersData[i];
        if (o.status === 'Dibatalkan' || !matchesFilter(o.createdDate, f)) continue;
        var c = getCustomerById(o.customerId), it = getItemById(o.itemId);
        wsData.push([o.id, c.name, it.name, Number(o.qty), formatDateID(o.startDate)+' - '+formatDateID(o.endDate), Number(o.total), Number(o.dp), Number(o.remaining), o.status]);
    }

    // Detail Pengeluaran
    wsData.push([], ['=== DETAIL PENGELUARAN ==='], ['ID','Tanggal','Kategori','Deskripsi','Jumlah','Vendor','Order','Catatan']);
    for (var i = 0; i < pengeluaranData.length; i++) {
        var e = pengeluaranData[i];
        if (!matchesFilter(e.date, f)) continue;
        wsData.push([e.id, formatDateID(e.date), e.category, e.description, Number(e.amount), e.vendor||'-', e.orderId||'-', e.notes||'-']);
    }

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:18},{wch:18},{wch:18},{wch:18},{wch:25},{wch:15},{wch:15},{wch:15},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, 'Eztafest_CashFlow_' + label.replace(/ /g,'_') + '.xlsx');
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

    doc.setFontSize(18); doc.setTextColor(49,46,129); doc.text('EZTAFEST', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100,100,100); doc.text('Rental Alat Event Profesional - Semarang', 14, 27);
    doc.setFontSize(14); doc.setTextColor(0,0,0); doc.text('Laporan Cash Flow', 14, 40);
    doc.setFontSize(10); doc.text('Periode: ' + label, 14, 47);
    doc.text('Tanggal: ' + formatDateFull(getTodayStr()), 14, 53);

    var cfHead = [['Bulan','Pemasukan','Pengeluaran','Laba / Rugi']];
    var cfBody = [];
    for (var i = 0; i < data.rows.length; i++) { var r = data.rows[i]; cfBody.push([r.month, formatRp(r.income), formatRp(r.expense), formatRp(r.profit)]); }
    cfBody.push(['TOTAL', formatRp(data.totalIncome), formatRp(data.totalExpense), formatRp(data.totalProfit)]);

    doc.autoTable({ head: cfHead, body: cfBody, startY: 60, theme: 'grid',
        headStyles: { fillColor: [49,46,129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [245,243,255] },
        columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'} },
        didParseCell: function(data) { if (data.section==='body' && data.row.index===cfBody.length-1) { data.cell.styles.fontStyle='bold'; data.cell.styles.fillColor=[241,245,249]; } }
    });

    // Detail Pemasukan
    var y = doc.lastAutoTable.finalY + 15;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setTextColor(49,46,129); doc.text('Detail Pemasukan', 14, y);
    var incHead = [['Order','Pelanggan','Alat','Total','DP','Sisa','Status']];
    var incBody = [];
    for (var i = 0; i < ordersData.length; i++) { var o = ordersData[i]; if (o.status==='Dibatalkan'||!matchesFilter(o.createdDate,f)) continue; var c=getCustomerById(o.customerId),it=getItemById(o.itemId); incBody.push([o.id,c.name,it.name,formatRp(o.total),formatRp(o.dp),formatRp(o.remaining),o.status]); }
    if (incBody.length > 0) { doc.autoTable({ head:incHead, body:incBody, startY:y+5, theme:'grid', headStyles:{fillColor:[5,150,105],textColor:255,fontSize:8}, bodyStyles:{fontSize:8}, columnStyles:{3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}} }); }

    // Detail Pengeluaran
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : y + 20;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setTextColor(49,46,129); doc.text('Detail Pengeluaran', 14, y);
    var expHead = [['ID','Tanggal','Kategori','Deskripsi','Jumlah','Vendor']];
    var expBody = [];
    for (var i = 0; i < pengeluaranData.length; i++) { var e = pengeluaranData[i]; if (!matchesFilter(e.date,f)) continue; expBody.push([e.id,formatDateID(e.date),e.category,e.description,formatRp(e.amount),e.vendor||'-']); }
    if (expBody.length > 0) { doc.autoTable({ head:expHead, body:expBody, startY:y+5, theme:'grid', headStyles:{fillColor:[220,38,38],textColor:255,fontSize:8}, bodyStyles:{fontSize:8}, columnStyles:{4:{halign:'right'}} }); }

    // Footer
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text('Eztafest - Cash Flow - ' + label, 14, 290); doc.text('Halaman ' + p + '/' + pageCount, 180, 290); }

    doc.save('Eztafest_CashFlow_' + label.replace(/ /g,'_') + '.pdf');
    showToast('PDF berhasil didownload');
}