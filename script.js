document.addEventListener('DOMContentLoaded', () => {

    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
    const API_PROXY_URL = '/.netlify/functions/fetch-movie';
 
    // DOM Elements
    const navLink = document.getElementById('nav-link');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');  
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    const movieModal = document.getElementById('movie-modal');
    const modalContent = document.getElementById('modal-content');
    const toastContainer = document.getElementById('toast-container');
    
    let bannerMovies = [];
    let watchlist = [];
    let currentView = 'search'; 
    let currentBannerIndex = 0;
    let bannerInterval;

    async function fetchFromApiProxy(action, params = {}) {
        try {
            const response = await fetch(API_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({action, ...params}),
            });

            if (!response.ok) {
                let errMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errMsg = errorData.error || errMsg;
                } catch {
                    // Ignore JSON parse errors
                }
                throw new Error(errMsg);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error in API proxy for action ${action}:`, error);
            showToast(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    // Initialization
    function init() {
        fetchBannerMovies();
        displayPopularMovies();
        eventListeners();
        loadWatchlist();
    }
    
    // carousel (tmdb)
    async function fetchBannerMovies() {
        try {
            // const response = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDb_API_KEY}&language=en-US&page=1`);
            const data = await fetchFromApiProxy('getBanners');
            bannerMovies = data.results.filter(movie => movie.backdrop_path).slice(0, 18);
            if (bannerMovies.length > 0 ) startBannerCarousel();
        } catch (error) {
            console.error('Error fetching banner movies:', error);
        }
    }

    function startBannerCarousel() {
        if (bannerMovies.length === 0) return;
        carouselSlides[0].style.backgroundImage = `url(https://image.tmdb.org/t/p/original${bannerMovies[0].backdrop_path})`;
        if (bannerMovies.length > 1) {
            bannerInterval = setInterval(changeBannerImage, 5000);
        }
    }

    function changeBannerImage() {
        currentBannerIndex++;
        if (currentBannerIndex >= bannerMovies.length) {
            currentBannerIndex = 0;
        }
        const activeSlide = document.querySelector('.carousel-slide.active');
        const nextSlide = document.querySelector('.carousel-slide:not(.active)');
        nextSlide.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${bannerMovies[currentBannerIndex].backdrop_path})`;
        activeSlide.classList.remove('active');
        nextSlide.classList.add('active');
    }

    // Display popular movies on load
   async function displayPopularMovies() {
        renderSkeletonLoader(10);
        try {
            // const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDb_API_KEY}&language=en-US&page=1`);
            const data = await fetchFromApiProxy('getPopularMovies');
            // console.log(data);
 
            if (data.results && data.results.length > 0) {
                const popularMoviesPromises = data.results.slice(0, 15).map(movie => fetchFromApiProxy('getMovieDetailsByTMDb', { id: movie.id }));
                const popularMovies = await Promise.all(popularMoviesPromises);
                renderMovies(popularMovies, 'tmdb');
            } else {
                renderPlaceholder('no-results', 'No popular movies found.', 'Please try again later.');
            }
        } catch (error) {
            console.error('Error fetching popular movies:', error);
            renderPlaceholder('error', 'Something went wrong.', 'Could not fetch popular movies. Please check your connection and try again.');
        }
   }

   // search movies
   async function handleSearch(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        console.log(query);
        if (!query) return;

        renderSkeletonLoader(6);    
        try {
            const data = await fetchFromApiProxy('searchMovies', { query });
            if (data.Response === "True") {
                const movieDetailsPromises = data.Search.slice(0, 8).map(movie => fetchFromApiProxy('getMovieDetailsByOMDb', { id: movie.imdbID }));
                const movieWithDetails = await Promise.all(movieDetailsPromises);
                renderMovies(movieWithDetails); 
            } else {
                renderPlaceholder('no-results', 'Unable to find what you’re looking for.', 'Please try another search.');
            }
        } catch (error) {
            console.error('Error searching for movies:', error);
            renderPlaceholder('error', 'Something went wrong.', 'Could not fetch movie data. Please check your connection and try again.');
        }
    }
    
    // setup event listeners
    function eventListeners() {
        searchForm.addEventListener('submit', handleSearch);
        navLink.addEventListener('click', handleNavigation);
        document.addEventListener('click', handleClicks);
    }
    
    function handleClicks(e) {
        const imdbId = e.target.closest('[data-movie-id]')?.dataset.movieId;
 
        if (e.target === movieModal || e.target.closest('.close-modal-btn')) {
            closeMovieModal();
        }
 
        if (!imdbId) return;
 
        if (e.target.closest('.add-btn')) addToWatchlist(imdbId);
        else if (e.target.closest('.remove-btn')) removeFromWatchlist(imdbId);
        else if (e.target.closest('.watched-toggle')) toggleWatched(imdbId);
        else if (e.target.closest('.movie-card-clickable')) openMovieModal(imdbId);
        else if (e.target.closest('.save-rating-btn')) {
            const rating = document.querySelector(`#modal-rating-${imdbId} input[type='radio']:checked`)?.value;
            const notes = document.getElementById(`modal-notes-${imdbId}`).value;
            updateMovieDetails(imdbId, rating ? parseInt(rating) : null, notes);
            closeMovieModal();
            showToast('Details saved successfully!', 'success');
        }
    }
    
    // Navigating between views
    function handleNavigation() {
        const targetView = navLink.dataset.view;
        if (targetView === 'watchlist') {
            currentView = 'watchlist';
            pageTitle.textContent = 'My Watchlist';
            navLink.textContent = 'Search Movies';
            navLink.dataset.view = 'search';
            searchForm.classList.add('hidden');
            renderWatchlist();
        } else {
            currentView = 'search';
            pageTitle.textContent = 'Filmera';
            navLink.textContent = 'My Watchlist';
            navLink.dataset.view = 'watchlist';
            searchForm.classList.remove('hidden');
            displayPopularMovies();
        }
    }

    // My watchlist logic
    async function addToWatchlist(imdbId) {
        try {
            // const response = await fetch(`https://www.omdbapi.com/?apikey=${OMDb_API_KEY}&i=${imdbId}`);
            const movieData = await fetchFromApiProxy('getMovieDetailsByOMDb', { id: imdbId });

            if (movieData.Response === 'True') {
                movieData.isWatched = false;
                movieData.rating = null;
                movieData.notes = '';
                watchlist.unshift(movieData);
                saveWatchlist();
                showToast(`${movieData.Title} added to your watchlist!`, 'success');
            
                if (currentView === 'search') {
                    const button = document.querySelector(`.add-btn[data-movie-id="${imdbId}"]`);
                    if (button) {
                        button.innerHTML = `
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            Added to Watchlist`;
                        button.disabled = true;
                    }
                } 
            } else {
                showToast('Could not fetch movie details to add.', 'error');
            }
        } catch (error) {
            console.error('Error adding movie to watchlist:', error);
            showToast('An error occurred while adding the movie.', 'error');
        }
    }

    function removeFromWatchlist(imdbId) {
        const movieTitle = watchlist.find(movie => movie.imdbID == imdbId)?.Title;
        watchlist = watchlist.filter(movie => movie.imdbID != imdbId);
        saveWatchlist();
        showToast(`${movieTitle} removed from your watchlist.`, 'error');
        if (currentView === 'watchlist') renderWatchlist();
    }

    function toggleWatched(imdbId) {
        const movie = watchlist.find(m => m.imdbID === imdbId);
        if (movie) {
            movie.isWatched = !movie.isWatched;
            saveWatchlist();
            showToast(`${movie.Title} marked as ${movie.isWatched ? 'watched' : 'unwatched'}.`, 'info');
            if (currentView === 'watchlist') renderWatchlist();
        }
    }

    function updateMovieDetails(imdbId, rating, notes) {
        const movie = watchlist.find(m => m.imdbID === imdbId);
        if (movie) {
            movie.rating = rating;
            movie.notes = notes;
            saveWatchlist();
            if (currentView === 'watchlist') renderWatchlist();
        }
    }

    // save and load watchlist from localStorage
    function saveWatchlist() {
        localStorage.setItem('movieWatchlist', JSON.stringify(watchlist));
    }
 
    function loadWatchlist() {
        const storedWatchlist = localStorage.getItem('movieWatchlist');
        if (storedWatchlist) {
            watchlist = JSON.parse(storedWatchlist);
        }
    }
    
    // Render functions
    function renderMovies(movies, apiType) {

      let moviesHTML = '';
      if (apiType === 'tmdb') {
          moviesHTML = movies.map((movie, index) => getMovieHTML_TMDb(movie, index)).join('');
       } else {
           moviesHTML = movies.map((movie, index) => getMovieHTML(movie, false, index)).join('');
       }  
       contentArea.innerHTML = `<div class="movie-grid">${moviesHTML}</div>`;
   }

   function renderWatchlist() {
        if (watchlist.length > 0) {
            const moviesHTML = watchlist.map(movie => getMovieHTML(movie, true)).join('');
            contentArea.innerHTML = `<div class="movie-grid">${moviesHTML}</div>`;
        } else {
            renderPlaceholder('empty-watchlist', 'Your watchlist is looking a little empty...', `
                <button onclick="document.getElementById('nav-link').click()" style="color: var(--accent-color); font-weight: 700; display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Start adding some movies to keep track of them here.
                </button>`);
        }
    }

    // movie HTML template (omdb)
    function getMovieHTML(movie, isWatchlist = false, index = 0) {
        
        const isAlreadyInWatchlist = watchlist.some(m => m.imdbID === movie.imdbID);
        const watchedClass = movie.isWatched && isWatchlist ? 'watched-movie' : '';
        
        return `
            <div class="movie-card ${watchedClass}" data-movie-id="${movie.imdbID}" style="--animation-delay: ${index * 200}ms;">
                <div class="movie-poster-wrapper movie-card-clickable" data-imdb-id="${movie.imdbID}">
                    <img src="${movie.Poster !== 'N/A' ? movie.Poster : './assets/placeholder.svg'}" alt="${movie.Title}" class="movie-poster"/>
                </div>
                <div class="movie-details">
                    <div>
                        <div class="movie-title-rating">
                            <h3 class="movie-title movie-card-clickable" data-imdb-id="${movie.imdbID}">${movie.Title} <span class="movie-year">(${movie.Year})</span></h3>
                            <div class="movie-rating">
                                <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${movie.imdbRating || 'N/A'}</span>
                            </div>
                        </div>   
                        <div class="movie-meta">
                            <span>${movie.Runtime || 'N/A'}</span>
                            <span>${movie.Genre || 'N/A'}</span>
                        </div> 
                        <p class="movie-plot">${movie.Plot !== 'N/A' ? movie.Plot.substring(0, 150) + '...' : ""}</p>
                    </div>
                    <div class="movie-actions">
                        ${isWatchlist ? `
                            <div class="watchlist-actions">
                                <button class="action-btn watched-toggle ${movie.isWatched ? 'watched' : ""}" data-movie-id="${movie.imdbID}">
                                    ${movie.isWatched ? `
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Watched</span>` : `
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    <span>Mark as Watched</span>`}
                                </button>
                                <button class="action-btn remove-btn" data-movie-id="${movie.imdbID}">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>Remove
                                </button>
                            </div> 
                            `: `
                            <button class="action-btn add-btn" data-movie-id="${movie.imdbID}" 
                            ${isAlreadyInWatchlist ? 'disabled' : ""}>
                                ${isAlreadyInWatchlist ? `
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                Added to Watchlist` : `  
                                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                 Add to Watchlist`}
                            </button>
                        `}
                    </div>
                </div>
            </div>`;
   }

    // TMDb movie HTML template
    function getMovieHTML_TMDb(movie, index = 0) {
        
        const isAlreadyInWatchlist = watchlist.some(m => m.imdbID === movie.imdb_id);
        
        const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}w200${movie.poster_path}` : './assets/placeholder.svg';
        const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
        const genres = movie.genres ? movie.genres.map(genre => genre.name).join(', ') : 'N/A';
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        return `
            <div class="movie-card" data-movie-id="${movie.imdb_id}" style="--animation-delay: ${index * 150}ms;">
                <div class="movie-poster-wrapper movie-card-clickable" data-movie-id="${movie.imdb_id}">
                    <img src="${posterPath}" alt="${movie.title} poster" class="movie-poster"/>
                </div>
                <div class="movie-details">
                    <div>
                        <div class="movie-title-rating">
                            <h3 class="movie-title movie-card-clickable" data-imdb-id="${movie.imdb_id}">${movie.title} <span class="movie-year">(${releaseYear})</span></h3>
                            <div class="movie-rating">
                                <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${rating}</span>
                            </div>
                        </div>   
                        <div class="movie-meta">
                            <span>${runtime}</span>
                            <span>${genres}</span>
                        </div> 
                        <p class="movie-plot">${movie.overview ? movie.overview.substring(0, 100) + '...' : ""}</p>
                    </div>
                    <div class="movie-actions">
                        <button class="action-btn add-btn" data-movie-id="${movie.imdb_id}" ${isAlreadyInWatchlist ? 'disabled' : ""}>
                            ${isAlreadyInWatchlist ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            Added to Watchlist` 
                            :  
                            `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            Add to Watchlist`}
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // Render skeleton loader
    function renderSkeletonLoader(count = 3) {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="movie-card">
                    <div class="skeleton skeleton-poster"></div>
                    <div class="skeleton-details">
                        <div>
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-meta"></div>
                            <div class="skeleton skeleton-plot"></div>
                        </div>
                        <div class="skeleton skeleton-button"></div>
                    </div>
                </div> `;
        }
        contentArea.innerHTML = `<div class="movie-grid">${skeletonHTML}</div>`
    }

    // Placeholder HTML
    function getPlaceholderHTML(type, title, subtitle) {
        const icons = {
            'no-results' : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            'empty-watchlist' : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`,
            'error' : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        };
        return `
            <div class="placeholder">
                ${icons[type] || ''}
                <h2>${title}</h2>
                <p>${subtitle}</p>
            </div>`;
    }

    function renderPlaceholder(type, title, subtitle) {
        contentArea.innerHTML = getPlaceholderHTML(type, title, subtitle);
    }

    // Movie Modal Logic
    async function openMovieModal(imdbId) {
        let movie = watchlist.find(m => m.imdbID === imdbId);

        if (!movie) {
            try {
                movie = await fetchFromApiProxy('getMovieDetailsByOMDb', { id: imdbId });
                if (movie.Response !== 'True') {
                    showToast('Could not fetch movie details.', 'error');
                    return;
                } 
            }  catch (error) {
                console.error('Error fetching movie details:', error);
                showToast('An error occurred while fetching movie details.', 'error');
                return;
            } 
        } 

        const inWatchlist = watchlist.some(m => m.imdbID === imdbId);
        const ratingsHTML = [5, 4, 3, 2, 1].map(star => `
                <input type="radio" id="star-${star}-${movie.imdbID}" name="rating" value="${star}" ${movie.rating === star ? 'checked' : ''} />
                <label for="star-${star}-${movie.imdbID}" title="${star} stars">★</label>
            `).join('');

            modalContent.innerHTML = `
                <div class="modal-body">
                    <div class="modal-header">
                        <h2 class="modal-title">${movie.Title}</h2>
                        <button class="close-modal-btn">&times;</button>
                    </div>

                    <p class="modal-meta">${movie.Year} &bull; ${movie.Rated} &bull; ${movie.Runtime}</p>
                    <p class="modal-plot">${movie.Plot}</p>
                    <p class="modal-genre"><strong style="color: var(--accent-color);">Genre:</strong> ${movie.Genre}</p>
                    <p class="modal-director"><strong style="color: var(--accent-color);">Director:</strong> ${movie.Director}</p>
                    <p class="modal-actors"><strong style="color: var(--accent-color);">Actors:</strong> ${movie.Actors}</p>

                    ${inWatchlist ? `
                        <div class="watchlist-details">
                            <h3 class="watchlist-head">Your Rating & Notes</h3>
                            <div id="modal-rating-${movie.imdbID}" class="rating-group" style="margin-bottom: 8px;">${ratingsHTML}</div>
                            <textarea id="modal-notes-${movie.imdbID}" class="notes-textarea" rows="4" placeholder="Add personal notes">${movie.notes || ''}</textarea>
                            <button class="save-rating-btn modal-save-btn" data-movie-id="${movie.imdbID}">Save Details</button>
                        </div>
                        ` : `
                            <p class="watchlist-empty-modal">Add this movie to your watchlist to rate it and add personal notes.</p>
                    `}
                </div>`;

        movieModal.classList.remove('hidden');
    }

    function closeMovieModal() {
        movieModal.classList.add('hidden');
        modalContent.innerHTML = '';
    }

    // Toast Notification
    function showToast(message, type = "success", duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }

    init();
});
