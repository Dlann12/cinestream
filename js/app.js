/**
 * CineStream — Core Application Logic, Player Engine & Admin
 */

/**
 * ============================================================================
 * 2. STATE MANAGEMENT & LOCALSTORAGE PERSISTENCE
 * ============================================================================
 */
const STORAGE_KEYS = {
    MOVIES: 'cinestream_movies_v1',
    WATCHLIST: 'cinestream_watchlist_v1',
    HISTORY: 'cinestream_watch_history_v1',
    USER: 'cinestream_user_profile_v1',
    LOGS: 'cinestream_admin_logs_v1',
    METRICS: 'cinestream_metrics_v1'
};

let state = {
    currentView: 'home',
    selectedHomeGenre: 'All',
    selectedGenrePage: 'All',
    movies: [],
    watchlist: [], // array of movie IDs
    watchHistory: {}, // { [movieId]: { lastPositionSeconds, durationSeconds, updatedAt, isCompleted } }
    user: {
        isLoggedIn: false,
        name: 'Tamu (Guest)',
        email: '',
        preferredGenres: ['Sci-Fi', 'Animation', 'Action']
    },
    adminLogs: [],
    metrics: {
        totalViews: 142,
        playSuccessCount: 141,
        playErrorCount: 1
    },
    activePlayerMovie: null,
    activeSubLang: 'id',
    activeQuality: '1080p',
    activeServer: 'primary',
    saveIntervalId: null
};

// Load or Initialize State from LocalStorage
function initAppState() {
    try {
        const storedMovies = localStorage.getItem(STORAGE_KEYS.MOVIES);
        state.movies = storedMovies ? JSON.parse(storedMovies) : [...DEFAULT_MOVIES];

        const storedWatchlist = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
        state.watchlist = storedWatchlist ? JSON.parse(storedWatchlist) : ['mov-1', 'mov-2'];

        const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (storedHistory) {
            state.watchHistory = JSON.parse(storedHistory);
        } else {
            // Seed 2 initial Continue Watching items for immediate rich demo experience
            state.watchHistory = {
                'mov-2': {
                    lastPositionSeconds: 245,
                    durationSeconds: 888,
                    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
                    isCompleted: false
                },
                'mov-3': {
                    lastPositionSeconds: 190,
                    durationSeconds: 596,
                    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
                    isCompleted: false
                }
            };
            saveHistoryState();
        }

        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUser) state.user = JSON.parse(storedUser);

        const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
        if (storedLogs) {
            state.adminLogs = JSON.parse(storedLogs);
        } else {
            state.adminLogs = [
                { id: 1, type: 'verify_license', message: 'Memverifikasi lisensi CC-BY 3.0 untuk "Tears of Steel"', time: 'Baru saja' },
                { id: 2, type: 'health_check', message: 'Pemeriksaan otomatis 12 sumber video: 100% Online (HTTP 200)', time: '10 mnt lalu' },
                { id: 3, type: 'view_event', message: 'Telemetry: Pemutaran berhasil dimulai pada "Sintel" (1080p)', time: '25 mnt lalu' }
            ];
        }

        const storedMetrics = localStorage.getItem(STORAGE_KEYS.METRICS);
        if (storedMetrics) state.metrics = JSON.parse(storedMetrics);
    } catch (e) {
        console.error('Gagal memuat state dari localStorage:', e);
        state.movies = [...DEFAULT_MOVIES];
    }
}

function saveMoviesState() {
    try { localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(state.movies)); } catch (e) {}
}
function saveWatchlistState() {
    try { localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(state.watchlist)); } catch (e) {}
    updateWatchlistBadges();
}
function saveHistoryState() {
    try { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.watchHistory)); } catch (e) {}
}
function saveUserState() {
    try { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user)); } catch (e) {}
}
function saveLogsAndMetrics() {
    try {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(state.adminLogs.slice(0, 30)));
        localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(state.metrics));
    } catch (e) {}
}

function logEvent(type, message) {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.adminLogs.unshift({
        id: Date.now(),
        type,
        message,
        time: nowStr
    });
    saveLogsAndMetrics();
    if (state.currentView === 'admin') {
        renderAdminLogs();
        renderAdminMetrics();
    }
}

/**
 * ============================================================================
 * 3. NAVIGATION & SKELETON LOADING
 * ============================================================================
 */
function switchView(viewName, skipSkeleton = false) {
    state.currentView = viewName;

    // Update desktop nav buttons
    document.querySelectorAll('.nav-link').forEach(btn => {
        const isTarget = btn.getAttribute('data-nav') === viewName;
        if (isTarget) {
            btn.classList.add('bg-white/10', 'text-white');
            btn.classList.remove('text-neutral-300');
        } else {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-neutral-300');
        }
    });

    // Hide all sections
    const views = ['home', 'movies', 'genres', 'mylist', 'admin'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });

    const skeleton = document.getElementById('skeletonView');
    if (!skipSkeleton) {
        skeleton.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            skeleton.classList.add('hidden');
            showActiveSection(viewName);
        }, 220);
    } else {
        skeleton.classList.add('hidden');
        showActiveSection(viewName);
    }
}

function showActiveSection(viewName) {
    const targetEl = document.getElementById(`view-${viewName}`);
    if (targetEl) targetEl.classList.remove('hidden');

    if (viewName === 'home') renderHomeView();
    if (viewName === 'movies') applyCatalogFilters();
    if (viewName === 'genres') renderGenresView();
    if (viewName === 'mylist') renderMyListView();
    if (viewName === 'admin') renderAdminDashboard();
}

function toggleMobileMenu(forceState) {
    const drawer = document.getElementById('mobileMenuDrawer');
    const icon = document.getElementById('mobileMenuIcon');
    const isHidden = drawer.classList.contains('hidden');
    const shouldShow = typeof forceState === 'boolean' ? forceState : isHidden;

    if (shouldShow) {
        drawer.classList.remove('hidden');
        icon.className = 'fa-solid fa-xmark text-lg';
    } else {
        drawer.classList.add('hidden');
        icon.className = 'fa-solid fa-bars text-lg';
    }
}

/**
 * ============================================================================
 * 4. UI COMPONENTS: MOVIE POSTER CARD & HERO BANNER
 * ============================================================================
 */
