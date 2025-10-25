# Movie Watchlist App

A clean, modern, and fully responsive single-page application for searching, saving, and rating movies. This app is built from scratch with 100% vanilla HTML, CSS, and modern ES6+ JavaScript, with no frameworks or libraries.

It uses a hybrid approach by integrating two separate movie APIs:

- **TMDb (The Movie Database)**: For the dynamic header carousel and fetching popular movies.
- **OMDb (The Open Movie Database)**: For the detailed search functionality and robust movie data.

## Live Demo

Check out the live working demo: [Filmera-watchlist](https://filmera-watchlist.netlify.app/)

## Features

- **Dual API Integration**: Uses TMDb for discovery and OMDb for detailed search.
- **Dynamic Header**: A fading carousel of "Now Playing" movies on page load.
- **Popular Movies**: Greets the user with a list of popular movies instead of an empty state.
- **Persistent Watchlist**: Saves your watchlist to `localStorage` so your movies are always there.
- **Rate & Watch**: Mark movies as "watched" and give them a 1-5 star rating.
- **Note**: You can add personal notes or thoughts for each movie in your watchlist.
- **Modern UI/UX**:
  - Clean, mobile-first design.
  - Smooth "fade-in" animations on page load and search.
  - Modal pop-up for detailed movie info.
  - Toast notifications for user feedback.
  - Skeleton loader for a professional loading state.

## Tech Stack

- **HTML5** (Semantic)
- **CSS3** (Custom Properties, Flexbox, Grid, Animations)
- **Vanilla JavaScript (ES6+)** (Async/Await, fetch, Event Delegation, localStorage)

