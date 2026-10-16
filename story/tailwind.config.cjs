module.exports = {
        theme: {
          extend: {
            colors: {
              // Deep Space / Midnight Palette (Darker, richer bases)
              ink: {
                950: '#020617', // Deepest background
                900: '#0f172a', // Card background (Deep Blue)
                800: '#1e293b', // Lighter background
                700: '#334155', // Borders
                600: '#475569', // Muted text
              },
              // Text colors - Warm off-whites
              parchment: {
                100: '#fffbeb', // Warmer white
                200: '#fef3c7', // Pale yellow-white
                300: '#e2e8f0', // Cool gray for contrast
                400: '#94a3b8',
              },
              // "Spirit" - Vivid Cyan/Electric Blue (Qi/Magic)
              spirit: {
                50: '#ecfeff',
                100: '#cffafe',
                200: '#a5f3fc',
                300: '#67e8f9',
                400: '#22d3ee',
                500: '#06b6d4', // Main Neon Cyan
                600: '#0891b2',
                700: '#0e7490',
                800: '#155e75',
                900: '#164e63',
              },
              // "Arcane" - Vivid Violet/Neon Purple (Mystery/Dao)
              arcane: {
                300: '#d8b4fe',
                400: '#c084fc',
                500: '#a855f7', // Main Neon Purple
                600: '#9333ea',
                700: '#7e22ce',
                900: '#581c87',
              },
              // "Gold" - Vivid Amber/Gold (Royalty/Divine/Success)
              gold: {
                100: '#fef9c3',
                200: '#fde047',
                300: '#facc15',
                400: '#eab308',
                500: '#e1b303', // Rich Gold
                600: '#ca8a04',
                700: '#a16207',
                800: '#854d0e',
                900: '#713f12',
              },
              // "Crimson" - Vivid Red/Pink (Danger/Combat/Risk)
              crimson: {
                400: '#fb7185',
                500: '#f43f5e', // Neon Rose
                600: '#e11d48',
                700: '#be123c',
                900: '#881337',
              },
              // "Jade" - Vivid Green (Safety/Growth)
              jade: {
                400: '#4ade80',
                500: '#22c55e', // Neon Green
                600: '#16a34a',
                900: '#064e3b',
              }
            },
            fontFamily: {
              serif: ['Merriweather', 'serif'],
              display: ['Playfair Display', 'serif'], 
              sans: ['Roboto', 'sans-serif'],
              mono: ['Source Code Pro', 'monospace'],
              cursive: ['Dancing Script', 'cursive'],
            },
            animation: {
              'fade-in': 'fadeIn 0.6s ease-out forwards',
              'slide-up': 'slideUp 0.4s ease-out forwards',
              'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              'float': 'float 6s ease-in-out infinite',
              'spin-slow': 'spin 12s linear infinite',
              'glow': 'glow 2s ease-in-out infinite alternate',
              'shimmer': 'shimmer 3s linear infinite',
              'page-enter': 'pageEnter 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
              },
              slideUp: {
                '0%': { transform: 'translateY(20px)', opacity: '0' },
                '100%': { transform: 'translateY(0)', opacity: '1' },
              },
              float: {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
              },
              glow: {
                '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.2)' },
                '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), 0 0 10px rgba(6, 182, 212, 0.4)' }
              },
              shimmer: {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' }
              },
              pageEnter: {
                '0%': { opacity: '0', transform: 'translateY(15px) scale(0.98)' },
                '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
              }
            }
          }
        }
      };
module.exports.content = ["./story/**/*.{tsx,ts}", "./shared/**/*.{tsx,ts}"];