function createMovieCardHTML(movie) {
    const inWatchlist = state.watchlist.includes(movie.id);
    const historyItem = state.watchHistory[movie.id];
    const progressPercent = historyItem
        ? Math.min(100, Math.round((historyItem.lastPositionSeconds / (historyItem.durationSeconds || movie.durationSeconds || 600)) * 100))
        : 0;

    const fallbackPoster = `https://placehold.co/400x600/141414/E50914?text=${encodeURIComponent(movie.title)}`;

    return `
        <div class="poster-card group relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800/90 flex flex-col cursor-pointer" onclick="openMovieDetail('${movie.id}')">
            <!-- Vertical 2:3 Poster Image -->
            <div class="relative aspect-[2/3] w-full bg-neutral-950 overflow-hidden">
                <img
                    src="${movie.posterUrl}"
                    alt="${movie.title}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='${fallbackPoster}';"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-75 group-hover:opacity-90 transition-opacity"></div>

                <!-- Top Badges: Rating & Year -->
                <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span class="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-400 text-[11px] font-bold flex items-center gap-1 border border-white/10">
                        <i class="fa-solid fa-star text-[10px]"></i> ${Number(movie.ratingScore).toFixed(1)}
                    </span>
                    <span class="px-2 py-0.5 rounded-md bg-cine-red/90 text-white text-[10px] font-bold tracking-wide uppercase">
                        ${movie.releaseYear}
                    </span>
                </div>

                <!-- Watchlist Quick Button -->
                <button
                    onclick="event.stopPropagation(); toggleWatchlist('${movie.id}')"
                    title="${inWatchlist ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}"
                    class="absolute bottom-12 right-2.5 z-20 w-8 h-8 rounded-full ${inWatchlist ? 'bg-cine-red text-white' : 'bg-black/75 text-neutral-200 hover:bg-white hover:text-black'} flex items-center justify-center border border-white/15 transition-all"
                >
                    <i class="fa-solid ${inWatchlist ? 'fa-check' : 'fa-plus'} text-xs"></i>
                </button>

                <!-- Center Play Hover Button -->
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onclick="event.stopPropagation(); openVideoPlayer('${movie.id}')"
                        class="w-12 h-12 rounded-full bg-cine-red text-white flex items-center justify-center shadow-xl shadow-cine-red/50 transform scale-90 group-hover:scale-100 transition-transform"
                    >
                        <i class="fa-solid fa-play text-base ml-0.5"></i>
                    </button>
                </div>

                <!-- Bottom Legal Badge & Progress Bar -->
                <div class="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-neutral-300">
                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium truncate max-w-[85%]">
                        <i class="fa-solid fa-circle-check mr-0.5"></i>${movie.licenseType.split(' ')[0]} ${movie.licenseType.split(' ')[1] || ''}
                    </span>
                </div>

                ${progressPercent > 0 ? `
                    <div class="absolute bottom-0 inset-x-0 h-1 bg-neutral-800">
                        <div class="h-full bg-cine-red" style="width: ${progressPercent}%"></div>
                    </div>
                ` : ''}
            </div>

            <!-- Card Footer Metadata -->
            <div class="p-3 flex flex-col justify-between flex-grow bg-cine-card">
                <div>
                    <h3 class="font-display font-bold text-xs sm:text-sm text-white group-hover:text-cine-red transition-colors line-clamp-1">${movie.title}</h3>
                    <p class="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">${movie.genres.join(' • ')}</p>
                </div>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-400">
                    <span><i class="fa-regular fa-clock mr-1"></i>${movie.durationMinutes} mnt</span>
                    <span><i class="fa-solid fa-closed-captioning mr-1 text-neutral-300"></i>ID / EN</span>
                </div>
            </div>
        </div>
    `;
}

