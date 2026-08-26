/**
 * @file docs/app.js
 * @description Interaktive Client-Logik für die FlxAnimator HTML-Dokumentation.
 * Beinhaltet Echtzeit-Suche, Modul-Filterung, Akkordeon-Aufklappen und 1-Click Code-Kopieren.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Copy Code Button Handler
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const pre = btn.closest('.code-block').querySelector('pre');
            if (pre) {
                const text = pre.innerText;
                try {
                    await navigator.clipboard.writeText(text);
                    const originalText = btn.innerText;
                    btn.innerText = 'Kopiert!';
                    btn.style.borderColor = 'var(--accent-emerald)';
                    btn.style.color = 'var(--accent-emerald)';
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.borderColor = '';
                        btn.style.color = '';
                    }, 1500);
                } catch (err) {
                    console.error('Failed to copy text:', err);
                }
            }
        });
    });

    // 2. Realtime Search / Filter
    const searchInput = document.getElementById('doc-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const sections = document.querySelectorAll('.doc-section');
            const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

            if (!term) {
                sections.forEach(s => s.style.display = 'block');
                navItems.forEach(n => n.style.display = 'list-item');
                return;
            }

            // Filter sections
            sections.forEach(section => {
                const text = section.innerText.toLowerCase();
                const match = text.includes(term);
                section.style.display = match ? 'block' : 'none';
            });

            // Filter nav items
            navItems.forEach(item => {
                const text = item.innerText.toLowerCase();
                const match = text.includes(term);
                item.style.display = match ? 'list-item' : 'none';
            });
        });
    }

    // 3. Category Filter Tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    if (filterTabs.length > 0) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const category = tab.getAttribute('data-filter');
                const apiMembers = document.querySelectorAll('.api-member');

                apiMembers.forEach(member => {
                    if (category === 'all') {
                        member.style.display = 'block';
                    } else {
                        const memberType = member.getAttribute('data-type');
                        member.style.display = memberType === category ? 'block' : 'none';
                    }
                });
            });
        });
    }

    // 4. ScrollSpy for Sidebar Nav
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item a');
    const sections = Array.from(document.querySelectorAll('.doc-section'));

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});
