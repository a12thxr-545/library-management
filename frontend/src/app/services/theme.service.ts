import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private renderer: Renderer2;
    private currentTheme: 'dark' | 'light' = 'dark';

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.setTheme('dark'); // Default
        }
    }

    toggleTheme() {
        this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
    }

    setTheme(theme: 'dark' | 'light') {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        const body = document.getElementsByTagName('body')[0];

        if (theme === 'light') {
            this.renderer.addClass(body, 'light-theme');
            this.renderer.removeClass(body, 'dark-theme');
        } else {
            this.renderer.addClass(body, 'dark-theme');
            this.renderer.removeClass(body, 'light-theme');
        }
    }

    isDark() {
        return this.currentTheme === 'dark';
    }
}
