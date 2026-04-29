import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fmtNumber',
  standalone: true,
})
export class FmtNumberPipe implements PipeTransform {
  transform(value: number | string | null | undefined, decimals = 0): string {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value) || 0);
  }
}
