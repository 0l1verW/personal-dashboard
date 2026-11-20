#!/usr/bin/env python3
"""Baut Ernaehrung.html aus style.css, body.html, foods.js und app1–3.js (Logik · Ansichten · Blatt/Ereignisse) (eine eigenständige Datei)."""
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
r = lambda n: open(os.path.join(D, n), encoding='utf-8').read()
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, 'Ernaehrung.html')
html = f'''<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#128A4A">
<title>Ernährung</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&amp;family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap" rel="stylesheet">
<style>
{r('style.css')}</style>
</head>
<body>
{r('body.html')}
<script>
{r('foods.js')}
{r('app1.js')}
{r('app2.js')}
{r('app3.js')}</script>
</body></html>
'''
open(out, 'w', encoding='utf-8').write(html)
print('gebaut:', out, len(html) // 1024, 'KB')
