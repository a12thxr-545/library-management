import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
    name: 't',
    standalone: true,
    pure: false // Necessary to react to language changes
})
export class TranslatePipe implements PipeTransform {
    constructor(private langService: LanguageService) { }

    transform(key: string): string {
        return this.langService.translate(key);
    }
}
