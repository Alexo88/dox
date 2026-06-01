/* Khipu Codex — src/dom-refs.js */

'use strict';

/* ─────────────────────────────────────────
   Refs DOM
   ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const customTitlebar = $('custom-titlebar');
const tabsContainer = $('tabs-container');
const btnOpen = $('btn-open');
const btnTheme = $('btn-theme');
const btnEdit = $( 'btn-edit' );
const btnSave = $('btn-save');
const globalSearch = $('global-search');
const fileInput = $('file-input');
const dropzone = $('dropzone');
const viewer = $('viewer');
const markdownEditor = $( 'markdown-editor' );
const progress = $('progress');
const progressBar = $('progress-bar');
const progressText = $('progress-text');

// Window controls
const btnMinimize = $('btn-minimize');
const btnMaximize = $('btn-maximize');
const btnClose = $('btn-close');
const iconMaximize = $('icon-maximize');
const iconRestore = $('icon-restore');

// Search
const searchBar = $('search-bar');
const searchInput = $('search-input');
const searchCount = $('search-count');
const searchPrev = $('search-prev');
const searchNext = $('search-next');
const searchClose = $('search-close');

// Theme icons
const iconMoon = $('icon-moon');
const iconSun = $('icon-sun');

// Annotation toolbar
const btnAnnotate = $('btn-annotate');
const annotationToolbar = $('annotation-toolbar');
