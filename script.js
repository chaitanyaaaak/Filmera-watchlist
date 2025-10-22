document.addEventListener('DOMContentLoaded', () => {
 
    const navLink = document.getElementById('nav-link');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');  
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const contentArea = document.getElementById('content-area');

    let bannerMovies = [];
    let watchList = [];
    let currentBannerIndex = 0;
    let bannerInterval;

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

    async function handleSearch(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        console.log(query);
        if (!query) return;

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

   function getMovieHTML(movie) {
        return `
            <div class="movie-card">
                <div class="movie-poster movie-card-clickable" data-imdb-id="${movie.imdbID}">
                    <img src="${movie.Poster !== 'N/A' ? movie.Poster : './placeholder.svg'}" alt="${movie.Title}" class="movie-poster"/>
                </div>
                <div class="movie-details">
                    <div>
                        <div class=movie-title-rating>
                            <h3 class="movie-title movie-card-clickable" data-imdb-id="${movie.imdbID}">${movie.Title} <span class="movie-year">(${movie.Year})</span></h3>
                        </div>
                        <div class="movie-rating">
                            <span>⭐ ${movie.imdbRating || 'N/A'}</span>
                        </div>
                    </div>   
                    <div class="movie-meta">
                        <span>${movie.Runtime || 'N/A'}</span>
                        <span>${movie.Genre || 'N/A'}</span>
                    </div> 
                    <p class="movie-plot">${movie.Plot !== 'N/A' ? movie.Plot.substring(0, 150) + '...' : ""}</p>
                </div>
            </div>
        `
   }

   function renderMovies(movies) {
        const moviesHTML = movies.map(movie => getMovieHTML(movie)).join('');
        contentArea.innerHTML = `<div class="movies-grid">${moviesHTML}</div>`;
   }


 
    fetchBannerMovies();
});
