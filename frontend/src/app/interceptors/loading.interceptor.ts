import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const loadingService = inject(LoadingService);
    loadingService.setLoading(true);

    return next(req).pipe(
        finalize(() => {
            // Small timeout to prevent flickering for super fast requests
            setTimeout(() => {
                loadingService.setLoading(false);
            }, 300);
        })
    );
};
