// Initialize map
let map;
let markers = [];
let warehousesData = [];
let currentBounds = null;

// Initialize the map centered on the US
function initMap() {
    map = L.map('map').setView([39.8283, -98.5795], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// Create custom icon for warehouse markers
function getWarehouseIcon(inventoryStatus = 'in stock') {
    let color = '#059669'; // green for in stock
    if (inventoryStatus === 'low stock') {
        color = '#d97706'; // yellow/orange for low stock
    }
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span style="
                color: white;
                font-size: 16px;
                transform: rotate(45deg);
            "></span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

// Clear existing markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Add markers to map
function addMarkers(warehouses) {
    clearMarkers();
    
    if (warehouses.length === 0) return;
    
    const bounds = [];
    
    warehouses.forEach((warehouse, index) => {
        const { latitude, longitude } = warehouse.coordinates;
        bounds.push([latitude, longitude]);
        
        const marker = L.marker([latitude, longitude], {
            icon: getWarehouseIcon(warehouse.inventoryStatus)
        }).addTo(map);
        
        // Determine status color
        const statusColor = warehouse.inventoryStatus === 'low stock' ? '#d97706' : '#059669';
        
        // Create Google Maps link
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        
        // Create popup content
        const popupContent = `
            <div class="popup-content">
                <h3>${warehouse.name}</h3>
                <p>Status: <span style="color: ${statusColor}; font-weight: 600;">${warehouse.inventoryStatus}</span></p>
                <p><a href="${mapsLink}" target="_blank" style="color: #E32A36; text-decoration: none; font-size: 13px; font-weight: 500;" title="Open in Google Maps">📍 Open in Google Maps</a></p>
                <div class="popup-products">
                    <strong>Products (${warehouse.products.length}):</strong>
                    ${warehouse.products.map(product => `
                        <div class="popup-product">• ${product.name}</div>
                    `).join('')}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add click event to highlight warehouse card
        marker.on('click', () => {
            highlightWarehouse(index);
        });
        
        markers.push(marker);
    });
    
    // Fit map to show all markers
    if (bounds.length > 0) {
        currentBounds = bounds;
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Highlight warehouse card and marker
function highlightWarehouse(index) {
    // Remove active class from all cards
    document.querySelectorAll('.warehouse-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    const card = document.querySelector(`[data-warehouse-index="${index}"]`);
    if (card) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Show results screen
function showResults() {
    document.getElementById('searchScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'flex';
}

// Show search screen
function showSearch() {
    document.getElementById('searchScreen').style.display = 'flex';
    document.getElementById('resultsScreen').style.display = 'none';
}

// Display warehouses in the left panel
function displayWarehouses(data) {
    const warehousesList = document.getElementById('warehousesList');
    const noResults = document.getElementById('noResults');
    const summary = document.getElementById('summary');
    
    warehousesList.innerHTML = '';
    
    // Show results screen
    showResults();
    
    if (!data.warehouses || data.warehouses.length === 0) {
        noResults.style.display = 'flex';
        summary.textContent = '';
        // Hide summary container on mobile when no results
        const summaryContainer = summary.closest('.summary-container');
        if (summaryContainer) {
            summaryContainer.style.display = 'none';
        }
        return;
    }
    
    noResults.style.display = 'none';
    summary.textContent = `Found ${data.totalWarehouses} warehouse${data.totalWarehouses !== 1 ? 's' : ''} with ${data.totalProducts} product${data.totalProducts !== 1 ? 's' : ''} in stock`;
    
    // Show summary container when there are results
    const summaryContainer = summary.closest('.summary-container');
    if (summaryContainer) {
        summaryContainer.style.display = 'block';
    }
    
    data.warehouses.forEach((warehouse, index) => {
        const card = document.createElement('div');
        card.className = 'warehouse-card';
        card.setAttribute('data-warehouse-index', index);
        
        // Determine status class
        const statusClass = warehouse.inventoryStatus === 'low stock' ? 'low-stock' : 'in-stock';
        
        // Create Google Maps link
        const { latitude, longitude } = warehouse.coordinates;
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        
        card.innerHTML = `
            <div class="warehouse-header">
                <div class="warehouse-name">${warehouse.name}</div>
                <a href="${mapsLink}" target="_blank" class="maps-link-header" title="Open in Google Maps">📍 Google Maps</a>
            </div>
            <div class="products-list">
                ${warehouse.products.map(product => {
                    let stockClass = 'in-stock';
                    if (product.stockStatus === 'low stock') stockClass = 'low-stock';
                    else if (product.stockStatus === 'out of stock') stockClass = 'out-of-stock';
                    
                    return `
                        <div class="product-item">
                            <div class="product-name">${product.name}</div>
                            <div class="product-details">
                                <span class="product-number">Item #${product.itemNumber}</span>
                                <span class="stock-badge ${stockClass}">
                                    ${product.stockStatus}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add click event to card
        card.addEventListener('click', () => {
            highlightWarehouse(index);
            // Open marker popup
            markers[index].openPopup();
            
            // On mobile, switch to map tab
            if (window.innerWidth <= 1024) {
                const mapTabBtn = document.querySelector('.tab-btn[data-tab="map"]');
                if (mapTabBtn) {
                    mapTabBtn.click();
                }
            }
        });
        
        warehousesList.appendChild(card);
    });
}

// Fetch data from API
async function fetchInventory(username, radius) {
    const apiUrl = `https://eow4gra92oz16n8.m.pipedream.net?radius=${radius}&user=${username}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer kirkland'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching inventory:', error);
        throw error;
    }
}

// Handle form submission
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const radius = document.getElementById('radius').value;
    const button = e.target.querySelector('.search-btn');
    const btnText = button.querySelector('.btn-text');
    const loader = button.querySelector('.loader');
    
    // Show loading state
    button.disabled = true;
    btnText.textContent = 'Searching...';
    loader.style.display = 'block';
    
    try {
        const data = await fetchInventory(username, radius);
        warehousesData = data.warehouses || [];
        
        // Save access code to localStorage after successful login
        localStorage.setItem('accessCode', username);
        
        displayWarehouses(data);
        addMarkers(warehousesData);
    } catch (error) {
        alert('Error fetching inventory. Please try again.');
        console.error(error);
    } finally {
        // Reset button state
        button.disabled = false;
        btnText.textContent = 'Search Warehouses';
        loader.style.display = 'none';
    }
});

// Update slider value display
const radiusSlider = document.getElementById('radius');
const radiusValue = document.getElementById('radiusValue');

radiusSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    radiusValue.textContent = value;
    
    // Update the slider track fill
    const percent = ((value - radiusSlider.min) / (radiusSlider.max - radiusSlider.min)) * 100;
    radiusSlider.style.setProperty('--slider-percent', `${percent}%`);
});

// Set initial slider percent
const initialPercent = ((radiusSlider.value - radiusSlider.min) / (radiusSlider.max - radiusSlider.min)) * 100;
radiusSlider.style.setProperty('--slider-percent', `${initialPercent}%`);

// Back button handler
document.getElementById('backBtn').addEventListener('click', () => {
    showSearch();
});

// Mobile tab switching
function setupMobileTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // Update active state on buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update body class to show/hide panels
            if (tab === 'map') {
                document.body.classList.remove('list-active');
                document.body.classList.add('map-active');
                // Invalidate map size to ensure it renders correctly and refit bounds
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
                        // Refit bounds to show all markers
                        if (currentBounds && currentBounds.length > 0) {
                            map.fitBounds(currentBounds, { padding: [50, 50] });
                        }
                    }
                }, 100);
            } else {
                document.body.classList.remove('map-active');
                document.body.classList.add('list-active');
            }
        });
    });
}

// Initialize map on page load
window.addEventListener('load', () => {
    initMap();
    
    // Setup mobile tabs
    setupMobileTabs();
    
    // Set initial state to list view on mobile
    document.body.classList.add('list-active');
    
    // Load saved access code if available
    const savedAccessCode = localStorage.getItem('accessCode');
    if (savedAccessCode) {
        document.getElementById('username').value = savedAccessCode;
    }
});

