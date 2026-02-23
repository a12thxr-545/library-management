import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError(err => {
            // Handle 500 errors or connection refused
            if (err.status === 500 || err.status === 0) {
                router.navigate(['/error']);
            }
            return throwError(() => err);
        })
    );
};
