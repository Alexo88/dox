# XSS Test Suite — Khipu Codex Security A

> Abrí este archivo en Khipu Codex y verificá que **ningún** elemento activo
> se renderice. Todo debe aparecer como texto literal o no aparecer.

---

## 1. Script tag (debe desaparecer)

<script>alert("XSS-1")</script>

---

## 2. Iframe con srcdoc (debe desaparecer)

<iframe srcdoc="<script>alert('XSS-2')</script>"></iframe>

---

## 3. Object con javascript: (debe desaparecer)

<object data="javascript:alert('XSS-3')"></object>

---

## 4. Embed (debe desaparecer)

<embed src="javascript:alert('XSS-4')">

---

## 5. Form con formaction (form y botón deben desaparecer)

<form><button formaction="javascript:alert('XSS-5')">Click me</button></form>

---

## 6. Imagen con onerror (img se ve, script NO)

<img src="https://khipu.maudev.dev/does-not-exist.png" onerror="alert('XSS-6')">

---

## 7. Meta refresh (debe desaparecer)

<meta http-equiv="refresh" content="0;url=javascript:alert('XSS-7')">

---

## 8. Base hijack (debe desaparecer)

<base href="https://evil.com/">

---

## 9. Link con javascript: href (href debe removerse)

[Click para XSS](javascript:alert('XSS-9'))

---

## 10. Link externo (href se conserva, rel="noopener noreferrer" agregado)

[Link seguro](https://example.com)

---

## 11. Style tag (debe desaparecer)

<style>body { background: red; }</style>

---

## 12. SVG con onload (debe desaparecer)

<svg onload="alert('XSS-12')" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>

---

## 13. MathML (debe desaparecer)

<math><mi>x</mi><mo>=</mo><mn>5</mn></math>

---

## 14. Input (debe desaparecer)

<input type="text" value="no deberias verme">

---

## 15. Button (debe desaparecer)

<button onclick="alert('XSS-15')">No me hagas click</button>

---

## 16. Párrafo normal (NO debe desaparecer)

Este párrafo es seguro y debe verse normalmente.

**Texto en negrita**, *cursiva*, y `código` deben funcionar.