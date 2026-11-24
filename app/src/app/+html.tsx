import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import React from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } =
    useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <title>BeerDex — Colección Cervecera</title>
        <meta
          name="description"
          content="Tu Pokédex de cervezas individuales con logros y amigos."
        />
        <meta name="theme-color" content="#0C0908" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BeerDex" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=UnifrakturMaguntia&display=swap"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                background-color: #0C0908;
                color: #FAF4EC;
                height: 100%;
                margin: 0;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              #root {
                background-color: #0C0908;
                color: #FAF4EC;
                height: 100%;
                margin: 0;
              }
              body {
                background-image:
                  radial-gradient(ellipse 85% 45% at 50% -8%, rgba(236, 161, 42, 0.14), transparent 64%),
                  radial-gradient(ellipse 60% 45% at 92% 96%, rgba(196, 112, 34, 0.09), transparent 62%);
                background-attachment: fixed;
              }
              ::-webkit-scrollbar {
                width: 7px;
                height: 7px;
              }
              ::-webkit-scrollbar-track {
                background: #0C0908;
              }
              ::-webkit-scrollbar-thumb {
                background: rgba(236, 161, 42, 0.25);
                border-radius: 999px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(236, 161, 42, 0.45);
              }
              input, textarea {
                font-family: inherit;
              }
              input:focus, textarea:focus {
                outline: none;
                box-shadow: 0 0 0 2px rgba(255, 208, 102, 0.35);
                border-color: rgba(255, 208, 102, 0.55) !important;
              }
              [role="button"] {
                transition: transform 0.14s ease, opacity 0.14s ease, filter 0.16s ease;
                cursor: pointer;
              }
              [role="button"]:hover {
                filter: brightness(1.04);
              }
              ::selection {
                background: rgba(236, 161, 42, 0.32);
                color: #FAF4EC;
              }
            `,
          }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
