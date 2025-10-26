import fetch from 'node-fetch';

const TMDb_API_KEY = process.env.TMDb_API_KEY;
const OMDb_API_KEY = process.env.OMDb_API_KEY;

const TMDb_BASE_URL = 'https://api.themoviedb.org/3';
const OMDb_BASE_URL = 'https://www.omdbapi.com/';

export const handler = async function(event, context) {

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://filmera-watchlist.netlify.app/',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers, 
            body: JSON.stringify({error: 'Bad Request' }),
        }
    }

    const {action, query, id} = body;
    let url;

    switch(action) {
        case 'getBanners': 
            url = `${TMDb_BASE_URL}/movie/now_playing?api_key=${TMDb_API_KEY}&language=en-US&page=1`;
            break;

        case 'getPopularMovies': 
            url = `${TMDb_BASE_URL}/movie/popular?api_key=${TMDb_API_KEY}&language=en-US&page=1`;
            break;

        case 'getMovieDetailsByTMDb': 
            url = `${TMDb_BASE_URL}/movie/${id}?api_key=${TMDb_API_KEY}&language=en-US`;
            break;

        case 'searchMovies':
            url = `${OMDb_BASE_URL}/?apikey=${OMDb_API_KEY}&s=${encodeURIComponent(query)}`;
            break;

        case 'getMovieDetailsByOMDb': 
            url = `${OMDb_BASE_URL}/?apikey=${OMDb_API_KEY}&i=${id}`;
            break;

        default: 
            return {
                statusCode: 400,
                headers, 
                body: JSON.stringify({error: 'Invalid Action' })
            };
    }       

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({error: 'Failed to fetch from external API' })
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers, 
            body: JSON.stringify({ error: error.message })
        };
    }
};