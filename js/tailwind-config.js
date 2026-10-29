/**
 * CineStream — Tailwind CSS Configuration
 */
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            colors: {
                cine: {
                    red: '#E50914',
                    redHover: '#F40612',
                    dark: '#0A0A0A',
                    card: '#141414',
                    surface: '#1F1F1F',
                    border: '#2A2A2A'
                }
            }
        }
    }
};
