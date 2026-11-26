const SHOP_WHATSAPP = "8801868963749";
const SUPABASE_URL = "https://hmhnmbrlktvgxqqcokwe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1MEJRrIvv1mB1MCXtwCWLA_fCmREPnk";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const categories = [
  "All Products", "Earbuds", "Neckband", "Headphones", "Earphones",
  "Chargers", "Cables", "Adapter", "Power Banks", "Smart Watch",
  "Microphone", "Trimmer", "Speakers"
];

let allProducts = [];
let selectedCategory = "All Products";
let currentSession = null;
let editingProduct = null;
let currentImages = [];
let currentIndex = 0;
let dmItem = null;
let dmImages = [];
let dmIdx = 0;

const $ = (id) => document.getElementById(id);
const activeCountEl = $("activeCount"), todayCountEl = $("todayCount");
const customerView = $("customerView"), adminPanel = $("adminPanel");
const grid = $("productGrid"), statusMsg = $("statusMsg"), searchInput = $("searchInput");
const catToggle = $("catToggle"), catToggleText = $("catToggleText"), catArrow = $("catArrow"), catMenu = $("catMenu");
const openMenuBtn = $("openMenuBtn"), quickMenuModal = $("quickMenuModal"), qmClose = $("qmClose");
const settingsPrivacyBtn = $("settingsPrivacyBtn"), spArrow = $("spArrow"), privacySubMenu = $("privacySubMenu"), adminLoginMenuBtn = $("adminLoginMenuBtn");
const loginModal = $("loginModal"), loginEmail = $("loginEmail"), loginPass = $("loginPass"), loginErr = $("loginErr"), loginSubmitBtn = $("loginSubmitBtn"), loginCancelBtn = $("loginCancelBtn");
const backToShopBtn = $("backToShopBtn"), logoutBtn = $("logoutBtn"), formTitle = $("formTitle");
const pCat = $("pCat"), pName = $("pName"), pPrice = $("pPrice"), pDetails = $("pDetails"), pFiles = $("pFiles"), photoNote = $("photoNote");
const saveProductBtn = $("saveProductBtn"), cancelEditBtn = $("cancelEditBtn"), adminStatus = $("adminStatus");
const adminTotalCount = $("adminTotalCount"), adminCatFilter = $("adminCatFilter"), adminSearchInput = $("adminSearchInput"), adminProductList = $("adminProductList");
const detailsModal = $("detailsModal"), dmCat = $("dmCat"), dmClose = $("dmClose"), dmCloseBtn = $("dmCloseBtn");
const dmImg = $("dmImg"), dmImgNav = $("dmImgNav"), dmPrev = $("dmPrev"), dmNext = $("dmNext"), dmCounter = $("dmCounter");
const dmTitle = $("dmTitle"), dmPrice = $("dmPrice"), dmText = $("dmText"), dmOrderWrap = $("dmOrderWrap");
const lightbox = $("lightbox"), lbImg = $("lbImg"), lbTitle = $("lbTitle"), lbPrice = $("lbPrice"), lbCounter = $("lbCounter"), lbClose = $("lbClose"), lbImgArea = $("lbImgArea"), prevBtn = $("prevBtn"), nextBtn = $("nextBtn");

function getTodayBD() {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch (e) {
    return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
  }
}

async function trackTodayVisits() {
  const todayBD = getTodayBD();
  const storageKey = "adib_visit_bd_date";
  try {
    if (localStorage.getItem(storageKey) !== todayBD) {
      const { data, error } = await sb.rpc("increment_daily_visit");
      if (!error && typeof data === "number") {
        localStorage.setItem(storageKey, todayBD);
        todayCountEl.textContent = data;
        return;
      }
    }
    const { data: rowData } = await sb.from("daily_visits").select("visit_count").eq("visit_date", todayBD).maybeSingle();
    if (rowData && typeof rowData.visit_count === "number") todayCountEl.textContent = rowData.visit_count;
  } catch (e) {}
}

