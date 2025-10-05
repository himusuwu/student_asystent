import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        sm: "2rem",
        lg: "3rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'Poppins', 'Manrope', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand-primary))",
          subtle: "hsl(var(--brand-muted))",
          emphasis: "hsl(var(--brand-emphasis))",
          glow: "hsl(var(--brand-glow))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        surface: {
          card: "hsla(var(--surface-card))",
          panel: "hsla(var(--surface-panel))",
          muted: "hsla(var(--surface-muted))",
          border: "hsla(var(--surface-border))",
          borderStrong: "hsla(var(--surface-border-strong))",
        },
      },
      borderRadius: {
        '2xl': "calc(var(--radius) + 4px)",
        xl: "var(--radius)",
        lg: "calc(var(--radius) - 2px)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'soft-lg': 'var(--shadow-soft-lg)',
        'inner-glow': '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 18px 40px -25px rgba(15, 23, 42, 0.4)',
        'glass': 'var(--shadow-soft)',
      },
      dropShadow: {
        glow: '0 8px 24px rgba(64, 126, 255, 0.35)',
      },
      backgroundImage: {
        'grid': 'linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 0), linear-gradient(180deg, rgba(148, 163, 184, 0.08) 1px, transparent 0)',
        'spotlight': 'radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 55%)',
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-emphasis)) 50%, hsl(var(--brand-glow)) 100%)',
      },
      backdropBlur: {
        xs: '8px',
        md: '12px',
        xl: '24px',
      },
      transitionTimingFunction: {
        'snappy': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'morph': 'cubic-bezier(0.77, 0, 0.18, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(28px) scale(0.96)' },
          '60%': { opacity: '0.65', transform: 'translateY(6px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.5s ease-out forwards',
        'fade-up': 'fade-up 0.7s var(--delay, 0s) cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards',
        'float': 'float 6s ease-in-out infinite',
        'scale-in': 'scale-in 0.45s ease-out forwards',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
