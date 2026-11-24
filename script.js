const API_URL = "https://www.cheapshark.com/api/1.0/deals?pageSize=60&onSale=1";
const STORAGE_KEY = "savedGameDeals";
const stores = { "1": "Steam", "7": "GOG", "11": "Humble", "25": "Epic Games" };

let allDeals = [];
let wishlist = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let showWishlistOnly = false;

const searchInput = document.getElementById("searchInput");
const priceSelect = document.getElementById("priceSelect");
const sortSelect = document.getElementById("sortSelect");
const allTab = document.getElementById("allTab");
const favTab = document.getElementById("favTab");
const resultSummary = document.getElementById("resultSummary");
const statusBox = document.getElementById("statusBox");
const dealsGrid = document.getElementById("dealsGrid");
const modalOverlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");

async function fetchDeals() {
  setStatus("Loading game deals...", "Fetching live discounts...", false);
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allDeals = await res.json();
    renderDeals();
  } catch (err) {
    setStatus("Could not load deals", `Error: ${err.message}`, true);
  }
}

function setStatus(title, msg, isError, showClear = false) {
  statusBox.className = isError ? "status error" : "status";
  statusBox.innerHTML = `
    <h2>${title}</h2>
    <p>${msg}</p>
    ${isError ? `<button class="btn" onclick="fetchDeals()">Try Again</button>` : ""}
    ${showClear ? `<button class="btn" onclick="clearFilters()">Clear Filters</button>` : ""}
  `;
}

function renderDeals() {
  const query = searchInput.value.trim().toLowerCase();
  const maxPrice = priceSelect.value;
  const sortBy = sortSelect.value;
  const list = showWishlistOnly ? wishlist : allDeals;

  const filtered = list
    .filter((d) => d.title.toLowerCase().includes(query) && (maxPrice === "all" || Number(d.salePrice) <= Number(maxPrice)))
    .sort((a, b) => {
      if (sortBy === "savings-desc") return b.savings - a.savings;
      if (sortBy === "price-asc") return a.salePrice - b.salePrice;
      if (sortBy === "price-desc") return b.salePrice - a.salePrice;
      return b.steamRatingPercent - a.steamRatingPercent;
    });

  favTab.textContent = `Wishlist (${wishlist.length})`;
  resultSummary.textContent = `Showing ${filtered.length} deals`;

  if (filtered.length === 0) {
    dealsGrid.innerHTML = "";
    setStatus(
      showWishlistOnly ? "Your wishlist is empty" : "No deals found",
      showWishlistOnly ? "Save a deal to see it here." : "Try a different title or price.",
      false,
      !showWishlistOnly
    );
    return;
  }

  statusBox.className = "status hidden";
  dealsGrid.innerHTML = filtered
    .map((d) => {
      const saved = wishlist.some((item) => item.dealID === d.dealID);
      return `
        <div class="card">
          <div class="card-clickable" onclick="openModal('${d.dealID}')">
            <img class="thumb" src="${d.thumb}" alt="${d.title}" loading="lazy" />
            <div class="card-info">
              <span class="discount-tag">-${Math.round(d.savings)}% OFF</span>
              <h3>${d.title}</h3>
              <div class="fact-row"><span class="fact-label">Price</span><span class="fact-value"><span class="old-price">$${d.normalPrice}</span>$${d.salePrice}</span></div>
              <div class="fact-row"><span class="fact-label">Store</span><span class="fact-value">${stores[d.storeID] || "PC Store"}</span></div>
              <div class="fact-row"><span class="fact-label">Rating</span><span class="fact-value">${d.steamRatingPercent > 0 ? d.steamRatingPercent + "%" : "N/A"}</span></div>
            </div>
          </div>
          <button class="fav-btn ${saved ? "saved" : ""}" onclick="toggleWishlist('${d.dealID}')">${saved ? "Saved" : "Save"}</button>
        </div>
      `;
    })
    .join("");
}

function toggleWishlist(dealID) {
  const exists = wishlist.some((item) => item.dealID === dealID);
  wishlist = exists
    ? wishlist.filter((item) => item.dealID !== dealID)
    : [...wishlist, allDeals.find((item) => item.dealID === dealID)];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  renderDeals();
}

function openModal(dealID) {
  const d = [...allDeals, ...wishlist].find((item) => item.dealID === dealID);
  if (!d) return;

  modalContent.innerHTML = `
    <img class="modal-thumb" src="${d.thumb}" alt="${d.title}" />
    <h2>${d.title}</h2>
    <div class="detail-row"><span class="fact-label">Store</span><span class="fact-value">${stores[d.storeID] || "PC Store"}</span></div>
    <div class="detail-row"><span class="fact-label">Sale Price</span><span class="fact-value">$${d.salePrice} (was $${d.normalPrice})</span></div>
    <div class="detail-row"><span class="fact-label">Discount</span><span class="fact-value">-${Math.round(d.savings)}% OFF</span></div>
    <div class="detail-row"><span class="fact-label">Steam Reviews</span><span class="fact-value">${d.steamRatingPercent > 0 ? `${d.steamRatingText} (${d.steamRatingPercent}%)` : "N/A"}</span></div>
    <a class="btn" style="width:100%;margin-top:16px" href="https://www.cheapshark.com/redirect?dealID=${d.dealID}" target="_blank">Open Store Deal</a>
  `;
  modalOverlay.classList.remove("hidden");
}

function clearFilters() {
  searchInput.value = "";
  priceSelect.value = "all";
  renderDeals();
}

searchInput.addEventListener("input", renderDeals);
priceSelect.addEventListener("change", renderDeals);
sortSelect.addEventListener("change", renderDeals);
allTab.addEventListener("click", () => { showWishlistOnly = false; allTab.classList.add("active"); favTab.classList.remove("active"); renderDeals(); });
favTab.addEventListener("click", () => { showWishlistOnly = true; favTab.classList.add("active"); allTab.classList.remove("active"); renderDeals(); });
document.getElementById("closeModalBtn").addEventListener("click", () => modalOverlay.classList.add("hidden"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.add("hidden"); });

fetchDeals();