function trackActiveVisitors() {
  try {
    let visitorKey = sessionStorage.getItem("adib_live_vid");
    if (!visitorKey) {
      visitorKey = "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem("adib_live_vid", visitorKey);
    }
    const channel = sb.channel("adib-live-visitors", { config: { presence: { key: visitorKey } } });
    channel.on("presence", { event: "sync" }, function () {
      const count = Object.keys(channel.presenceState()).length;
      activeCountEl.textContent = count > 0 ? count : 1;
    });
    channel.subscribe(async function (status) {
      if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() });
    });
  } catch (e) { activeCountEl.textContent = "1"; }
}

function normalizeCat(str) {
  return (str || "").toLowerCase().replace(/\s+/g, "").replace(/neckbend/g, "neckband").replace(/s$/, "");
}

function getImages(item) {
  return Array.isArray(item.imgs) && item.imgs.length > 0 ? item.imgs : ["https://placehold.co/300x300?text=No+Image"];
}

function createOrderElement(item) {
  if (item.sold_out) {
    const soldBtn = document.createElement("span");
    soldBtn.className = "link-btn sold-btn";
    soldBtn.textContent = "Sold Out";
    return soldBtn;
  }
  const waText = encodeURIComponent("আসসালামুআলাইকুম, আমি এই প্রোডাক্টটি অর্ডার করতে চাই:\nপ্রোডাক্ট: " + item.name + "\nদাম: " + item.price);
  const btn = document.createElement("a");
  btn.className = "link-btn";
  btn.href = "https://wa.me/" + SHOP_WHATSAPP + "?text=" + waText;
  btn.textContent = "Order Now";
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  return btn;
}

function renderCategories() {
  catMenu.innerHTML = "";
  categories.forEach(function (cat) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-item" + (cat === selectedCategory ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", function () {
      selectedCategory = cat;
      catMenu.classList.remove("open");
      catArrow.textContent = "▾";
      catToggleText.textContent = cat === "All Products" ? "☰ Categories / ক্যাটাগরি দেখুন" : "☰ Category: " + cat;
      renderCategories();
      filterAndRender();
    });
    catMenu.appendChild(btn);
  });
}

function renderAdminCatFilter() {
  const prevVal = adminCatFilter.value || "All Products";
  adminCatFilter.innerHTML = "";
  categories.forEach(function (cat) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat === "All Products" ? "সব ক্যাটাগরি (All Products)" : cat;
    adminCatFilter.appendChild(opt);
  });
  adminCatFilter.value = prevVal;
}

catToggle.addEventListener("click", function () {
  const isOpen = catMenu.classList.toggle("open");
  catArrow.textContent = isOpen ? "▴" : "▾";
});

function renderProducts(list) {
  grid.innerHTML = "";
  if (allProducts.length === 0) {
    statusMsg.style.display = "block";
    statusMsg.textContent = "এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।";
    return;
  }
  if (list.length === 0) {
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "";
    const msg = document.createElement("div");
    msg.textContent = "এই ক্যাটাগরি বা নামে কোনো প্রোডাক্ট পাওয়া যায়নি।";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "reset-btn";
    reset.textContent = "সব প্রোডাক্ট দেখুন / Show All";
    reset.addEventListener("click", function () {
      selectedCategory = "All Products";
      searchInput.value = "";
      catToggleText.textContent = "☰ Categories / ক্যাটাগরি দেখুন";
      renderCategories();
      filterAndRender();
    });
    statusMsg.appendChild(msg);
    statusMsg.appendChild(reset);
    return;
  }
  statusMsg.style.display = "none";

  list.forEach(function (item) {
    const imgs = getImages(item);
    const box = document.createElement("div");
    box.className = "box";
    const topWrap = document.createElement("div");
    const imgWrap = document.createElement("div");
    imgWrap.className = "img-wrap" + (item.sold_out ? " is-sold" : "");
    imgWrap.addEventListener("click", function () { openLightbox(item, 0); });

    const img = document.createElement("img");
    img.src = imgs[0];
    img.alt = item.name;
    img.loading = "lazy";
    imgWrap.appendChild(img);

    if (item.sold_out) {
      const soldBadge = document.createElement("span");
      soldBadge.className = "sold-badge";
      soldBadge.textContent = "SOLD OUT";
      imgWrap.appendChild(soldBadge);
    }
    if (imgs.length > 1) {
      const badge = document.createElement("span");
      badge.className = "multi-badge";
      badge.textContent = "📷 " + imgs.length;
      imgWrap.appendChild(badge);
    }

    const title = document.createElement("h2");
    title.textContent = item.name;
    topWrap.appendChild(imgWrap);
    topWrap.appendChild(title);

    const bottomWrap = document.createElement("div");
    const price = document.createElement("p");
    price.className = "price" + (item.sold_out ? " sold-price" : "");
    price.textContent = item.price;
    bottomWrap.appendChild(price);

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "details-link";
    detailsBtn.textContent = "Full Details";
    detailsBtn.addEventListener("click", function () { openDetailsModal(item); });
    bottomWrap.appendChild(detailsBtn);

    const br = document.createElement("div");
    br.appendChild(createOrderElement(item));
    bottomWrap.appendChild(br);

    box.appendChild(topWrap);
    box.appendChild(bottomWrap);
    grid.appendChild(box);
  });
}

