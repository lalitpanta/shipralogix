// PDF.js Setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentPage = 1;
let pageCount = 0;

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const tocList = document.getElementById('toc-list');
const pdfContainer = document.getElementById('pdf-container');

// Load PDF
async function loadPdf(url) {
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        pageCount = pdfDoc.numPages;
        
        // Build Table of Contents
        await buildTableOfContents();
        
        // Render all pages
        await renderAllPages();
    } catch (error) {
        console.error('Error loading PDF:', error);
        tocList.innerHTML = '<p style="color: red;">Error loading PDF</p>';
    }
}

// Build Table of Contents from PDF Outline
async function buildTableOfContents() {
    try {
        const outline = await pdfDoc.getOutline();
        
        if (!outline || outline.length === 0) {
            tocList.innerHTML = '<p style="opacity: 0.7; font-size: 12px;">No outline found in PDF</p>';
            return;
        }
        
        tocList.innerHTML = '';
        renderOutlineItems(outline, tocList, 0);
    } catch (error) {
        console.error('Error building TOC:', error);
        tocList.innerHTML = '<p style="color: red;">Could not load table of contents</p>';
    }
}

// Recursively render outline items
function renderOutlineItems(items, container, level) {
    items.forEach(item => {
        const hasChildren = item.items && item.items.length > 0;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = `toc-item level-${Math.min(level, 2)} ${hasChildren ? 'has-children' : ''}`;
        
        // Add chevron/arrow for expandable items
        if (hasChildren) {
            const chevron = document.createElement('span');
            chevron.className = 'toc-chevron';
            chevron.textContent = '▼';
            itemDiv.appendChild(chevron);
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'toc-title-text';
        titleSpan.textContent = item.title;
        itemDiv.appendChild(titleSpan);
        
        // Add click handler to navigate to page
        itemDiv.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            if (hasChildren) {
                // Toggle expand/collapse
                const childrenContainer = itemDiv.nextElementSibling;
                if (childrenContainer && childrenContainer.classList.contains('toc-children')) {
                    const isHidden = childrenContainer.style.display === 'none';
                    childrenContainer.style.display = isHidden ? 'block' : 'none';
                    itemDiv.classList.toggle('collapsed');
                } else {
                    itemDiv.classList.toggle('collapsed');
                }
            }
            
            // Navigate to page if it has a destination
            if (item.dest) {
                try {
                    const pageNum = await pdfDoc.getPageIndex(item.dest[0]) + 1;
                    await jumpToPage(pageNum);
                    
                    // Highlight active item
                    document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('active'));
                    itemDiv.classList.add('active');
                } catch (error) {
                    console.error('Error navigating to page:', error);
                }
            }
        });
        
        container.appendChild(itemDiv);
        
        // Render child items if they exist
        if (hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'toc-children';
            container.appendChild(childrenContainer);
            renderOutlineItems(item.items, childrenContainer, level + 1);
        }
    });
}

// Render all pages for continuous scrolling
async function renderAllPages() {
    pdfContainer.innerHTML = '';
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            
            // Get device pixel ratio for crisp rendering
            const dpr = window.devicePixelRatio || 1;
            const scale = 2.0 * dpr;
            const viewport = page.getViewport({ scale: scale });
            
            // Create canvas for each page
            const pageCanvas = document.createElement('canvas');
            pageCanvas.id = `pdf-page-${pageNum}`;
            pageCanvas.className = 'pdf-page';
            pageCanvas.height = viewport.height;
            pageCanvas.width = viewport.width;
            pageCanvas.style.width = (viewport.width / dpr) + 'px';
            pageCanvas.style.height = (viewport.height / dpr) + 'px';
            
            const pageCtx = pageCanvas.getContext('2d');
            
            const renderContext = {
                canvasContext: pageCtx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            pdfContainer.appendChild(pageCanvas);
        } catch (error) {
            console.error('Error rendering page ' + pageNum + ':', error);
        }
    }
}

// Jump to page (scroll to page when TOC item is clicked)
async function jumpToPage(pageNum) {
    const pageElement = document.getElementById(`pdf-page-${pageNum}`);
    if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
}

// Load PDF on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPdf('finalShipra_Admin_SOP.pdf');
    
    // Mobile menu functionality
    const sidebar = document.querySelector('.sidebar');
    
    // Menu toggle on mobile (if needed)
    const openMenuBtn = document.querySelector('.menu-toggle');
    if (openMenuBtn) {
        openMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when toc item is clicked on mobile
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('active');
    }
});