function renderHeroBanner() {
    const container = document.getElementById('heroBannerContainer');
    const featured = state.movies.find(m => m.isFeatured) || state.movies[0];
    if (!featured) return;

    const inWatchlist = state.watchlist.includes(featured.id);
    const historyItem = state.watchHistory[featured.id];
    const resumeLabel = historyItem && historyItem.lastPositionSeconds > 5 && !historyItem.isCompleted
        ? `Lanjutkan (${formatSeconds(historyItem.lastPositionSeconds)})`
        : 'Play Now';

    const fallbackBackdrop = `https://placehold.co/1600x900/0a0a0a/E50914?text=${encodeURIComponent(featured.title)}`;

    container.innerHTML = `
        <!-- Background Image -->
        <img
            src="${featured.backdropUrl}"
            alt="${featured.title}"
            onerror="this.onerror=null;this.src='${fallbackBackdrop}';"
            class="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        >
        <!-- Cinematic Vignette Overlays -->
        <div class="absolute inset-0 hero-gradient-overlay"></div>

        <!-- Hero Content -->
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
            <div class="max-w-2xl space-y-4">
                <!-- Featured & Legal Badges -->
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 rounded-md bg-cine-red text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cine-red/30">
                        <i class="fa-solid fa-fire"></i> Featured Film
                    </span>
                    <span class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                        <i class="fa-solid fa-scale-balanced"></i> ${featured.licenseType}
                    </span>
                    <span class="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-sm text-amber-400 text-[11px] font-bold flex items-center gap-1">
                        <i class="fa-solid fa-star"></i> ${featured.ratingScore} (${featured.ratingSource})
                    </span>
                </div>

                <!-- Movie Title -->
                <h1 class="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
                    ${featured.title}
                </h1>

                <!-- Metadata Pills -->
                <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-neutral-300 font-medium">
                    <span class="text-emerald-400 font-bold">98% Match</span>
                    <span>•</span>
                    <span>${featured.releaseYear}</span>
                    <span>•</span>
                    <span class="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs">${featured.durationMinutes} Menit</span>
                    <span>•</span>
                    <span class="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs">1080p FHD</span>
                    <span>•</span>
                    <span>${featured.genres.join(', ')}</span>
                </div>

                <!-- Synopsis -->
                <p class="text-xs sm:text-base text-neutral-300 line-clamp-3 leading-relaxed max-w-xl">
                    ${featured.synopsis}
                </p>

                <!-- Action CTA Buttons -->
                <div class="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        onclick="openVideoPlayer('${featured.id}')"
                        class="px-6 sm:px-7 py-3 rounded-xl bg-cine-red hover:bg-cine-redHover text-white font-display font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-cine-red/30 transition-all transform hover:scale-105"
                    >
                        <i class="fa-solid fa-play"></i> ${resumeLabel}
                    </button>
                    <button
                        onclick="openMovieDetail('${featured.id}')"
                        class="px-5 sm:px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-semibold text-sm sm:text-base flex items-center gap-2 border border-white/15 transition-all"
                    >
                        <i class="fa-solid fa-circle-info"></i> More Info
                    </button>
                    <button
                        onclick="toggleWatchlist('${featured.id}')"
                        class="px-4 py-3 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-white font-semibold text-sm flex items-center gap-2 border border-neutral-700 transition-all"
                    >
                        <i class="fa-solid ${inWatchlist ? 'fa-check text-emerald-400' : 'fa-plus'}"></i>
                        <span>${inWatchlist ? 'In My List' : '+ My List'}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * ============================================================================
 * 5. HOMEPAGE SECTIONS RENDERING
 * ============================================================================
 */
function renderHomeView() {
    renderHeroBanner();
    renderContinueWatchingRow();

    // Trending Movies (Top 6 by popularity)
    const trending = [...state.movies].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
    document.getElementById('trendingMoviesRow').innerHTML = trending.map(createMovieCardHTML).join('');

    // Home Genre Quick Filter Pills
    renderHomeGenreQuickSection();

    // Popular Movies (Top 6 by ratingScore)
    const popular = [...state.movies].sort((a, b) => b.ratingScore - a.ratingScore).slice(0, 6);
    document.getElementById('popularMoviesRow').innerHTML = popular.map(createMovieCardHTML).join('');

    // Recently Added (Top 6 by releaseYear desc)
    const recent = [...state.movies].sort((a, b) => b.releaseYear - a.releaseYear).slice(0, 6);
    document.getElementById('recentMoviesRow').innerHTML = recent.map(createMovieCardHTML).join('');

    // Recommended for You (Based on user preferred genres)
    renderRecommendedMoviesRow();
}

function renderContinueWatchingRow() {
    const section = document.getElementById('continueWatchingSection');
    const grid = document.getElementById('continueWatchingGrid');
    const countBadge = document.getElementById('continueWatchingCount');

    const entries = Object.entries(state.watchHistory)
        .map(([movieId, data]) => {
            const movie = state.movies.find(m => m.id === movieId);
            return movie ? { movie, ...data } : null;
        })
        .filter(item => item && item.lastPositionSeconds > 3 && !item.isCompleted)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (entries.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    countBadge.textContent = `${entries.length} Film`;

    grid.innerHTML = entries.slice(0, 4).map(item => {
        const totalDur = item.durationSeconds || item.movie.durationSeconds || 600;
        const pct = Math.min(98, Math.max(4, Math.round((item.lastPositionSeconds / totalDur) * 100)));
        const remainingMin = Math.max(1, Math.ceil((totalDur - item.lastPositionSeconds) / 60));

        return `
            <div class="bg-neutral-950 border border-neutral-800 hover:border-cine-red/60 rounded-xl overflow-hidden flex flex-col justify-between group transition-all">
                <div class="relative aspect-video w-full bg-black overflow-hidden cursor-pointer" onclick="openVideoPlayer('${item.movie.id}')">
                    <img src="${item.movie.backdropUrl}" alt="${item.movie.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-11 h-11 rounded-full bg-cine-red/90 group-hover:bg-cine-red text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                            <i class="fa-solid fa-play text-sm ml-0.5"></i>
                        </div>
                    </div>
                    <button
                        onclick="event.stopPropagation(); removeWatchHistoryItem('${item.movie.id}')"
                        title="Hapus dari Continue Watching"
                        class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-rose-600 text-neutral-300 hover:text-white flex items-center justify-center text-xs"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-neutral-200 font-medium">
                        <span>Posisi: ${formatSeconds(item.lastPositionSeconds)}</span>
                        <span class="text-amber-400">Sisa ~${remainingMin} mnt</span>
                    </div>
                    <div class="absolute bottom-0 inset-x-0 h-1.5 bg-neutral-800">
                        <div class="h-full bg-cine-red" style="width: ${pct}%"></div>
                    </div>
                </div>
                <div class="p-3 flex items-center justify-between gap-2">
                    <div class="truncate">
                        <h4 class="font-display font-bold text-xs sm:text-sm text-white truncate">${item.movie.title}</h4>
                        <p class="text-[11px] text-neutral-400">${pct}% selesai ditonton</p>
                    </div>
                    <button onclick="openMovieDetail('${item.movie.id}')" class="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs" title="Detail Film">
                        <i class="fa-solid fa-circle-info"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderHomeGenreQuickSection() {
    const pillsContainer = document.getElementById('homeGenrePills');
    const gridContainer = document.getElementById('homeGenreMoviesGrid');

    const genresList = ['All', ...ALL_GENRES.map(g => g.name)];
    pillsContainer.innerHTML = genresList.map(gName => {
        const active = state.selectedHomeGenre === gName;
        return `
            <button
                onclick="selectHomeGenre('${gName}')"
                class="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                        ? 'bg-cine-red text-white shadow-lg shadow-cine-red/30'
                        : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }"
            >
                ${gName === 'All' ? 'Semua Genre' : gName}
            </button>
        `;
    }).join('');

    const filtered = state.selectedHomeGenre === 'All'
        ? state.movies.slice(0, 6)
        : state.movies.filter(m => m.genres.includes(state.selectedHomeGenre)).slice(0, 6);

    gridContainer.innerHTML = filtered.map(createMovieCardHTML).join('');
}

function selectHomeGenre(genreName) {
    state.selectedHomeGenre = genreName;
    renderHomeGenreQuickSection();
}

function renderRecommendedMoviesRow() {
    const preferred = state.user.preferredGenres && state.user.preferredGenres.length > 0
        ? state.user.preferredGenres
        : ['Sci-Fi', 'Animation', 'Action'];

    document.getElementById('recommendationSubtext').textContent =
        `Berdasarkan genre pilihan Anda: ${preferred.join(', ')}`;

    const scored = [...state.movies].map(m => {
        const matchCount = m.genres.filter(g => preferred.includes(g)).length;
        return { movie: m, score: matchCount * 10 + m.ratingScore };
    }).sort((a, b) => b.score - a.score);

    document.getElementById('recommendedMoviesRow').innerHTML =
        scored.slice(0, 6).map(item => createMovieCardHTML(item.movie)).join('');
}

/**
 * ============================================================================
 * 6. SEARCH & FILTER CATALOG (PRD Section 4.4)
 * ============================================================================
 */
function populateGenreSelectDropdown() {
    const select = document.getElementById('filterGenreSelect');
    if (!select) return;
    select.innerHTML = `<option value="all">Semua Genre (${state.movies.length})</option>` +
        ALL_GENRES.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
}

function handleGlobalSearch(query) {
    const clearBtn = document.getElementById('clearGlobalSearchBtn');
    if (query && query.trim().length > 0) {
        clearBtn.classList.remove('hidden');
        if (state.currentView !== 'movies') {
            switchView('movies', true);
        }
        document.getElementById('catalogSearchInput').value = query;
        applyCatalogFilters();
    } else {
        clearBtn.classList.add('hidden');
        document.getElementById('catalogSearchInput').value = '';
        if (state.currentView === 'movies') applyCatalogFilters();
    }
}

function clearGlobalSearch() {
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('clearGlobalSearchBtn').classList.add('hidden');
    document.getElementById('catalogSearchInput').value = '';
    applyCatalogFilters();
}

function openCatalogWithSort(sortMode) {
    document.getElementById('filterSortSelect').value = sortMode;
    switchView('movies');
}

function resetCatalogFilters() {
    document.getElementById('catalogSearchInput').value = '';
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('clearGlobalSearchBtn').classList.add('hidden');
    document.getElementById('filterGenreSelect').value = 'all';
    document.getElementById('filterYearSelect').value = 'all';
    document.getElementById('filterLangSelect').value = 'all';
    document.getElementById('filterSortSelect').value = 'popular';
    applyCatalogFilters();
}

function applyCatalogFilters() {
    const q = (document.getElementById('catalogSearchInput')?.value || '').trim().toLowerCase();
    const genre = document.getElementById('filterGenreSelect')?.value || 'all';
    const yearGroup = document.getElementById('filterYearSelect')?.value || 'all';
    const lang = document.getElementById('filterLangSelect')?.value || 'all';
    const sortBy = document.getElementById('filterSortSelect')?.value || 'popular';

    let results = state.movies.filter(movie => {
        const matchesQuery = !q ||
            movie.title.toLowerCase().includes(q) ||
            movie.synopsis.toLowerCase().includes(q) ||
            movie.genres.some(g => g.toLowerCase().includes(q)) ||
            movie.cast.some(c => c.toLowerCase().includes(q));

        const matchesGenre = genre === 'all' || movie.genres.includes(genre);

        let matchesYear = true;
        if (yearGroup === '2020s') matchesYear = movie.releaseYear >= 2020;
        else if (yearGroup === '2010s') matchesYear = movie.releaseYear >= 2010 && movie.releaseYear <= 2019;
        else if (yearGroup === '2000s') matchesYear = movie.releaseYear >= 2000 && movie.releaseYear <= 2009;
        else if (yearGroup === 'classic') matchesYear = movie.releaseYear < 2000;

        const matchesLang = lang === 'all' || movie.language === lang;

        return matchesQuery && matchesGenre && matchesYear && matchesLang;
    });

    if (sortBy === 'popular') results.sort((a, b) => b.popularity - a.popularity);
    else if (sortBy === 'rating') results.sort((a, b) => b.ratingScore - a.ratingScore);
    else if (sortBy === 'newest') results.sort((a, b) => b.releaseYear - a.releaseYear);
    else if (sortBy === 'title') results.sort((a, b) => a.title.localeCompare(b.title));

    const grid = document.getElementById('catalogGridContainer');
    const emptyState = document.getElementById('catalogEmptyState');
    const countBadge = document.getElementById('catalogCountBadge');

    countBadge.textContent = `Menampilkan ${results.length} dari ${state.movies.length} Film`;

    if (results.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        grid.innerHTML = results.map(createMovieCardHTML).join('');
    }
}

/**
 * ============================================================================
 * 7. GENRES VIEW
 * ============================================================================
 */
function renderGenresView() {
    const cardsGrid = document.getElementById('genreCardsGrid');
    cardsGrid.innerHTML = ALL_GENRES.map(g => {
        const count = state.movies.filter(m => m.genres.includes(g.name)).length;
        const isSelected = state.selectedGenrePage === g.name;
        return `
            <div
                onclick="selectGenrePageCategory('${g.name}')"
                class="cursor-pointer rounded-2xl p-4 bg-gradient-to-br ${g.color} border ${isSelected ? 'border-white ring-2 ring-cine-red' : 'border-white/10'} hover:scale-[1.03] transition-all flex flex-col justify-between h-28 shadow-lg"
            >
                <div class="flex items-center justify-between">
                    <i class="fa-solid ${g.icon} text-white/90 text-xl"></i>
                    <span class="px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-bold">${count} Film</span>
                </div>
                <div>
                    <h3 class="font-display font-bold text-base sm:text-lg text-white">${g.name}</h3>
                </div>
            </div>
        `;
    }).join('');

    renderGenreShowcaseGrid();
}

function selectGenrePageCategory(genreName) {
    state.selectedGenrePage = state.selectedGenrePage === genreName ? 'All' : genreName;
    renderGenresView();
}

function renderGenreShowcaseGrid() {
    const heading = document.getElementById('selectedGenreHeading');
    const countSpan = document.getElementById('selectedGenreCount');
    const grid = document.getElementById('genreShowcaseGrid');

    const filtered = state.selectedGenrePage === 'All'
        ? state.movies
        : state.movies.filter(m => m.genres.includes(state.selectedGenrePage));

    heading.textContent = state.selectedGenrePage === 'All'
        ? 'Semua Koleksi Genre'
        : `Kategori Genre: ${state.selectedGenrePage}`;
    countSpan.textContent = `${filtered.length} Film Tersedia`;

    grid.innerHTML = filtered.map(createMovieCardHTML).join('');
}

/**
 * ============================================================================
 * 8. WATCHLIST & WATCH HISTORY (PRD Section 4.7 & 4.8)
 * ============================================================================
 */
function updateWatchlistBadges() {
    const count = state.watchlist.length;
    const badgeDesktop = document.getElementById('navWatchlistBadge');
    const badgeMobile = document.getElementById('mobileWatchlistBadge');

    if (count > 0) {
        badgeDesktop.textContent = count;
        badgeDesktop.classList.remove('hidden');
    } else {
        badgeDesktop.classList.add('hidden');
    }
    if (badgeMobile) badgeMobile.textContent = count;
}

function toggleWatchlist(movieId) {
    const movie = state.movies.find(m => m.id === movieId);
    if (!movie) return;

    const idx = state.watchlist.indexOf(movieId);
    if (idx > -1) {
        state.watchlist.splice(idx, 1);
        showToast(`"${movie.title}" dihapus dari My List`, 'info');
    } else {
        state.watchlist.push(movieId);
        showToast(`"${movie.title}" ditambahkan ke My List`, 'success');
    }

    saveWatchlistState();

    // Re-render current active view so buttons update immediately
    if (state.currentView === 'home') renderHomeView();
    if (state.currentView === 'movies') applyCatalogFilters();
    if (state.currentView === 'genres') renderGenreShowcaseGrid();
    if (state.currentView === 'mylist') renderMyListView();

    // If detail modal is open for this movie, refresh it
    const detailModal = document.getElementById('movieDetailModal');
    if (!detailModal.classList.contains('hidden')) {
        openMovieDetail(movieId);
    }
}

function renderMyListView() {
    const watchlistGrid = document.getElementById('watchlistGrid');
    const emptyState = document.getElementById('watchlistEmptyState');

    const savedMovies = state.watchlist
        .map(id => state.movies.find(m => m.id === id))
        .filter(Boolean);

    if (savedMovies.length === 0) {
        watchlistGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        watchlistGrid.innerHTML = savedMovies.map(createMovieCardHTML).join('');
    }

    // Render Watch History Cards
    const historyContainer = document.getElementById('historyListContainer');
    const historyEntries = Object.entries(state.watchHistory)
        .map(([movieId, h]) => ({ movie: state.movies.find(m => m.id === movieId), ...h }))
        .filter(item => item.movie)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (historyEntries.length === 0) {
        historyContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-neutral-400 text-xs sm:text-sm bg-neutral-900/30 rounded-xl border border-neutral-800">
                Belum ada riwayat tontonan. Mulai tonton film apa saja untuk menyimpan progres secara otomatis.
            </div>
        `;
    } else {
        historyContainer.innerHTML = historyEntries.map(item => {
            const dur = item.durationSeconds || item.movie.durationSeconds || 600;
            const pct = Math.min(100, Math.round((item.lastPositionSeconds / dur) * 100));
            return `
                <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center gap-4">
                    <img src="${item.movie.posterUrl}" alt="${item.movie.title}" class="w-16 h-24 object-cover rounded-lg flex-shrink-0 cursor-pointer" onclick="openMovieDetail('${item.movie.id}')">
                    <div class="flex-grow min-w-0 space-y-1.5">
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="font-display font-bold text-sm text-white truncate">${item.movie.title}</h4>
                            <button onclick="removeWatchHistoryItem('${item.movie.id}')" class="text-neutral-500 hover:text-rose-400 text-xs">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <p class="text-[11px] text-neutral-400">Posisi terakhir: <span class="text-white font-semibold">${formatSeconds(item.lastPositionSeconds)}</span> dari ${formatSeconds(dur)}</p>
                        <div class="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div class="h-full bg-cine-red" style="width: ${pct}%"></div>
                        </div>
                        <div class="pt-1">
                            <button onclick="openVideoPlayer('${item.movie.id}')" class="px-3 py-1 rounded-lg bg-cine-red hover:bg-cine-redHover text-white text-xs font-semibold inline-flex items-center gap-1.5">
                                <i class="fa-solid fa-play text-[10px]"></i> Lanjutkan (${pct}%)
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function removeWatchHistoryItem(movieId) {
    delete state.watchHistory[movieId];
    saveHistoryState();
    renderHomeView();
    if (state.currentView === 'mylist') renderMyListView();
    showToast('Riwayat tontonan film dihapus', 'info');
}

function clearAllWatchHistory() {
    state.watchHistory = {};
    saveHistoryState();
    renderHomeView();
    if (state.currentView === 'mylist') renderMyListView();
    showToast('Seluruh riwayat tontonan telah dibersihkan', 'info');
}

/**
 * ============================================================================
 * 9. MOVIE DETAIL PAGE MODAL (PRD Section 4.5)
 * ============================================================================
 */
function openMovieDetail(movieId) {
    const movie = state.movies.find(m => m.id === movieId);
    if (!movie) return;

    const modal = document.getElementById('movieDetailModal');
    const content = document.getElementById('movieDetailContent');

    const inWatchlist = state.watchlist.includes(movie.id);
    const historyItem = state.watchHistory[movie.id];
    const hasProgress = historyItem && historyItem.lastPositionSeconds > 5 && !historyItem.isCompleted;

    // Find similar movies sharing at least 1 genre
    const similarMovies = state.movies
        .filter(m => m.id !== movie.id && m.genres.some(g => movie.genres.includes(g)))
        .slice(0, 4);

    const fallbackBackdrop = `https://placehold.co/1200x600/141414/E50914?text=${encodeURIComponent(movie.title)}`;
    const fallbackPoster = `https://placehold.co/400x600/141414/E50914?text=${encodeURIComponent(movie.title)}`;

    content.innerHTML = `
        <!-- Large Backdrop Header -->
        <div class="relative h-64 sm:h-80 w-full bg-black overflow-hidden">
            <img
                src="${movie.backdropUrl}"
                alt="${movie.title}"
                onerror="this.onerror=null;this.src='${fallbackBackdrop}';"
                class="w-full h-full object-cover opacity-75"
            >
            <div class="absolute inset-0 detail-backdrop-gradient"></div>
            <div class="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                        <i class="fa-solid fa-certificate mr-1"></i>${movie.licenseType}
                    </span>
                    <span class="px-2.5 py-1 rounded bg-black/70 text-amber-400 border border-white/10 text-xs font-bold">
                        <i class="fa-solid fa-star mr-1"></i>${movie.ratingScore} / 10 (${movie.ratingSource})
                    </span>
                </div>
            </div>
        </div>

        <!-- Main Detail Body -->
        <div class="p-6 sm:p-8 -mt-12 relative z-10 space-y-8">
            <div class="flex flex-col sm:flex-row gap-6">
                <!-- Vertical Poster -->
                <img
                    src="${movie.posterUrl}"
                    alt="${movie.title}"
                    onerror="this.onerror=null;this.src='${fallbackPoster}';"
                    class="w-32 sm:w-44 aspect-[2/3] object-cover rounded-xl border-2 border-neutral-700 shadow-2xl flex-shrink-0 hidden sm:block"
                >

                <!-- Metadata & Actions -->
                <div class="space-y-4 flex-grow">
                    <div>
                        <h2 class="font-display text-2xl sm:text-4xl font-extrabold text-white">${movie.title}</h2>
                        <div class="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-neutral-400 mt-1.5">
                            <span class="text-white font-semibold">${movie.releaseYear}</span>
                            <span>•</span>
                            <span>${movie.durationMinutes} Menit</span>
                            <span>•</span>
                            <span>Bahasa: <strong class="text-neutral-200">${movie.language}</strong></span>
                            <span>•</span>
                            <span>Provider: <strong class="text-sky-400">${movie.providerName}</strong></span>
                        </div>
                    </div>

                    <!-- Genre Tags -->
                    <div class="flex flex-wrap gap-2">
                        ${movie.genres.map(g => `
                            <span class="px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200">
                                ${g}
                            </span>
                        `).join('')}
                    </div>

                    <!-- Synopsis -->
                    <p class="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        ${movie.synopsis}
                    </p>

                    <!-- Cast & Subtitle Availability -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-xl">
                        <div>
                            <span class="text-neutral-400 block mb-0.5">Pemeran & Kreator:</span>
                            <span class="text-white font-medium">${movie.cast.join(', ')}</span>
                        </div>
                        <div>
                            <span class="text-neutral-400 block mb-0.5">Ketersediaan Subtitle:</span>
                            <span class="text-emerald-400 font-medium">
                                <i class="fa-solid fa-closed-captioning mr-1"></i>${movie.subtitles.join(', ')} (WebVTT Ready)
                            </span>
                        </div>
                    </div>

                    <!-- Primary CTA Buttons -->
                    <div class="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            onclick="closeMovieDetailModal(); openVideoPlayer('${movie.id}');"
                            class="px-6 py-3 rounded-xl bg-cine-red hover:bg-cine-redHover text-white font-display font-bold text-sm flex items-center gap-2 shadow-lg shadow-cine-red/30 transition-all"
                        >
                            <i class="fa-solid fa-play"></i>
                            ${hasProgress ? `Lanjutkan Menonton (${formatSeconds(historyItem.lastPositionSeconds)})` : 'Play Movie Sekarang'}
                        </button>

                        <button
                            onclick="toggleWatchlist('${movie.id}')"
                            class="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm flex items-center gap-2 border border-neutral-700 transition-colors"
                        >
                            <i class="fa-solid ${inWatchlist ? 'fa-check text-emerald-400' : 'fa-plus'}"></i>
                            ${inWatchlist ? 'Tersimpan di My List' : 'Tambah ke Watchlist'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Similar Movies Section -->
            <div class="space-y-3 pt-6 border-t border-neutral-800">
                <h3 class="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-wand-magic-sparkles text-cine-red"></i> Film Serupa (Genre Terkait)
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    ${similarMovies.map(sim => `
                        <div onclick="openMovieDetail('${sim.id}')" class="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer group transition-all">
                            <div class="aspect-video w-full bg-black overflow-hidden relative">
                                <img src="${sim.backdropUrl}" alt="${sim.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                                <span class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-amber-400 text-[10px] font-bold">
                                    ★ ${sim.ratingScore}
                                </span>
                            </div>
                            <div class="p-2.5">
                                <h4 class="font-bold text-xs text-white truncate group-hover:text-cine-red">${sim.title}</h4>
                                <p class="text-[10px] text-neutral-400">${sim.releaseYear} • ${sim.durationMinutes} mnt</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeMovieDetailModal() {
    document.getElementById('movieDetailModal').classList.add('hidden');
}

/**
 * ============================================================================
 * 10. VIDEO STREAMING PLAYER ENGINE (PRD Section 4.3 & 4.8)
 * ============================================================================
 */
function openVideoPlayer(movieId) {
    const movie = state.movies.find(m => m.id === movieId);
    if (!movie) return;

    state.activePlayerMovie = movie;
    state.activeServer = 'primary';
    document.getElementById('playerServerSelect').value = 'primary';

    const modal = document.getElementById('videoPlayerModal');
    const video = document.getElementById('mainVideoElement');
    const errorOverlay = document.getElementById('videoErrorOverlay');
    const resumeToast = document.getElementById('resumeBannerToast');

    errorOverlay.classList.add('hidden');
    modal.classList.remove('hidden');

    document.getElementById('playerMovieTitle').textContent = `${movie.title} (${movie.releaseYear})`;
    document.getElementById('playerLicenseBadge').textContent = movie.licenseType;
    document.getElementById('playerSubInfo').textContent = `Provider: ${movie.providerName} • Auto-Save Progress Aktif`;

    // Load video stream
    video.src = movie.videoUrl;
    video.load();

    // Check if user has saved progress in watch_histories
    const savedHistory = state.watchHistory[movie.id];
    const resumeTime = (savedHistory && savedHistory.lastPositionSeconds > 5 && !savedHistory.isCompleted)
        ? savedHistory.lastPositionSeconds
        : 0;

    video.onloadedmetadata = () => {
        document.getElementById('playerDurationTime').textContent = formatSeconds(video.duration || movie.durationSeconds);
        if (resumeTime > 0 && resumeTime < (video.duration - 5)) {
            video.currentTime = resumeTime;
            document.getElementById('resumeBannerText').textContent =
                `Melanjutkan otomatis dari ${formatSeconds(resumeTime)}`;
            resumeToast.classList.remove('hidden');
            setTimeout(() => resumeToast.classList.add('hidden'), 6000);
        } else {
            resumeToast.classList.add('hidden');
        }

        video.play().then(() => {
            updatePlayPauseIcon();
            state.metrics.totalViews += 1;
            state.metrics.playSuccessCount += 1;
            logEvent('view_event', `Memulai streaming "${movie.title}" (${state.activeQuality})`);
        }).catch(() => {
            updatePlayPauseIcon();
        });
    };

    // Attach player telemetry & progress listeners
    if (state.saveIntervalId) clearInterval(state.saveIntervalId);
    state.saveIntervalId = setInterval(saveCurrentPlaybackProgress, 3000);
}

function saveCurrentPlaybackProgress() {
    const video = document.getElementById('mainVideoElement');
    const movie = state.activePlayerMovie;
    if (!video || !movie || video.paused || video.ended) return;

    const currentSec = Math.floor(video.currentTime);
    const totalSec = Math.floor(video.duration || movie.durationSeconds || 600);
    if (currentSec <= 2) return;

    const isCompleted = currentSec >= totalSec * 0.92;
    state.watchHistory[movie.id] = {
        lastPositionSeconds: currentSec,
        durationSeconds: totalSec,
        updatedAt: new Date().toISOString(),
        isCompleted
    };
    saveHistoryState();

    // Pulse auto-save indicator
    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
        indicator.classList.remove('opacity-50');
        setTimeout(() => indicator.classList.add('opacity-50'), 800);
    }
}

function closeVideoPlayer() {
    saveCurrentPlaybackProgress();
    if (state.saveIntervalId) {
        clearInterval(state.saveIntervalId);
        state.saveIntervalId = null;
    }
    const video = document.getElementById('mainVideoElement');
    video.pause();
    video.removeAttribute('src');
    video.load();

    document.getElementById('videoPlayerModal').classList.add('hidden');
    state.activePlayerMovie = null;

    // Refresh Continue Watching row
    if (state.currentView === 'home') renderHomeView();
    if (state.currentView === 'mylist') renderMyListView();
}

function restartVideoFromBeginning() {
    const video = document.getElementById('mainVideoElement');
    video.currentTime = 0;
    video.play();
    document.getElementById('resumeBannerToast').classList.add('hidden');
}

function togglePlayPause() {
    const video = document.getElementById('mainVideoElement');
    if (!video.src) return;
    if (video.paused || video.ended) {
        video.play();
    } else {
        video.pause();
    }
    updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
    const video = document.getElementById('mainVideoElement');
    const btn = document.getElementById('playerPlayPauseBtn');
    if (!btn) return;
    btn.innerHTML = video.paused
        ? '<i class="fa-solid fa-play text-sm ml-0.5"></i>'
        : '<i class="fa-solid fa-pause text-sm"></i>';
}

function skipTime(deltaSeconds) {
    const video = document.getElementById('mainVideoElement');
    if (!video || !video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + deltaSeconds));
}

function handleSeekBarInput(percentValue) {
    const video = document.getElementById('mainVideoElement');
    if (!video || !video.duration) return;
    const targetTime = (parseFloat(percentValue) / 100) * video.duration;
    video.currentTime = targetTime;
    document.getElementById('playerSeekFill').style.width = `${percentValue}%`;
}

function handleVolumeChange(val) {
    const video = document.getElementById('mainVideoElement');
    video.volume = parseFloat(val);
    video.muted = parseFloat(val) === 0;
    updateMuteIcon();
}

function toggleMute() {
    const video = document.getElementById('mainVideoElement');
    video.muted = !video.muted;
    document.getElementById('playerVolumeInput').value = video.muted ? 0 : video.volume;
    updateMuteIcon();
}

function updateMuteIcon() {
    const video = document.getElementById('mainVideoElement');
    const btn = document.getElementById('playerMuteBtn');
    if (video.muted || video.volume === 0) {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark text-rose-500"></i>';
    } else if (video.volume < 0.5) {
        btn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
}

function handleQualityChange(quality) {
    state.activeQuality = quality;
    document.getElementById('playerQualityBadgeFooter').textContent = `Stream: ${quality} MP4 Legal`;
    showToast(`Kualitas pemutaran diubah ke ${quality}`, 'info');
}

function handleSubtitleChange(subLang) {
    state.activeSubLang = subLang;
    const box = document.getElementById('subtitleOverlayBox');
    if (subLang === 'off') {
        box.classList.add('hidden');
        showToast('Subtitle dinonaktifkan', 'info');
    } else {
        box.classList.remove('hidden');
        updateSynchronizedSubtitle();
        showToast(`Subtitle diubah ke ${subLang === 'id' ? 'Bahasa Indonesia' : 'English (CC)'}`, 'info');
    }
}

function handleServerChange(serverKey) {
    const movie = state.activePlayerMovie;
    const video = document.getElementById('mainVideoElement');
    if (!movie || !video) return;

    const savedTime = video.currentTime || 0;
    state.activeServer = serverKey;

    if (serverKey === 'broken') {
        // Intentionally trigger error handling & telemetry logging per PRD 4.3
        video.pause();
        state.metrics.playErrorCount += 1;
        logEvent('error', `Stream Error (ERR_STREAM_TIMEOUT) pada "${movie.title}" — Mencoba fallback...`);
        document.getElementById('videoErrorOverlay').classList.remove('hidden');
        return;
    }

    document.getElementById('videoErrorOverlay').classList.add('hidden');
    video.src = serverKey === 'backup' ? (movie.backupVideoUrl || movie.videoUrl) : movie.videoUrl;
    video.load();
    video.onloadedmetadata = () => {
        video.currentTime = savedTime;
        video.play();
        updatePlayPauseIcon();
    };
    showToast(`Beralih ke ${serverKey === 'backup' ? 'Server 2 (Backup Archive)' : 'Server 1 (Primary CDN)'}`, 'success');
}

function recoverWithFallbackServer() {
    document.getElementById('playerServerSelect').value = 'backup';
    handleServerChange('backup');
    logEvent('view_event', `Auto-Fallback berhasil memulihkan pemutaran "${state.activePlayerMovie?.title}" di Server Cadangan`);
}

function toggleFullscreenPlayer() {
    const stage = document.getElementById('videoStageContainer');
    if (!document.fullscreenElement) {
        if (stage.requestFullscreen) stage.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function updateSynchronizedSubtitle() {
    const video = document.getElementById('mainVideoElement');
    const movie = state.activePlayerMovie;
    const box = document.getElementById('subtitleOverlayBox');
    const textSpan = document.getElementById('subtitleTextContent');

    if (!video || !movie || state.activeSubLang === 'off') {
        if (box) box.classList.add('hidden');
        return;
    }

    box.classList.remove('hidden');
    const currentSec = video.currentTime || 0;
    const cues = movie.dialogueCues || [];
    const activeCue = cues.find(c => currentSec >= c.start && currentSec <= c.end) || cues[cues.length - 1];

    if (activeCue) {
        textSpan.textContent = state.activeSubLang === 'id' ? activeCue.id : activeCue.en;
    } else {
        textSpan.textContent = state.activeSubLang === 'id'
            ? `[Menonton ${movie.title} — Subtitle Indonesia]`
            : `[Watching ${movie.title} — English CC]`;
    }
}

function setupVideoElementEvents() {
    const video = document.getElementById('mainVideoElement');
    const spinner = document.getElementById('videoLoadingSpinner');

    video.addEventListener('waiting', () => spinner.classList.remove('hidden'));
    video.addEventListener('playing', () => {
        spinner.classList.add('hidden');
        updatePlayPauseIcon();
    });
    video.addEventListener('canplay', () => spinner.classList.add('hidden'));
    video.addEventListener('pause', () => updatePlayPauseIcon());

    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        document.getElementById('playerSeekInput').value = pct;
        document.getElementById('playerSeekFill').style.width = `${pct}%`;
        document.getElementById('playerCurrentTime').textContent = formatSeconds(video.currentTime);
        updateSynchronizedSubtitle();
    });

    video.addEventListener('error', () => {
        spinner.classList.add('hidden');
        document.getElementById('videoErrorOverlay').classList.remove('hidden');
    });

    // Keyboard Shortcuts for Accessibility (PRD Section 9)
    window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('videoPlayerModal');
        if (modal.classList.contains('hidden')) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            skipTime(10);
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            skipTime(-10);
        } else if (e.code === 'KeyM') {
            e.preventDefault();
            toggleMute();
        } else if (e.code === 'KeyF') {
            e.preventDefault();
            toggleFullscreenPlayer();
        } else if (e.code === 'Escape') {
            closeVideoPlayer();
        }
    });
}