function filterAndRender() {
  const query = searchInput.value.trim().toLowerCase();
  const targetCat = normalizeCat(selectedCategory);
  const filtered = allProducts.filter(function (item) {
    const matchesCat = selectedCategory === "All Products" || normalizeCat(item.cat) === targetCat;
    const matchesSearch = (item.name || "").toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });
  renderProducts(filtered);
}
searchInput.addEventListener("input", filterAndRender);

function updateDetailsImg() {
  dmImg.src = dmImages[dmIdx];
  dmCounter.textContent = (dmIdx + 1) + " / " + dmImages.length;
  dmImgNav.style.display = dmImages.length > 1 ? "flex" : "none";
}

function openDetailsModal(item) {
  dmItem = item;
  dmImages = getImages(item);
  dmIdx = 0;
  dmCat.textContent = item.cat || "Gadget";
  dmTitle.textContent = item.name + (item.sold_out ? " (SOLD OUT)" : "");
  dmPrice.textContent = item.price;
  dmPrice.style.color = item.sold_out ? "#dc2626" : "green";
  const cleanDetails = (item.details || "").trim();
  dmText.textContent = cleanDetails || "এই প্রোডাক্টটির আরও বিস্তারিত জানতে নিচের Order Now বাটনে চাপ দিয়ে সরাসরি মেসেজ করুন।";
  dmOrderWrap.innerHTML = "";
  dmOrderWrap.appendChild(createOrderElement(item));
  updateDetailsImg();
  detailsModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDetailsModal() {
  detailsModal.classList.remove("open");
  if (!lightbox.classList.contains("open")) document.body.style.overflow = "";
}

dmClose.addEventListener("click", closeDetailsModal);
dmCloseBtn.addEventListener("click", closeDetailsModal);
detailsModal.addEventListener("click", function (e) { if (e.target === detailsModal) closeDetailsModal(); });
dmPrev.addEventListener("click", function () { dmIdx = (dmIdx - 1 + dmImages.length) % dmImages.length; updateDetailsImg(); });
dmNext.addEventListener("click", function () { dmIdx = (dmIdx + 1) % dmImages.length; updateDetailsImg(); });
dmImg.addEventListener("click", function () { if (dmItem) openLightbox(dmItem, dmIdx); });

function updateLightboxImage() {
  lbImg.src = currentImages[currentIndex];
  lbCounter.textContent = (currentIndex + 1) + " / " + currentImages.length;
  prevBtn.style.display = currentImages.length > 1 ? "inline-block" : "none";
  nextBtn.style.display = currentImages.length > 1 ? "inline-block" : "none";
}

function openLightbox(item, startIndex) {
  currentImages = getImages(item);
  currentIndex = startIndex || 0;
  lbTitle.textContent = item.name + (item.sold_out ? " (SOLD OUT)" : "");
  lbPrice.textContent = item.price;
  updateLightboxImage();
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  if (!detailsModal.classList.contains("open")) document.body.style.overflow = "";
}

function showPrev() { currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length; updateLightboxImage(); }
function showNext() { currentIndex = (currentIndex + 1) % currentImages.length; updateLightboxImage(); }
lbClose.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", showPrev);
nextBtn.addEventListener("click", showNext);
lbImgArea.addEventListener("click", function (e) { if (e.target === lbImgArea) closeLightbox(); });

let touchStartX = 0;
lbImgArea.addEventListener("touchstart", function (e) { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
lbImgArea.addEventListener("touchend", function (e) {
  if (currentImages.length <= 1) return;
  const diff = e.changedTouches[0].screenX - touchStartX;
  if (diff > 40) showPrev(); else if (diff < -40) showNext();
}, { passive: true });

document.addEventListener("keydown", function (e) {
  if (lightbox.classList.contains("open")) {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft" && currentImages.length > 1) showPrev();
    if (e.key === "ArrowRight" && currentImages.length > 1) showNext();
  } else if (detailsModal.classList.contains("open") && e.key === "Escape") closeDetailsModal();
});

async function loadProducts() {
  const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    statusMsg.style.display = "block";
    statusMsg.textContent = "ডাটা লোড সমস্যা: " + error.message;
    return;
  }
  allProducts = data || [];
  filterAndRender();
  renderAdminList();
}

function updateAuthUI() {
  adminLoginMenuBtn.textContent = currentSession ? "⚙️ Admin Panel খুলুন" : "🔒 Admin & Login";
}

function closeQuickMenu() {
  quickMenuModal.classList.remove("open");
  privacySubMenu.style.display = "none";
  spArrow.textContent = "▾";
}

openMenuBtn.addEventListener("click", function () {
  privacySubMenu.style.display = "none";
  spArrow.textContent = "▾";
  quickMenuModal.classList.add("open");
});
qmClose.addEventListener("click", closeQuickMenu);
quickMenuModal.addEventListener("click", function (e) { if (e.target === quickMenuModal) closeQuickMenu(); });
settingsPrivacyBtn.addEventListener("click", function () {
  const isShown = privacySubMenu.style.display === "block";
  privacySubMenu.style.display = isShown ? "none" : "block";
  spArrow.textContent = isShown ? "▾" : "▴";
});
adminLoginMenuBtn.addEventListener("click", function () {
  closeQuickMenu();
  if (currentSession) showAdminPanel();
  else { loginErr.style.display = "none"; loginModal.classList.add("open"); }
});

function showAdminPanel() { customerView.style.display = "none"; adminPanel.style.display = "block"; window.scrollTo(0, 0); renderAdminList(); }
function showCustomerView() { adminPanel.style.display = "none"; customerView.style.display = "block"; window.scrollTo(0, 0); }
loginCancelBtn.addEventListener("click", function () { loginModal.classList.remove("open"); });

loginSubmitBtn.addEventListener("click", async function () {
  const email = loginEmail.value.trim(), password = loginPass.value;
  loginErr.style.display = "none";
  if (!email || !password) { loginErr.textContent = "ইমেইল এবং পাসওয়ার্ড দুটোই দিন।"; loginErr.style.display = "block"; return; }
  loginSubmitBtn.disabled = true; loginSubmitBtn.textContent = "চেক করা হচ্ছে...";
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  loginSubmitBtn.disabled = false; loginSubmitBtn.textContent = "Login / লগইন";
  if (error || !data.session) { loginErr.textContent = "ভুল ইমেইল বা পাসওয়ার্ড! এটি শুধুমাত্র Owner ও Admin-দের জন্য।"; loginErr.style.display = "block"; return; }
  currentSession = data.session; loginPass.value = ""; loginModal.classList.remove("open");
  updateAuthUI(); showAdminPanel();
});

backToShopBtn.addEventListener("click", showCustomerView);
logoutBtn.addEventListener("click", async function () {
  await sb.auth.signOut(); currentSession = null; resetAdminForm(); updateAuthUI(); showCustomerView();
});

function compressImage(file) {
  return new Promise(function (resolve) {
    const imgUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = function () {
      const maxSize = 900;
      let width = image.width, height = image.height;
      if (width > height && width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
      else if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imgUrl);
      canvas.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", 0.8);
    };
    image.onerror = function () { URL.revokeObjectURL(imgUrl); resolve(file); };
    image.src = imgUrl;
  });
}

async function uploadSelectedFiles(files) {
  const uploadedUrls = [];
  for (let i = 0; i < files.length; i++) {
    adminStatus.textContent = "ছবি ছোট করে আপলোড হচ্ছে (" + (i + 1) + "/" + files.length + ")...";
    const compressedBlob = await compressImage(files[i]);
    const fileName = Date.now() + "_" + i + "_" + Math.random().toString(36).slice(2, 7) + ".jpg";
    const { error: uploadError } = await sb.storage.from("product-images").upload(fileName, compressedBlob, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    const { data: urlData } = sb.storage.from("product-images").getPublicUrl(fileName);
    uploadedUrls.push(urlData.publicUrl);
  }
  return uploadedUrls;
}

function resetAdminForm() {
  editingProduct = null;
  formTitle.textContent = "➕ নতুন প্রোডাক্ট যোগ করুন";
  pCat.value = "Earbuds"; pName.value = ""; pPrice.value = ""; pDetails.value = ""; pFiles.value = "";
  photoNote.textContent = "গ্যালারি থেকে একসাথে একাধিক ছবিও সিলেক্ট করতে পারবেন। সব প্রোডাক্টে অটোমেটিক আপনার WhatsApp (01868963749) Order Now বাটন যুক্ত হয়ে যাবে।";
  saveProductBtn.textContent = "💾 Save / আপলোড করুন";
  cancelEditBtn.style.display = "none";
}

cancelEditBtn.addEventListener("click", function () { resetAdminForm(); adminStatus.textContent = ""; });

saveProductBtn.addEventListener("click", async function () {
  const cat = pCat.value, name = pName.value.trim(), details = pDetails.value.trim(), files = pFiles.files;
  let price = pPrice.value.trim();
  if (!name || !price) { adminStatus.textContent = "❌ প্রোডাক্টের নাম এবং দাম অবশ্যই লিখুন!"; return; }
  if (!price.includes("৳")) price = "৳ " + price;
  if (!editingProduct && files.length === 0) { adminStatus.textContent = "❌ অন্তত ১টি প্রোডাক্টের ছবি সিলেক্ট করুন!"; return; }

  saveProductBtn.disabled = true; adminStatus.textContent = "অপেক্ষা করুন, সেভ হচ্ছে...";
  try {
    let finalImgs = editingProduct ? getImages(editingProduct) : [];
    if (files.length > 0) {
      const newUrls = await uploadSelectedFiles(files);
      if (editingProduct) await deleteStorageImages(editingProduct.imgs);
      finalImgs = newUrls;
    }
    if (editingProduct) {
      const { error } = await sb.from("products").update({ cat, name, price, details, imgs: finalImgs, link: "#" }).eq("id", editingProduct.id);
      if (error) throw error;
      adminStatus.textContent = "✅ প্রোডাক্ট আপডেট হয়ে গেছে!";
    } else {
      const { error } = await sb.from("products").insert([{ cat, name, price, details, imgs: finalImgs, sold_out: false, link: "#" }]);
      if (error) throw error;
      adminStatus.textContent = "✅ নতুন প্রোডাক্ট ওয়েবসাইটে যোগ হয়ে গেছে!";
    }
    resetAdminForm();
    await loadProducts();
  } catch (err) {
    adminStatus.textContent = "❌ সমস্যা হয়েছে: " + (err.message || "আবার চেষ্টা করুন");
  } finally {
    saveProductBtn.disabled = false;
  }
});

async function deleteStorageImages(
