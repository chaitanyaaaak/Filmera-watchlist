document.addEventListener('DOMContentLoaded', () => {

    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
 
    // DOM Elements
    const navLink = document.getElementById('nav-link');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');  
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');

    let bannerMovies = [];
    let watchList = [];
    let currentBannerIndex = 0;
    let bannerInterval;

    // carousel
    async function fetchBannerMovies() {
        try {
            const response = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDb_API_KEY}&language=en-US&page=1`);
            const data = await response.json();
            // console.log(data);
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

    // search movies
    async function handleSearch(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        console.log(query);
        if (!query) return;

        renderSkeletonLoader(6);    
        try {
            const response = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDb_API_KEY}`);
            const data = await response.json();
            // console.log(data);
            if (data.Response === "True") {
                const movieDetailsPromises = data.Search.slice(0, 8).map(movie => fetch(`https://www.omdbapi.com/?i=${movie.imdbID}&apikey=${OMDb_API_KEY}`).then(res => res.json()));
                const movieWithDetails = await Promise.all(movieDetailsPromises);
                // console.log(movieWithDetails); 
                renderMovies(movieWithDetails); 
            } else {
                console.log('No movies found for the search query.');
            }
        } catch (error) {
            console.error('Error searching for movies:', error);
        }
    }
    searchForm.addEventListener('submit', handleSearch);

    // movie HTML template
   function getMovieHTML(movie) {
        return `
            <div class="movie-card">
                <div class="movie-poster-wrapper movie-card-clickable" data-imdb-id="${movie.imdbID}">
                    <img src="${movie.Poster !== 'N/A' ? movie.Poster : './placeholder.svg'}" alt="${movie.Title}" class="movie-poster"/>
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
                        <button class="action-btn" data-movie-id="${movie.imdbID}">Add to Watchlist</button>
                    </div>
                </div>
            </div>`;
   }

    // Render movies function
   function renderMovies(movies, apiType) {

    let moviesHTML = '';
    if (apiType === 'tmdb') {
        moviesHTML = movies.map(movie => getMovieHTML_TMDb(movie)).join('');
    } else {
        moviesHTML = movies.map(movie => getMovieHTML(movie)).join('');
    } 
     
    contentArea.innerHTML = `<div class="movie-grid">${moviesHTML}</div>`;
   }

    // Display popular movies on load
   async function displayPopularMovies() {
        renderSkeletonLoader(15);
        try {
            const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDb_API_KEY}&language=en-US&page=1`);
            const data = await response.json();
            // console.log(data);

            if (data.results && data.results.length > 0) {
                const popularMoviesPromises = data.results.slice(0, 15).map(movie => fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDb_API_KEY}`).then(res => res.json()));
                const popularMovies = await Promise.all(popularMoviesPromises);
                renderMovies(popularMovies, 'tmdb');
            }
        } catch (error) {
            console.error('Error fetching popular movies:', error);
        }
   }

    // TMDb movie HTML template
    function getMovieHTML_TMDb(movie) {

        const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}w200${movie.poster_path}` : './placeholder.svg';
        const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
        const genres = movie.genres ? movie.genres.map(genre => genre.name).join(', ') : 'N/A';
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

        return `
            <div class="movie-card" data-movie-id="${movie.imdb_id}">
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
                        <button class="action-btn" data-movie-id="${movie.imdbID}">Add to Watchlist</button>
                    </div>
                </div>
            </div>`;
    }

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

    function handleNavigation() {
        const targetView = navLink.dataset.view;
        if (targetView === 'watchlist') {
            currentView = 'watchlist';
            pageTitle.textContent = 'My Watchlist';
            navLink.textContent = 'Search Movies';
            navLink.dataset.view = 'search';
            searchForm.classList.add('hidden');
        } else {
            currentView = 'search';
            pageTitle.textContent = 'Filmera';
            navLink.textContent = 'My Watchlist';
            navLink.dataset.view = 'watchlist';
            searchForm.classList.remove('hidden');
            displayPopularMovies();
        }
    }

    function eventListeners() {
        searchForm.addEventListener('submit', handleSearch);
        navLink.addEventListener('click', handleNavigation);
    }

    function init() {
        fetchBannerMovies();
        eventListeners();
        displayPopularMovies();
    }

    init();
});
