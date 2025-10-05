# 🎨 Premium Design - Quick Reference

## Najważniejsze klasy Tailwind do użycia

### 🎯 Kolory i Gradienty

```tsx
// Gradient text
className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"

// Gradient background
className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"

// Gradient button
className="bg-gradient-to-r from-blue-500 to-purple-600"
```

### 💎 Glassmorphism

```tsx
// Premium card
className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60"

// Glassmorphism button
className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl"
```

### ✨ Shadows & Borders

```tsx
// Soft shadow
className="shadow-soft hover:shadow-soft-lg"

// Glow effect
className="shadow-glow hover:shadow-glow-lg"

// Premium shadow
className="shadow-premium"

// Rounded corners
className="rounded-2xl"  // 1rem
className="rounded-3xl"  // 1.5rem
className="rounded-4xl"  // 2rem
```

### 🎬 Animacje

```tsx
// Framer Motion - podstawowe
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Hover effects
<motion.div
  whileHover={{ scale: 1.03, y: -4 }}
  whileTap={{ scale: 0.98 }}
>

// Stagger children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Item 1</motion.div>
  <motion.div variants={itemVariants}>Item 2</motion.div>
</motion.div>
```

### 🎨 Komponenty Premium

#### Card Premium
```tsx
<div className="rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:scale-[1.02]">
  {/* Content */}
</div>
```

#### Button Premium
```tsx
<button className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold shadow-glow hover:shadow-glow-lg hover:scale-105 transition-all duration-300">
  Click me
</button>
```

#### Input Premium
```tsx
<input className="w-full px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300" />
```

### 📱 Responsive Design

```tsx
// Mobile first
className="text-sm sm:text-base md:text-lg lg:text-xl"

// Grid responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"

// Hide on mobile
className="hidden lg:block"

// Show only on mobile
className="lg:hidden"
```

### 🌈 Theme-aware styling

```tsx
// Light/Dark adaptive
className="bg-white dark:bg-slate-900"
className="text-slate-900 dark:text-white"
className="border-slate-200 dark:border-slate-700"
```

---

## 🎯 Common Patterns

### Hero Section
```tsx
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-center py-12"
>
  <h1 className="text-4xl md:text-6xl font-display font-extrabold mb-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
    Title
  </h1>
  <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
    Description
  </p>
</motion.div>
```

### Stats Card
```tsx
<motion.div
  whileHover={{ scale: 1.03, y: -4 }}
  className="rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300"
>
  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl mb-4">
    📊
  </div>
  <div className="text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">
    156
  </div>
  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
    Label
  </div>
</motion.div>
```

### Action Card
```tsx
<motion.div whileHover={{ scale: 1.03, y: -6 }}>
  <Link
    to="/path"
    className="block rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300"
  >
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-3xl mb-5 shadow-glow">
      🚀
    </div>
    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
      Title
    </h3>
    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
      Description
    </p>
  </Link>
</motion.div>
```

---

## 🎨 Custom CSS Classes dostępne w styles.css

```css
.glassmorphism              /* Glassmorphism effect */
.gradient-text              /* Gradient text */
.gradient-border            /* Gradient border */
.card-enhanced              /* Premium card styling */
.animate-fadeIn             /* Fade in animation */
.animate-fadeInUp           /* Fade in up animation */
.animate-slideUp            /* Slide up animation */
.animate-scaleIn            /* Scale in animation */
```

---

## 📏 Spacing Scale

```
px-4   = 1rem    (16px)
px-5   = 1.25rem (20px)
px-6   = 1.5rem  (24px)
px-8   = 2rem    (32px)
px-10  = 2.5rem  (40px)

py-3   = 0.75rem (12px)
py-4   = 1rem    (16px)
py-6   = 1.5rem  (24px)
py-8   = 2rem    (32px)
py-12  = 3rem    (48px)

gap-4  = 1rem    (16px)
gap-6  = 1.5rem  (24px)
gap-8  = 2rem    (32px)
```

---

## 🎭 Transition Timing

```tsx
// Quick (buttons, hover)
duration-300

// Standard (cards, modals)
duration-400

// Slow (page transitions)
duration-500

// Bezier curve (smooth, premium feel)
ease-out
cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 💡 Pro Tips

1. **Zawsze używaj backdrop-blur z przezroczystością** dla glassmorphism
2. **Stack shadows** dla depth: używaj `shadow-soft` + `hover:shadow-soft-lg`
3. **Animate scale z translateY** dla "lift" effect: `hover:scale-[1.02] hover:-translate-y-1`
4. **Gradient overlay** dla interactive cards:
   ```tsx
   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 hover:opacity-100 transition-opacity" />
   ```
5. **Stagger animations** dla list items (delay increment 0.05-0.1s)
6. **Use motion.div dla wszystkich animowanych elementów** - lepsze performance niż CSS animations

---

Gotowe! 🚀
