// Initialize map
let map;
let markers = {}; // Changed to object to map warehouse number to marker
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
    } else if (inventoryStatus === 'out of stock') {
        color = '#dc2626'; // red for out of stock
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
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
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
        let statusColor = '#059669';
        if (warehouse.inventoryStatus === 'low stock') statusColor = '#d97706';
        else if (warehouse.inventoryStatus === 'out of stock') statusColor = '#dc2626';
        
        // Create Google Maps link
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        
        const popupContent = `
            <div class="popup-content">
                <h3>${warehouse.name}</h3>
                <p>Status: <span style="color: ${statusColor}; font-weight: 600;">${warehouse.inventoryStatus}</span></p>
                <p><a href="${mapsLink}" target="_blank" style="color: #E32A36; text-decoration: none; font-size: 13px; font-weight: 500;" title="Open in Google Maps">📍 Open in Google Maps</a></p>
                ${warehouse.phone ? `<p style="font-size: 13px; color: #666; margin-top: 8px;">📞 ${warehouse.phone}</p>` : ''}
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
            // Find card by warehouse number instead of index
            const card = document.querySelector(`[data-warehouse-number="${warehouse.warehouseNumber}"]`);
            if (card) {
                document.querySelectorAll('.warehouse-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
        
        markers[warehouse.warehouseNumber] = marker;
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
        return;
    }
    
    // Separate warehouses by stock status
    const inStockWarehouses = data.warehouses.filter(w => w.inventoryStatus === 'in stock' || w.inventoryStatus === 'low stock');
    const outOfStockWarehouses = data.warehouses.filter(w => w.inventoryStatus === 'out of stock');
    
    // Sort both groups by distance
    const sortedInStock = [...inStockWarehouses].sort((a, b) => a.distance - b.distance);
    const sortedOutOfStock = [...outOfStockWarehouses].sort((a, b) => a.distance - b.distance);
    
    // If no in-stock warehouses, show modified "No Stock Available" message
    if (inStockWarehouses.length === 0) {
        noResults.style.display = 'none';
        warehousesList.innerHTML = `
            <div class="no-stock-inline">
                <div class="no-stock-content">
                    <div class="icon">😿</div>
                    <div class="no-stock-text">
                        <h3>No Stock Available</h3>
                        <p>There are no warehouses with inventory in your search area. Try increasing your search radius.</p>
                    </div>
                </div>
            </div>
        `;
        summary.textContent = `Found ${outOfStockWarehouses.length} warehouse${outOfStockWarehouses.length !== 1 ? 's' : ''} (all out of stock)`;
    } else {
        noResults.style.display = 'none';
        summary.textContent = `Found ${inStockWarehouses.length} warehouse${inStockWarehouses.length !== 1 ? 's' : ''} with stock`;
        if (outOfStockWarehouses.length > 0) {
            summary.textContent += ` and ${outOfStockWarehouses.length} out of stock`;
        }
    }
    
    // Combine all warehouses for indexing (in-stock first, then out-of-stock)
    const allSortedWarehouses = [...sortedInStock, ...sortedOutOfStock];
    
    // Display in-stock warehouses
    sortedInStock.forEach((warehouse, idx) => {
        const globalIndex = allSortedWarehouses.indexOf(warehouse);
        const card = createWarehouseCard(warehouse, globalIndex);
        warehousesList.appendChild(card);
    });
    
    // Add divider if there are both in-stock and out-of-stock warehouses
    if (sortedInStock.length > 0 && sortedOutOfStock.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'warehouse-divider';
        divider.innerHTML = '<span>Out of Stock Locations</span>';
        warehousesList.appendChild(divider);
    }
    
    // Display out-of-stock warehouses
    sortedOutOfStock.forEach((warehouse, idx) => {
        const globalIndex = allSortedWarehouses.indexOf(warehouse);
        const card = createWarehouseCard(warehouse, globalIndex);
        card.classList.add('out-of-stock-card');
        warehousesList.appendChild(card);
    });
}

// Helper function to format date for restockIQ widget
function formatRestockDate(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    const hour = date.getHours();
    
    let timeOfDay;
    if (hour < 12) {
        timeOfDay = 'MORNING';
    } else if (hour < 17) {
        timeOfDay = 'MID DAY';
    } else {
        timeOfDay = 'EVENING';
    }
    
    return { month, day, timeOfDay };
}

// Helper function to parse duration string to hours
function parseDurationToHours(duration) {
    if (!duration) return 0;
    
    let totalHours = 0;
    const daysMatch = duration.match(/(\d+)\s+day/);
    const hoursMatch = duration.match(/(\d+)\s+hour/);
    
    if (daysMatch) totalHours += parseInt(daysMatch[1]) * 24;
    if (hoursMatch) totalHours += parseInt(hoursMatch[1]);
    
    return totalHours;
}

// Helper function to calculate current time in stock
function calculateTimeInStock(restockDate) {
    const restock = new Date(restockDate);
    const now = new Date();
    const diffMs = now - restock;
    
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
}

// Helper function to calculate competitiveness level
function getCompetitivenessLevel(warehouse) {
    if (!warehouse.historic || !warehouse.historic.latestRestock) {
        return null;
    }
    
    let totalHours = 0;
    
    if (warehouse.inventoryStatus === 'out of stock') {
        // For out of stock items, use the historical duration
        const duration = warehouse.historic.durationInStock;
        if (!duration) return null;
        
        totalHours = parseDurationToHours(duration);
        
        if (totalHours < 24) return 'highly-competitive';
        if (totalHours < 48) return 'competitive';
        return 'less-competitive';
    } else {
        // For in-stock items, use current time in stock
        const restockDate = new Date(warehouse.historic.latestRestock);
        const now = new Date();
        totalHours = (now - restockDate) / (1000 * 60 * 60);
        
        if (totalHours < 36) return 'competitive';
        return 'less-competitive';
    }
}

// Helper function to create restockIQ widget
function createRestockIQWidget(warehouse) {
    if (!warehouse.historic || !warehouse.historic.latestRestock) {
        return '';
    }
    
    const competitiveness = getCompetitivenessLevel(warehouse);
    if (!competitiveness) return '';
    
    const { month, day, timeOfDay } = formatRestockDate(warehouse.historic.latestRestock);
    const isOutOfStock = warehouse.inventoryStatus === 'out of stock';
    
    let badgeClass = '';
    let badgeText = '';
    let rightSideContent = '';
    
    if (competitiveness === 'highly-competitive') {
        badgeClass = 'badge-highly-competitive';
        badgeText = 'HIGHLY COMPETITIVE';
    } else if (competitiveness === 'competitive') {
        badgeClass = 'badge-competitive';
        badgeText = 'COMPETITIVE';
    } else {
        badgeClass = 'badge-less-competitive';
        badgeText = 'LESS COMPETITIVE';
    }
    
    if (isOutOfStock && warehouse.historic.becameOutOfStock) {
        const outDate = formatRestockDate(warehouse.historic.becameOutOfStock);
        rightSideContent = `
            <div class="restock-section out-section">
                <div class="restock-label">OUT OF STOCK</div>
                <div class="restock-circle"></div>
                <div class="restock-date">${outDate.month} ${outDate.day}</div>
                <div class="restock-time">${outDate.timeOfDay}</div>
            </div>
        `;
    } else {
        // In stock - show current time in stock or historical duration
        let duration;
        let label;
        
        if (warehouse.historic.durationInStock) {
            // Has historical data from a previous out-of-stock cycle
            duration = warehouse.historic.durationInStock.replace(' and ', ',').toUpperCase();
            label = 'STOCK USUALLY LASTS FOR';
        } else {
            // Currently in stock, calculate how long it's been in stock
            duration = calculateTimeInStock(warehouse.historic.latestRestock).toUpperCase();
            label = 'IN STOCK FOR';
        }
        
        // Format duration with line break (e.g., "3 DAYS, 10 HOURS" -> "3 DAYS<br>10 HOURS")
        const formattedDuration = duration.replace(', ', '<br>');
        
        rightSideContent = `
            <div class="restock-section duration-section">
                <div class="restock-label">${label}</div>
                <div class="restock-duration">${formattedDuration}</div>
            </div>
        `;
    }
    
    // Calculate duration for out of stock items
    let durationDisplay = '';
    if (isOutOfStock && warehouse.historic.durationInStock) {
        durationDisplay = `
            <div class="restock-timeline-duration">
                <div class="timeline-label">IN STOCK FOR</div>
                <div class="timeline-value">${warehouse.historic.durationInStock.replace(' and ', ', ').toUpperCase()}</div>
            </div>
        `;
    }
    
    return `
        <div class="restock-iq-widget ${isOutOfStock ? 'out-of-stock-widget' : 'in-stock-widget'}">
            <div class="restock-header">
                <div class="restock-brand">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                    </svg>
                    <span>restockIQ</span>
                </div>
                <div class="restock-badge ${badgeClass}">${badgeText}</div>
            </div>
            <div class="restock-content">
                <div class="restock-section">
                    <div class="restock-label">RESTOCKED</div>
                    <div class="restock-circle"></div>
                    <div class="restock-date">${month} ${day}</div>
                    <div class="restock-time">${timeOfDay}</div>
                </div>
                ${durationDisplay}
                ${rightSideContent}
            </div>
        </div>
    `;
}

// Helper function to create warehouse card
function createWarehouseCard(warehouse, index) {
    const card = document.createElement('div');
    card.className = 'warehouse-card';
    card.setAttribute('data-warehouse-index', index);
    card.setAttribute('data-warehouse-number', warehouse.warehouseNumber);
    
    // Create Google Maps link
    const { latitude, longitude } = warehouse.coordinates;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    // Format phone number for tel: link
    const phoneLink = warehouse.phone ? `tel:${warehouse.phone.replace(/\D/g, '')}` : '#';
    
    // Create restockIQ widget
    const restockWidget = createRestockIQWidget(warehouse);
    
    card.innerHTML = `
        <div class="warehouse-header">
            <div class="warehouse-info">
                <div class="warehouse-name">${warehouse.name}</div>
                <div class="warehouse-distance-label">${warehouse.distance.toFixed(1)} mi</div>
            </div>
            <div class="warehouse-actions">
                <a href="${mapsLink}" target="_blank" class="icon-btn" title="Open in Google Maps">
                    <i class="fas fa-directions"></i>
                </a>
                <a href="${phoneLink}" class="icon-btn" title="Call ${warehouse.phone || 'Warehouse'}">
                    <i class="fas fa-phone"></i>
                </a>
            </div>
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
        ${restockWidget}
    `;
    
    // Add click event to card
    card.addEventListener('click', () => {
        highlightWarehouse(index);
        // Open marker popup (only if marker exists for in-stock warehouses)
        const marker = markers[warehouse.warehouseNumber];
        if (marker) {
            marker.openPopup();
            
            // On mobile, switch to map tab
            if (window.innerWidth <= 1024) {
                const mapTabBtn = document.querySelector('.tab-btn[data-tab="map"]');
                if (mapTabBtn) {
                    mapTabBtn.click();
                }
            }
        }
    });
    
    return card;
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
        
        // Only show in-stock warehouses on map
        const inStockWarehouses = warehousesData.filter(w => w.inventoryStatus === 'in stock' || w.inventoryStatus === 'low stock');
        const sortedForMap = inStockWarehouses.sort((a, b) => a.distance - b.distance);
        
        addMarkers(sortedForMap);
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

// Generate KML file from warehouses data
function generateKML(warehouses) {
    if (!warehouses || warehouses.length === 0) {
        return null;
    }
    
    // Filter to only include in-stock warehouses
    const inStockWarehouses = warehouses.filter(w => w.inventoryStatus === 'in stock' || w.inventoryStatus === 'low stock');
    
    if (inStockWarehouses.length === 0) {
        return null;
    }
    
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Costco Warehouses Inventory</name>
    <description>Available inventory locations</description>
    <Style id="inStockIcon">
      <IconStyle>
        <color>ff059669</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="lowStockIcon">
      <IconStyle>
        <color>ff06d997</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;
    
    let placemarks = '';
    inStockWarehouses.forEach(warehouse => {
        const { latitude, longitude } = warehouse.coordinates;
        let styleId = 'inStockIcon';
        if (warehouse.inventoryStatus === 'low stock') styleId = 'lowStockIcon';
        
        let description = `<![CDATA[
            <p><strong>Status:</strong> ${warehouse.inventoryStatus}</p>
            ${warehouse.phone ? `<p><strong>Phone:</strong> ${warehouse.phone}</p>` : ''}
            <p><strong>Products (${warehouse.products.length}):</strong></p>
            <ul>
                ${warehouse.products.map(product => 
                    `<li>${product.name} - Item #${product.itemNumber} (${product.stockStatus})</li>`
                ).join('')}
            </ul>
        ]]>`;
        
        placemarks += `
    <Placemark>
      <name>${warehouse.name}</name>
      <description>${description}</description>
      <styleUrl>#${styleId}</styleUrl>
      <Point>
        <coordinates>${longitude},${latitude},0</coordinates>
      </Point>
    </Placemark>`;
    });
    
    const kmlFooter = `
  </Document>
</kml>`;
    
    return kmlHeader + placemarks + kmlFooter;
}

// Download KML file
function downloadKML() {
    if (!warehousesData || warehousesData.length === 0) {
        alert('No warehouse data available to export.');
        return;
    }
    
    const kmlContent = generateKML(warehousesData);
    if (!kmlContent) {
        alert('Failed to generate KML file.');
        return;
    }
    
    // Create blob and download
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `costco-inventory-${new Date().toISOString().split('T')[0]}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    
    // Add download KML button handler
    const downloadBtn = document.getElementById('downloadKmlBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadKML();
        });
    }
});

