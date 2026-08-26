export class ResizerComponent {
    constructor() {
        this.resizer = document.getElementById('workspace-resizer');
        this.workspaceRight = document.getElementById('workspace-right');
        this.workspaceTop = document.getElementById('workspace-top');
        this.isResizing = false;

        this.init();
    }

    init() {
        if (!this.resizer || !this.workspaceRight || !this.workspaceTop) return;

        this.resizer.addEventListener('mousedown', () => {
            this.isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            const workspaceRect = this.workspaceTop.getBoundingClientRect();
            const newRightWidth = workspaceRect.right - e.clientX;

            if (newRightWidth > 150 && newRightWidth < workspaceRect.width - 150) {
                this.workspaceRight.style.width = `${newRightWidth}px`;
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }
}
