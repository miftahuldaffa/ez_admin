let selectedOrder = null;
lucide.createIcons();
const formatRp = (num) => 'Rp ' + num.toLocaleString('id-ID');

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById('page-title').innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace('-', ' ');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.target === tabId) {
            btn.className = 'tab-btn w-full flex items-center px-6 py-3 bg-indigo-800 border-l-4 border-indigo-400';
        } else {
            btn.className = 'tab-btn w-full flex items-center px-6 py-3 hover:bg-indigo-800 transition';
        }
    });
}

function renderApp() {
    document.getElementById('dash-orders-count').innerText = ordersData.length;
    const availableCount = inventoryData.reduce((acc, item) => acc + item.available, 0);
    document.getElementById('dash-avail-count').innerText = availableCount;

    const invTbody = document.getElementById('inventory-tbody');
    invTbody.innerHTML = inventoryData.map(item => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="p-4 text-sm font-medium text-gray-800">${item.id}</td>
            <td class="p-4 text-sm text-gray-600">${item.name}</td>
            <td class="p-4 text-sm text-gray-600">${item.category}</td>
            <td class="p-4 text-sm text-gray-600">${item.available} / ${item.stock}</td>
            <td class="p-4 text-sm text-gray-600">${formatRp(item.price)}</td>
        </tr>
    `).join('');

    const ordTbody = document.getElementById('orders-tbody');
    ordTbody.innerHTML = ordersData.map((order, index) => {
        const statusColor = order.status === 'Sedang Disewa' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="p-4 text-sm font-medium text-gray-800">${order.id}</td>
            <td class="p-4 text-sm text-gray-600">${order.customer}<br><span class="text-xs text-gray-400">WA: ${order.phone}</span></td>
            <td class="p-4 text-sm text-gray-600">${order.item}</td>
            <td class="p-4 text-sm text-gray-600">${order.startDate} s/d ${order.endDate}</td>
            <td class="p-4 text-sm"><span class="px-2 py-1 rounded-full text-xs ${statusColor}">${order.status}</span></td>
            <td class="p-4 text-sm">
                <button onclick="openModal(${index})" class="flex items-center text-indigo-600 hover:text-indigo-800">
                    <i data-lucide="printer" class="w-4 h-4 mr-1"></i> Cetak
                </button>
            </td>
        </tr>
    `}).join('');
    
    lucide.createIcons();

    const calGrid = document.getElementById('calendar-grid');
    let calHtml = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => 
        `<div class="text-center font-semibold text-gray-500 py-2">${day}</div>`
    ).join('');
    
    calHtml += `<div class="col-span-4"></div>`; 
    
    for(let i = 1; i <= 31; i++) {
        const dateStr = `2026-10-${String(i).padStart(2, '0')}`;
        const activeBookings = ordersData.filter(o => dateStr >= o.startDate && dateStr <= o.endDate);
        
        let bookingsHtml = activeBookings.map((b, idx) => 
            `<div onclick="openModalById('${b.id}')" class="text-xs bg-indigo-100 text-indigo-800 p-1 rounded cursor-pointer mt-1 truncate">${b.item.substring(0, 10)}...</div>`
        ).join('');

        calHtml += `
            <div class="border border-gray-200 rounded p-2 min-h-[80px]">
                <span class="text-sm font-semibold text-gray-700">${i}</span>
                ${bookingsHtml}
            </div>
        `;
    }
    calGrid.innerHTML = calHtml;
}

function openModal(orderIndex) {
    selectedOrder = ordersData[orderIndex];
    populateModal();
}

function openModalById(orderId) {
    selectedOrder = ordersData.find(o => o.id === orderId);
    populateModal();
}

function populateModal() {
    document.getElementById('inv-id').innerText = '#' + selectedOrder.id;
    document.getElementById('inv-name').innerText = selectedOrder.customer;
    document.getElementById('inv-phone').innerText = 'WA: ' + selectedOrder.phone;
    document.getElementById('inv-start').innerText = selectedOrder.startDate;
    document.getElementById('inv-end').innerText = 's/d ' + selectedOrder.endDate;
    document.getElementById('inv-item').innerText = selectedOrder.item;
    document.getElementById('inv-total').innerText = formatRp(selectedOrder.total);
    document.getElementById('inv-grandtotal').innerText = formatRp(selectedOrder.total);
    
    document.getElementById('invoice-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('invoice-modal').classList.add('hidden');
    selectedOrder = null;
}

document.getElementById('btn-wa').addEventListener('click', () => {
    if(!selectedOrder) return;
    const msg = `Halo ${selectedOrder.customer}, ini dari Eztafest.\n\nBerikut rincian pesanan Anda:\nID: ${selectedOrder.id}\nAlat: ${selectedOrder.item}\nTanggal: ${selectedOrder.startDate} s/d ${selectedOrder.endDate}\nTotal Tagihan: ${formatRp(selectedOrder.total)}\n\nMohon segera menyelesaikan pembayaran. Terima kasih!`;
    window.open(`https://wa.me/${selectedOrder.phone}?text=${encodeURIComponent(msg)}`, '_blank');
});

renderApp();