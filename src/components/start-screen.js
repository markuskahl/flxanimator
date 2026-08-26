import { Events } from '../core/events.js';

export class StartScreenComponent {
    constructor(store, fileService, callbacks) {
        this.store = store;
        this.fileService = fileService;
        this.callbacks = callbacks || {};

        this.startScreenEl = document.getElementById('start-screen');
        this.btnStartNew = document.getElementById('btn-start-new-project');
        this.btnStartOpen = document.getElementById('btn-start-open-project');
        this.recentListEl = document.getElementById('recent-projects-list');

        this.init();
    }

    init() {
        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.startScreenEl) {
                this.startScreenEl.style.display = e.detail.view === 'start' ? 'flex' : 'none';
            }
            if (e.detail.view === 'start') {
                this.updateRecentProjects();
            }
        });

        if (this.btnStartNew && this.callbacks.onNew) {
            this.btnStartNew.addEventListener('click', () => this.callbacks.onNew());
        }

        if (this.btnStartOpen && this.callbacks.onOpen) {
            this.btnStartOpen.addEventListener('click', () => this.callbacks.onOpen());
        }

        this.updateRecentProjects();
    }

    async updateRecentProjects() {
        if (!this.recentListEl) return;
        const projects = await this.fileService.getRecentProjects();
        this.recentListEl.innerHTML = '';

        if (projects.length === 0) {
            this.recentListEl.innerHTML = `
                <li class="empty-recent" style="padding: 1rem; color: var(--text-muted); text-align: center;">
                    No recent projects
                </li>
            `;
            return;
        }

        projects.forEach(projPath => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                padding: 0.8rem 1rem;
                margin-bottom: 0.5rem;
                border-radius: 6px;
                cursor: pointer;
                border: 1px solid transparent;
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
                transition: all 0.2s ease;
            `;

            li.onmouseover = () => {
                li.style.background = 'rgba(255, 255, 255, 0.1)';
                li.style.borderColor = 'var(--accent-color)';
            };
            li.onmouseout = () => {
                li.style.background = 'rgba(255, 255, 255, 0.05)';
                li.style.borderColor = 'transparent';
            };

            const filename = projPath.split('\\').pop().split('/').pop();
            const nameSpan = document.createElement('strong');
            nameSpan.innerText = filename;
            nameSpan.style.color = '#fff';

            const pathSpan = document.createElement('span');
            pathSpan.className = 'recent-path';
            pathSpan.innerText = projPath;
            pathSpan.style.fontSize = '0.8rem';
            pathSpan.style.color = 'var(--text-muted)';

            li.appendChild(nameSpan);
            li.appendChild(pathSpan);

            li.addEventListener('click', () => {
                if (this.callbacks.onOpenRecent) {
                    this.callbacks.onOpenRecent(projPath);
                }
            });

            this.recentListEl.appendChild(li);
        });
    }
}
