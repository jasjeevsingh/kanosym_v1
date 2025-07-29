// Shared components for Kanosym website

function renderHeader() {
    return `
    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Logo -->
                <div class="flex items-center">
                    <a href="./" class="text-2xl font-bold font-mono">
                        <span class="text-quantum-purple">K</span><span class="text-white">anosym</span>
                    </a>
                </div>
                
                <!-- Desktop Navigation -->
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-8">
                        <a href="./#product" class="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">Product</a>
                        <a href="./#technology" class="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">Technology</a>
                        <a href="./#team" class="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">Team</a>
                        <a href="./#contact" class="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">Contact</a>
                    </div>
                </div>
                
                <!-- Mobile menu button -->
                <div class="md:hidden">
                    <button type="button" id="mobile-menu-button" class="text-gray-400 hover:text-white">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Mobile Navigation -->
        <div id="mobile-menu" class="hidden md:hidden bg-dark-card border-t border-dark-border">
            <div class="px-2 pt-2 pb-3 space-y-1">
                <a href="./#product" class="text-gray-300 hover:text-white block px-3 py-2 text-base font-medium">Product</a>
                <a href="./#technology" class="text-gray-300 hover:text-white block px-3 py-2 text-base font-medium">Technology</a>
                <a href="./#team" class="text-gray-300 hover:text-white block px-3 py-2 text-base font-medium">Team</a>
                <a href="./#contact" class="text-gray-300 hover:text-white block px-3 py-2 text-base font-medium">Contact</a>
            </div>
        </div>
    </nav>`;
}

function renderFooter() {
    return `
    <!-- Footer -->
    <footer class="bg-dark-card border-t border-dark-border py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-8">
                <div class="col-span-2">
                    <div class="text-2xl font-bold font-mono mb-4">
                        <span class="text-quantum-purple">K</span><span class="text-white">anosym</span>
                    </div>
                    <p class="text-gray-400 mb-4 max-w-md">
                        Where intuition meets quantitative power. Revolutionizing corporate finance with next-gen technical capabilities.
                    </p>
                    <div class="flex space-x-4">
                        <!-- Social media links commented out for later use -->
                    </div>
                </div>
                
                <div>
                    <h3 class="text-white font-semibold mb-4">Product</h3>
                    <ul class="space-y-2">
                        <li><a href="features" class="text-gray-400 hover:text-white transition-colors">Features</a></li>
                        <li><a href="pricing" class="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="use-cases" class="text-gray-400 hover:text-white transition-colors">Use Cases</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                    </ul>
                </div>
                
                <div>
                    <h3 class="text-white font-semibold mb-4">Company</h3>
                    <ul class="space-y-2">
                        <li><a href="#" class="text-gray-400 hover:text-white transition-colors">About</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="border-t border-dark-border mt-12 pt-8 text-center">
                <p class="text-gray-500">
                    © 2025 Kanosym. All rights reserved.
                </p>
            </div>
        </div>
    </footer>`;
}

function initializeComponents() {
    // Insert header if placeholder exists
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = renderHeader();
    }
    
    // Insert footer if placeholder exists
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = renderFooter();
    }
    
    // Initialize mobile menu functionality
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Initialize smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"], a[href^="./#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Handle both "#section" and "./#section" formats
            const targetId = href.includes('#') ? href.split('#')[1] : null;
            
            if (targetId) {
                e.preventDefault();
                
                // If we're on a different page, navigate to home first
                if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('/index.html')) {
                    window.location.href = './#' + targetId;
                    return;
                }
                
                const target = document.getElementById(targetId);
                if (target) {
                    const navHeight = document.querySelector('nav').offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    if (mobileMenu) {
                        mobileMenu.classList.add('hidden');
                    }
                }
            }
        });
    });
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (nav) {
            if (window.scrollY > 50) {
                nav.classList.add('bg-dark-bg/95');
            } else {
                nav.classList.remove('bg-dark-bg/95');
            }
        }
    });
    
    // Demo button interactions
    document.querySelectorAll('button').forEach(button => {
        if (button.textContent.includes('Book A Demo') || button.textContent.includes('Contact Sales')) {
            button.addEventListener('click', () => {
                const subject = encodeURIComponent('Interest in Booking Kanosym Demo');
                const body = encodeURIComponent('Hi,\n\nI am interested in booking a demo of Kanosym. Please let me know your availability.\n\nBest regards');
                window.location.href = `mailto:jasjeev@upenn.edu?subject=${subject}&body=${body}`;
            });
        }
    });
    
    // Initialize fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponents);
} else {
    initializeComponents();
}