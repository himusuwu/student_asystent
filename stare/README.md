# Asystent Studenta (MVP)

> 🎨 **NEW!** Premium Design Update 2025 - Aplikacja została całkowicie przeprojektowana z nowoczesnym, premium UI/UX inspirowanym Linear, Notion, Quizlet, i Stripe. Zobacz [DESIGN_UPDATES.md](DESIGN_UPDATES.md) dla szczegółów.

Prywatna PWA do transkrypcji wykładów, generowania notatek, fiszek SRS i sprawdzianów.

## ✨ Nowy Design 2025

- 🎯 **Glassmorphism** - Przezroczyste karty z backdrop-blur
- 🌈 **Gradient System** - Profesjonalne gradienty (blue→purple→pink)
- ⚡ **Framer Motion** - Płynne animacje i micro-interactions
- 🎨 **Premium Typography** - Inter + Manrope fonts
- 🌓 **Enhanced Dark Mode** - Smooth transitions i optymalna paleta
- 📱 **Perfect Mobile UX** - Spring animations, touch-optimized

**Zobacz dokumentację**:
- [DESIGN_UPDATES.md](DESIGN_UPDATES.md) - Pełny opis zmian
- [DESIGN_COMPARISON.md](DESIGN_COMPARISON.md) - Porównanie przed/po
- [DESIGN_QUICK_REFERENCE.md](DESIGN_QUICK_REFERENCE.md) - Quick reference dla deweloperów

## Kluczowe założenia
- Audio i prezentacje nie trafiają do chmury. Po transkrypcji audio jest automatycznie usuwane lokalnie.
- Do chmury (prywatne repo GitHub) trafiają tylko pliki tekstowe: notatki MD, JSON fiszek, bank pytań.
- Działa offline jako PWA; synchronizacja uruchamiana, gdy jest internet.

## Szybki start
1. Zainstaluj zależności.
2. Uruchom tryb deweloperski.
3. Otwórz http://localhost:5173

## Struktura
- React + Vite + TypeScript + PWA
- IndexedDB lokalnie (audio/PDF/PPTX cache tymczasowy)
- Synchronizacja do GitHub (do dodania)

## Prywatność
Audio jest przetwarzane lokalnie i usuwane po transkrypcji. Upewnij się, że w Ustawieniach włączone jest auto-usuwanie.

## Uruchomienie

- Wymagania: Node 18+
- Instalacja: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`

### 🚀 Backend lokalny (opcjonalnie - zalecane!)

Dla lepszej wydajności możesz uruchomić lokalny backend do transkrypcji:

```bash
cd server
npm install
npm start
```

Backend uruchomi się na `http://localhost:3001`. Aplikacja automatycznie go wykryje i użyje.

**Zalety backendu:**
- ✅ Strona nie zawiesza się podczas transkrypcji
- ✅ Szybsza transkrypcja (lepsze wykorzystanie CPU)
- ✅ Możesz pracować w aplikacji podczas przetwarzania audio

Więcej w [server/README.md](server/README.md)

## Użycie (skrót)

1. Dodaj przedmiot i utwórz sesję lub przejdź do „Nowa notatka” i wybierz przedmiot.
2. Wgraj audio i/lub prezentację (działa też drag & drop) albo wklej czysty tekst.
3. Aplikacja transkrybuje audio lokalnie (stub), usuwa audio, generuje notatki, fiszki i bank pytań.
4. Ucz się we „Fiszki”, generuj „Sprawdziany” z seedem. Pobierz .md lub drukuj do PDF.
5. W „Ustawieniach” skonfiguruj prywatne repo GitHub i synchronizuj tylko tekst.