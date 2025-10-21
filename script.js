document.addEventListener('DOMContentLoaded', () => {
 
    const navLink = document.getElementById('nav-link');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');  
    const carouselSlides = document.querySelectorAll('.carousel-slide');

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
        if (query === '') return;

        try {
            const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDb_API_KEY}&query=${encodeURIComponent(query)}`);
            const data = await response.json();
            // console.log(data);
            if (data.results && data.results.length > 0) {
                const movieDetails = data.results.slice(0, 5).map(movie => fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDb_API_KEY}`).then(res => res.json()));
                
                const moviesWithDetails = await Promise.all(movieDetails);
                console.log(moviesWithDetails);
            } else {
                
            }
        } catch (error) {
            console.error('Error searching for movies:', error);
        }
    }
    searchForm.addEventListener('submit', handleSearch);




 
    fetchBannerMovies();
});