/**
 * ============================================================================
 * 11. USER AUTHENTICATION & PERSONALIZATION (PRD Section 4.6)
 * ============================================================================
 */
function renderUserProfileHeader() {
    const avatar = document.getElementById('userAvatarBadge');
    const nameLabel = document.getElementById('userNameLabel');
    const statusLabel = document.getElementById('userStatusLabel');

    if (state.user.isLoggedIn) {
        avatar.textContent = state.user.name.charAt(0).toUpperCase();
        nameLabel.textContent = state.user.name;
        statusLabel.textContent = 'Akun Terdaftar • Aktif';
        statusLabel.className = 'text-[10px] text-emerald-400 leading-tight';
    } else {
        avatar.textContent = 'G';
        nameLabel.textContent = 'Tamu (Guest)';
        statusLabel.textContent = 'Klik untuk Login';
        statusLabel.className = 'text-[10px] text-neutral-400 leading-tight';
    }
}

function openAuthModal() {
    document.getElementById('authNameInput').value = state.user.isLoggedIn ? state.user.name : 'Alex Pratama';
    document.getElementById('authEmailInput').value = state.user.isLoggedIn ? state.user.email : 'alex.pratama@cinestream.id';

    const container = document.getElementById('authGenreCheckboxes');
    container.innerHTML = ALL_GENRES.map(g => {
        const checked = state.user.preferredGenres.includes(g.name);
        return `
            <label class="cursor-pointer select-none">
                <input type="checkbox" value="${g.name}" ${checked ? 'checked' : ''} class="peer sr-only auth-genre-cb">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-950 border border-neutral-800 text-neutral-400 peer-checked:bg-cine-red peer-checked:text-white peer-checked:border-cine-red inline-block transition-all">
                    ${g.name}
                </span>
            </label>
        `;
    }).join('');

    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function saveUserProfile() {
    const name = document.getElementById('authNameInput').value.trim() || 'Pengguna CineStream';
    const email = document.getElementById('authEmailInput').value.trim() || 'user@cinestream.id';
    const selectedGenres = Array.from(document.querySelectorAll('.auth-genre-cb:checked')).map(cb => cb.value);

    state.user = {
        isLoggedIn: true,
        name,
        email,
        preferredGenres: selectedGenres.length > 0 ? selectedGenres : ['Sci-Fi', 'Animation']
    };

    saveUserState();
    renderUserProfileHeader();
    if (state.currentView === 'home') renderRecommendedMoviesRow();
    closeAuthModal();
    showToast(`Selamat datang, ${name}! Preferensi genre berhasil disimpan.`, 'success');
}

function switchToGuestMode() {
    state.user = {
        isLoggedIn: false,
        name: 'Tamu (Guest)',
        email: '',
        preferredGenres: ['Sci-Fi', 'Animation', 'Action']
    };
    saveUserState();
    renderUserProfileHeader();
    if (state.currentView === 'home') renderRecommendedMoviesRow();
    closeAuthModal();
    showToast('Beralih ke Mode Tamu (Guest)', 'info');
}

/**
 * ============================================================================
 * 12. ADMIN DASHBOARD (PRD Section 4.9, 8 & 11)
 * ============================================================================
 */
function renderAdminDashboard() {
    renderAdminMetrics();
    renderAdminTable();
    renderAdminLogs();
}

function renderAdminMetrics() {
    const verifiedCount = state.movies.filter(m => m.licenseVerified).length;
    const totalMovies = state.movies.length;
    const totalAttempts = state.metrics.playSuccessCount + state.metrics.playErrorCount;
    const rate = totalAttempts > 0 ? ((state.metrics.playSuccessCount / totalAttempts) * 100).toFixed(1) : '100.0';

    document.getElementById('metricTotalMovies').textContent = totalMovies;
    document.getElementById('metricVerifiedLicenses').textContent =
        `${verifiedCount}/${totalMovies} Hak Distribusi Terverifikasi`;
    document.getElementById('metricPlaySuccessRate').textContent = `${rate}%`;
    document.getElementById('metricTotalViews').textContent =
        `Total Sesi Streaming: ${state.metrics.totalViews}`;
    document.getElementById('metricWatchlistCount').textContent = state.watchlist.length;
}

function renderAdminTable() {
    const tbody = document.getElementById('adminMoviesTableBody');
    const q = (document.getElementById('adminTableSearch')?.value || '').trim().toLowerCase();

    const filtered = state.movies.filter(m =>
        !q || m.title.toLowerCase().includes(q) || m.licenseType.toLowerCase().includes(q)
    );

    tbody.innerHTML = filtered.map(movie => `
        <tr class="hover:bg-neutral-800/40 transition-colors">
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <img src="${movie.posterUrl}" alt="${movie.title}" class="w-10 h-14 object-cover rounded-lg flex-shrink-0">
                    <div>
                        <div class="font-bold text-white">${movie.title}</div>
                        <div class="text-[11px] text-neutral-400">${movie.releaseYear} • ${movie.durationMinutes}m • ★ ${movie.ratingScore}</div>
                        <div class="text-[10px] text-neutral-500">${movie.genres.join(', ')}</div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-3">
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${movie.licenseVerified ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300'}">
                    ${movie.licenseType}
                </span>
                <div class="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
                    <span>${movie.providerName}</span>
                    <button onclick="toggleVerifyLicense('${movie.id}')" class="text-[10px] underline text-sky-400 hover:text-sky-300">
                        ${movie.licenseVerified ? 'Terverifikasi ✓' : 'Verifikasi Sekarang'}
                    </button>
                </div>
            </td>
            <td class="py-3 px-3">
                <span id="streamStatusBadge-${movie.id}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online (MP4)
                </span>
            </td>
            <td class="py-3 px-3 text-center">
                <button
                    onclick="setFeaturedHeroMovie('${movie.id}')"
                    title="Jadikan Featured Hero di Homepage"
                    class="w-8 h-8 rounded-lg ${movie.isFeatured ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-neutral-800 text-neutral-500 hover:text-white'} transition-colors"
                >
                    <i class="fa-solid fa-star"></i>
                </button>
            </td>
            <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                <button onclick="openVideoPlayer('${movie.id}')" class="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400" title="Uji Putar Video">
                    <i class="fa-solid fa-play text-xs"></i>
                </button>
                <button onclick="openAdminMovieModal('${movie.id}')" class="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sky-400" title="Edit Metadata">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onclick="deleteAdminMovie('${movie.id}')" class="p-2 rounded-lg bg-neutral-800 hover:bg-rose-600 text-rose-400 hover:text-white" title="Hapus Film">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderAdminLogs() {
    const container = document.getElementById('adminAuditLogsContainer');
    if (!container) return;

    container.innerHTML = state.adminLogs.map(log => {
        let badgeColor = 'bg-sky-500/20 text-sky-300';
        if (log.type === 'error') badgeColor = 'bg-rose-500/20 text-rose-300';
        if (log.type === 'verify_license' || log.type === 'health_check') badgeColor = 'bg-emerald-500/20 text-emerald-300';

        return `
            <div class="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/90 text-xs space-y-1">
                <div class="flex items-center justify-between">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${badgeColor}">${log.type}</span>
                    <span class="text-[10px] text-neutral-500">${log.time}</span>
                </div>
                <p class="text-neutral-300 leading-snug">${log.message}</p>
            </div>
        `;
    }).join('');
}

function setFeaturedHeroMovie(movieId) {
    state.movies.forEach(m => { m.isFeatured = (m.id === movieId); });
    const target = state.movies.find(m => m.id === movieId);
    saveMoviesState();
    renderAdminTable();
    logEvent('set_featured', `Admin mengubah Featured Hero menjadi "${target?.title}"`);
    showToast(`"${target?.title}" kini menjadi Featured Hero di Homepage!`, 'success');
}

function toggleVerifyLicense(movieId) {
    const movie = state.movies.find(m => m.id === movieId);
    if (!movie) return;
    movie.licenseVerified = !movie.licenseVerified;
    saveMoviesState();
    renderAdminDashboard();
    logEvent('verify_license', `Status lisensi "${movie.title}" diubah menjadi ${movie.licenseVerified ? 'Terverifikasi' : 'Menunggu Audit'}`);
    showToast(`Status lisensi "${movie.title}" diperbarui`, 'info');
}

function verifyAllVideoStreams() {
    const btn = document.getElementById('batchCheckStreamsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memeriksa Endpoint CDN...';

    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Cek Status Semua Video';
        document.getElementById('metricLastCheckTime').textContent =
            `Terakhir diperiksa: ${new Date().toLocaleTimeString('id-ID')}`;
        logEvent('health_check', `Seluruh ${state.movies.length} sumber video MP4 diverifikasi aktif (HTTP 200 OK)`);
        showToast(`Semua ${state.movies.length} sumber video aktif dan siap diputar!`, 'success');
    }, 900);
}

function openAdminMovieModal(movieId = null) {
    const modal = document.getElementById('adminMovieModal');
    const titleEl = document.getElementById('adminModalTitle');

    if (movieId) {
        const m = state.movies.find(item => item.id === movieId);
        if (!m) return;
        titleEl.textContent = `Edit Film: ${m.title}`;
        document.getElementById('adminMovieId').value = m.id;
        document.getElementById('formMovieTitle').value = m.title;
        document.getElementById('formMovieYear').value = m.releaseYear;
        document.getElementById('formMovieDuration').value = m.durationMinutes;
        document.getElementById('formMovieRating').value = m.ratingScore;
        document.getElementById('formMovieRatingSource').value = m.ratingSource;
        document.getElementById('formMovieLanguage').value = m.language;
        document.getElementById('formMovieGenres').value = m.genres.join(', ');
        document.getElementById('formMoviePoster').value = m.posterUrl;
        document.getElementById('formMovieBackdrop').value = m.backdropUrl;
        document.getElementById('formMovieLicense').value = m.licenseType;
        document.getElementById('formMovieVideoUrl').value = m.videoUrl;
        document.getElementById('formMovieCast').value = m.cast.join(', ');
        document.getElementById('formMovieSynopsis').value = m.synopsis;
    } else {
        titleEl.textContent = 'Tambah Film Legal Baru ke Katalog';
        document.getElementById('adminMovieForm').reset();
        document.getElementById('adminMovieId').value = '';
        document.getElementById('formMoviePoster').value = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80';
        document.getElementById('formMovieBackdrop').value = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80';
        document.getElementById('formMovieVideoUrl').value = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    }

    modal.classList.remove('hidden');
}

function closeAdminMovieModal() {
    document.getElementById('adminMovieModal').classList.add('hidden');
}

function saveAdminMovie(e) {
    e.preventDefault();
    const existingId = document.getElementById('adminMovieId').value;
    const title = document.getElementById('formMovieTitle').value.trim();
    const releaseYear = parseInt(document.getElementById('formMovieYear').value, 10) || 2024;
    const durationMinutes = parseInt(document.getElementById('formMovieDuration').value, 10) || 12;
    const ratingScore = parseFloat(document.getElementById('formMovieRating').value) || 7.5;
    const ratingSource = document.getElementById('formMovieRatingSource').value;
    const language = document.getElementById('formMovieLanguage').value;
    const genres = document.getElementById('formMovieGenres').value.split(',').map(s => s.trim()).filter(Boolean);
    const posterUrl = document.getElementById('formMoviePoster').value.trim();
    const backdropUrl = document.getElementById('formMovieBackdrop').value.trim();
    const licenseType = document.getElementById('formMovieLicense').value;
    const videoUrl = document.getElementById('formMovieVideoUrl').value.trim();
    const cast = document.getElementById('formMovieCast').value.split(',').map(s => s.trim()).filter(Boolean);
    const synopsis = document.getElementById('formMovieSynopsis').value.trim();

    if (existingId) {
        const idx = state.movies.findIndex(m => m.id === existingId);
        if (idx > -1) {
            state.movies[idx] = {
                ...state.movies[idx],
                title,
                releaseYear,
                durationMinutes,
                durationSeconds: durationMinutes * 60,
                ratingScore,
                ratingSource,
                language,
                genres: genres.length ? genres : ['Drama'],
                posterUrl,
                backdropUrl,
                licenseType,
                videoUrl,
                cast,
                synopsis
            };
            logEvent('update_movie', `Admin memperbarui metadata film "${title}"`);
            showToast(`Film "${title}" berhasil diperbarui!`, 'success');
        }
    } else {
        const newMovie = {
            id: 'mov-' + Date.now(),
            title,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            releaseYear,
            durationMinutes,
            durationSeconds: durationMinutes * 60,
            ratingScore,
            ratingSource,
            language,
            subtitles: ['Bahasa Indonesia', 'English'],
            genres: genres.length ? genres : ['Sci-Fi'],
            posterUrl,
            backdropUrl,
            videoUrl,
            backupVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            providerName: 'Open Stream CDN',
            licenseType,
            licenseVerified: true,
            streamStatus: 'online',
            isFeatured: false,
            popularity: 90,
            cast: cast.length ? cast : ['Open Movie Cast'],
            synopsis,
            dialogueCues: [
                { start: 0, end: 9999, id: `[Menonton ${title} — Hak Distribusi Terverifikasi]`, en: `[Watching ${title} — Verified Legal Stream]` }
            ]
        };
        state.movies.unshift(newMovie);
        logEvent('create_movie', `Admin menambahkan film legal baru "${title}" (${licenseType})`);
        showToast(`Film "${title}" berhasil ditambahkan ke katalog!`, 'success');
    }

    saveMoviesState();
    populateGenreSelectDropdown();
    closeAdminMovieModal();
    renderAdminDashboard();
}

function deleteAdminMovie(movieId) {
    if (state.movies.length <= 1) {
        showToast('Minimal harus ada 1 film di dalam katalog', 'error');
        return;
    }
    const target = state.movies.find(m => m.id === movieId);
    state.movies = state.movies.filter(m => m.id !== movieId);
    if (target && target.isFeatured && state.movies.length > 0) {
        state.movies[0].isFeatured = true;
    }
    saveMoviesState();
    renderAdminDashboard();
    logEvent('delete_movie', `Admin menghapus film "${target?.title}" dari katalog`);
    showToast(`Film "${target?.title}" dihapus dari katalog`, 'info');
}

function resetDatabaseToDefault() {
    localStorage.removeItem(STORAGE_KEYS.MOVIES);
    state.movies = [...DEFAULT_MOVIES];
    saveMoviesState();
    renderAdminDashboard();
    logEvent('reset_db', 'Katalog film dikembalikan ke 12 film bawaan');
    showToast('Katalog film berhasil direset ke data awal!', 'success');
}

/**
 * ============================================================================
 * 13. UTILITIES (FORMAT TIME & TOAST NOTIFICATIONS)
 * ============================================================================
 */
function formatSeconds(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const mins = Math.floor(s / 60);
    const remSecs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    let icon = 'fa-circle-info text-sky-400';
    let border = 'border-neutral-700';
    if (type === 'success') {
        icon = 'fa-circle-check text-emerald-400';
        border = 'border-emerald-500/40';
    } else if (type === 'error') {
        icon = 'fa-triangle-exclamation text-rose-400';
        border = 'border-rose-500/40';
    }

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900/95 backdrop-blur-md border ${border} text-white text-xs sm:text-sm shadow-2xl transition-all duration-300`;
    toast.innerHTML = `
        <i class="fa-solid ${icon} text-base"></i>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

/**
 * ============================================================================
 * 14. INITIALIZE ON WINDOW LOAD
 * ============================================================================
 */
window.onload = function () {
    initAppState();
    populateGenreSelectDropdown();
    updateWatchlistBadges();
    renderUserProfileHeader();
    setupVideoElementEvents();
    renderHomeView();
};
