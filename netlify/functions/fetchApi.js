import fetch from 'node-fetch';

const TMDb_API_KEY = process.env.TMDb_API_KEY;
const OMDb_API_KEY = process.env.OMDb_API_KEY;

const TMDb_BASE_URL = 'https://api.themoviedb.org/3';
const OMDb_BASE_URL = 'https://www.omdbapi.com/';

export const handler = async function(event) {

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
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

    if (!OMDb_API_KEY || !TMDb_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'API keys are not configured properly' }),
        };
    }

    const {action, params} = body;
    let url;

    try {
        switch(action) {
            case 'getBanners': 
                url = `${TMDb_BASE_URL}/movie/now_playing?api_key=${TMDb_API_KEY}&language=en-US&page=1`;
                break;

            case 'getPopular': 
                url = `${TMDb_BASE_URL}/movie/popular?api_key=${TMDb_API_KEY}&language=en-US&page=1`;
                break;

            case 'getMovieDetailsByTMDb': 
                url = `${TMDb_BASE_URL}/movie/${params.id}?api_key=${TMDb_API_KEY}&language=en-US`;
                break;

            case 'searchMoviesOMDb':
                url = `${OMDb_BASE_URL}/?apikey=${OMDb_API_KEY}&s=${encodeURIComponent(params.query)}`;
                break;

            case 'getMovieDetailsByOMDb': 
                url = `${OMDb_BASE_URL}/?apikey=${OMDb_API_KEY}&i=${params.id}`;
                break;

            default: 
                throw new Error('Invalid action specified');
        }
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    } 

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error fetching from external API:', errorData);
            return {
                statusCode: response.status,
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
        console.error('Fetch error:', error);
        return {
            statusCode: 500,
            headers, 
            body: JSON.stringify({ error: error.message })
        };
    }
};